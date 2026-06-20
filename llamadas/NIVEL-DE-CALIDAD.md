# Nivel de Calidad — Sistema de Llamadas AI

> **Fecha:** 2026-06-08
> **Alcance:** `E:\exclusion\silxarcrm\llamadas` (agente de ventas por voz, Python/FastAPI)
> **Método:** valoración contrastada con el **código real** (`app/`), no con los .md previos — que se contradicen entre sí y están parcialmente desactualizados.

---

## 0. Aviso sobre los documentos previos

Antes de nada: los docs existentes (`AUDITORIA_SISTEMA_LLAMADAS`, `MEJORAS-PROPUESTAS`, `ESTADO-DEL-SISTEMA`) **no coinciden** ni entre ellos ni con el código:

- `MEJORAS-PROPUESTAS.md` lista como "críticos a arreglar ya": `aiohttp` ausente, `CallContext.metadata` inexistente, `quantificar_dolor` fuera de `TOOL_DECLARATIONS`. **Los tres ya están corregidos** en el código actual (`requirements.txt:28`, `state.py:62`, `tools.py:177`). Ese documento está obsoleto.
- `ESTADO-DEL-SISTEMA.md` dice que "ElevenLabs se omitió a propósito" y que el pipeline es Gemini nativo a ~0.6s. El código dice lo contrario: `voice_pipeline = "elevenlabs"` por defecto (`config.py:61`), con arquitectura híbrida dual-LLM.
- `AUDITORIA` habla de latencia 1.000–1.300ms; el diseño dual real apunta a ~435ms E2E.

**Conclusión:** tomar este archivo como la foto vigente; los otros como histórico.

---

## 1. Veredicto en una línea

El sistema está en un **nivel de "prototipo avanzado / casi-producción" (≈6.5/10)**: arquitectura sofisticada y bien pensada, pero con **huecos de hardening, testing de integración y multi-tenancy** que impiden ponerlo a marcar en serio hoy. Con el trabajo descrito abajo es realista llegar a **8.5/10 (producción seria)** en 2–4 semanas.

---

## 2. Qué hay de verdad (arquitectura real)

Pipeline **dual y conmutable** (`media_stream.py` elige según `voice_pipeline` + presencia de API key):

```
PIPELINE POR DEFECTO (elevenlabs, híbrido dual-LLM):
  Twilio μ-law 8k ─► AudioBridge ─► ElevenLabs Scribe (STT)
                                        │
                                        ▼
                            MiniClassifier (intención/emoción)
                                        │
                                        ▼
                            StateEngine (probabilístico)
                                        │
        MasterLLM (Gemini 3.5 Flash) ───┤  ← brief estratégico cada 2-3 turnos
        "el Maestro": piensa, decide    │
                                        ▼
                            GeminiChat "Voz" (Flash-Lite ~180ms) ─► ElevenLabs TTS
                                        │
                                        ▼
                                   Twilio μ-law 8k

FALLBACK (gemini): Gemini Live nativo (STT+LLM+TTS en un modelo), barge-in nativo.
```

La separación **Maestro (estrategia) + Voz (ejecución rápida)** es la decisión de diseño más fuerte del sistema: combina razonamiento de calidad con time-to-first-audio bajo. Es un patrón correcto y poco común.

---

## 3. Tarjeta de calidad por dimensión

| Dimensión | Nivel actual | Evidencia (código) | Techo alcanzable |
|-----------|:---:|--------------------|:---:|
| **Arquitectura / diseño** | 8.5/10 | Dual-LLM, fallback de pipeline, prewarm, modular "LEGO" | 9.5/10 |
| **Latencia (diseño)** | 8/10 | VAD 200ms, thinking `minimal`, latency_opt 0, Flash-Lite | 9/10 |
| **Latencia (verificada en llamada real)** | 3/10 | **Nunca medida con audio físico** — sin Twilio conectado | 8/10 |
| **Calidad de voz** | 7/10 | ElevenLabs Flash v2.5 + DSP on; limitado a μ-law 8k de PSTN | 8.5/10 |
| **Estrategia de ventas** | 7.5/10 | StateEngine, playbooks por nicho, 7+ tools, MasterLLM | 9/10 |
| **Resiliencia / errores** | 7/10 | Backoff exponencial, detección de errores transitorios, fallback de modelo, circuit breaker **real** (`metrics.py:19-77`) | 8.5/10 |
| **Persistencia** | 7/10 | PostgreSQL + Supabase legacy + Redis con fallback a memoria | 8.5/10 |
| **Observabilidad** | 6.5/10 | Métricas en memoria, decision log por turno, alertas Slack — **sin exportar (Prometheus/Grafana)** | 9/10 |
| **Testing** | 4.5/10 | ~1.250 líneas, buenos mocks unitarios; **0 tests de integración WebSocket/Twilio**, sin reconexión, sin circuit breaker | 8/10 |
| **Seguridad** | 3/10 | **Sin validación de firma Twilio, sin rate limiting**, sanitización de input ausente | 8/10 |
| **Multi-tenancy real** | 5/10 | Config por `software_id` funciona, pero post-call hardcodea "GestPro"/"Mariana" (`nurture_engine.py:255`, `scheduler.py`) | 9/10 |
| **Operabilidad / deploy** | 5/10 | Sin migrations versionadas, sin CI, sin `/health` profundo, sin logging estructurado | 8.5/10 |
| **Higiene de código** | 7/10 | Type hints sólidos, dataclasses; código muerto (`briefing.py`, `memory.py` no se importan) | 8.5/10 |

**Media ponderada ≈ 6.5/10.**

---

## 4. Los 3 bloqueantes reales para producción

Estos son los que de verdad impiden marcar con tranquilidad (no los "bugs" ya resueltos de los docs viejos):

### 4.1 🔴 Seguridad de webhooks (CRÍTICO)
- **Sin validación de firma Twilio** en `/voice` y `/media`: cualquiera que conozca la URL puede disparar audio o falsear callbacks.
- **Sin rate limiting**: `/outbound` y `/voice` son DoS-ables y, peor, **abusables para gastar saldo Twilio**.
- *Fix:* `TwilioRequestValidator` en un dependency de FastAPI + `slowapi` en los endpoints públicos. ~½ día.

### 4.2 🔴 Latencia jamás verificada en llamada real
- Todo el "~435ms" es **estimación de diseño**. No hay una sola medición con audio físico porque Twilio no está conectado.
- Hasta que no se haga una llamada real con ngrok y se mida TTFA y barge-in de punta a punta, **el nivel de latencia es una hipótesis**, no un hecho.
- *Fix:* conectar número Twilio MX + 1 llamada de prueba instrumentada. ~1 día.

### 4.3 🟡 Multi-tenancy roto en post-call
- `nurture_engine.py` y `scheduler.py` hardcodean "GestPro"/"Mariana" como fallback. Un lead de Groomly o Peluguau recibe WhatsApp firmado por otra marca → pérdida de confianza directa.
- *Fix:* leer `config.identity.nombre` / `config.product.marca` siempre; eliminar literales. ~½ día.

---

## 5. Ruta de mejora: de 6.5 a 8.5

### Fase 1 — Hardening mínimo viable (Semana 1) → desbloquea producción real
- [ ] Validación de firma Twilio + rate limiting (`slowapi`).
- [ ] Conectar Twilio MX y **medir latencia real** (1 llamada instrumentada).
- [ ] Quitar hardcodeados "GestPro"/"Mariana" en post-call.
- [ ] Borrar código muerto (`briefing.py`, `memory.py`) o moverlo a `archive/`.
- **Resultado: ~7.5/10 — apto para piloto controlado.**

### Fase 2 — Confianza (Semanas 2-3)
- [ ] Test de integración del flujo WebSocket completo (Twilio simulado → audio → respuesta → persistencia → nurture).
- [ ] Tests de reconexión y de activación de circuit breaker.
- [ ] `/health` profundo (ping a Postgres/Redis/Gemini/ElevenLabs/Twilio) separado de `/status`.
- [ ] Exportar métricas a Prometheus (`/metrics`) + logging estructurado JSON.
- [ ] Sanitización de input en tools (anti prompt-injection).
- **Resultado: ~8/10 — apto para volumen moderado con visibilidad.**

### Fase 3 — Escala (Semanas 4-6)
- [ ] Migrations versionadas (Alembic) para `calls`, `knowledge_embeddings`, `voice_agent_configs`.
- [ ] pgvector real para RAG (hoy embeddings en memoria).
- [ ] Pool de clientes Gemini + cache de config en Redis (TTL).
- [ ] A/B testing de playbooks (el campo `ab_test` existe pero no se usa).
- [ ] CI (pytest + mypy + ruff) en GitHub Actions.
- **Resultado: ~8.5/10 — producción seria multi-tenant.**

---

## 6. Lo que NO recomiendo tocar (ya está bien)

- **No reescribir la arquitectura dual Maestro+Voz** — es el activo más valioso.
- **No meter ElevenLabs en todo el tráfico ni quitarlo** — el conmutador por contexto es correcto; Gemini nativo como fallback es sensato.
- **No perseguir wideband/Opus** — Twilio PSTN es μ-law 8k y punto; el DSP que ya hay (on por defecto) es la palanca de calidad realista.
- **No bajar `vad_silence_ms` por debajo de 200ms** sin medir: el riesgo de cortar al prospecto supera la ganancia.

---

## 7. Resumen para decidir

| Pregunta | Respuesta honesta |
|----------|-------------------|
| ¿En qué nivel estamos? | **6.5/10** — prototipo avanzado, arquitectura de 8.5 lastrada por hardening/testing/seguridad. |
| ¿A qué nivel podemos llegar? | **8.5/10** en 4-6 semanas, sin reescribir nada. |
| ¿Qué nos separa de producción HOY? | 3 cosas: firma Twilio + rate limiting, una medición de latencia real, y quitar los hardcodeados de marca. |
| ¿Cuánto cuesta el primer salto (a 7.5)? | ~2-3 días de trabajo. |
| ¿El cuello de botella es técnico o de validación? | **De validación.** El diseño es bueno; falta probarlo contra el mundo real y blindarlo. |

> **La métrica que más cambiaría el veredicto:** una llamada real medida. Todo lo demás es ingeniería conocida; la latencia es la única incógnita de verdad.

---

## 8. ¿Se puede llegar al 10? (sistema "perfecto, igual que un humano")

Respuesta honesta primero: **el 10 absoluto no existe como destino, existe como dirección.** Hay un tramo que se alcanza con ingeniería (de 8.5 a ~9.5) y un tramo final que choca con límites duros que no se compran con trabajo. Documentarlo "como si fuera perfecto" sin marcar esa frontera sería venderte humo. Así que separo las dos cosas.

### 8.1 Qué significaría un 10 de verdad — definición operativa

Un "10, indistinguible de un humano" no es una vibra; se puede definir con criterios medibles. Sería perfecto si y solo si:

| Criterio | Umbral "humano" | Cómo se verifica |
|----------|-----------------|------------------|
| **Latencia de turno** | gap de respuesta 200-400ms, P95 < 600ms | medición real en llamada, no estimación |
| **Barge-in** | corta en < 150ms al ser interrumpido, sin pisar | test instrumentado de interrupción |
| **Naturalidad de voz** | MOS ≥ 4.3 *dentro del límite de μ-law 8k* | blind test con oyentes reales (A/B vs humano) |
| **Test de Turing telefónico** | < 30% de prospectos detectan que es IA (sin que se les avise) | panel ciego; hoy compliance MX **obliga a avisar**, así que es teórico |
| **Cero alucinación** | 0 datos inventados sobre precio/producto/agenda | grounding 100% en RAG/tools, nunca en memoria del modelo |
| **Recuperación de errores** | maneja ruido, solapamientos, acentos, cambios de tema sin romperse | corpus de llamadas adversariales |
| **Cierre conversacional** | tasa de demo agendada ≥ mejor SDR humano del equipo | comparación contra baseline humano real |
| **Disponibilidad** | 99.99% uptime, 0 llamadas caídas por bug | SLO medido en producción |

Si **todo** eso se cumple y se sostiene en el tiempo, es un 10. Fíjate que la mayoría son **mediciones contra un humano de referencia**, no contra un ideal abstracto. Eso es clave: "perfecto como un humano" se documenta comparándolo con un humano concreto, no con la perfección.

### 8.2 El tramo alcanzable (8.5 → 9.5) — esto sí es ingeniería

Todo esto es trabajo conocido, sin magia:

- **Backchannels y relleno conversacional** ("mm-hmm", "claro", "déjame ver") emitidos mientras el LLM piensa → mata la percepción de latencia, que es lo que de verdad delata a una IA.
- **TTS especulativo / streaming token-by-token** → el audio empieza antes de que el LLM termine la frase.
- **Cache semántico de respuestas frecuentes** → saludos, despedidas, FAQs responden en ~0ms (audio pre-generado).
- **Grounding estricto anti-alucinación**: el modelo Voz **nunca** afirma un precio o fecha que no venga de una tool. Esto es regla de prompt + validación, y es la diferencia entre "convincente" y "confiable".
- **Prosodia y emoción dinámicas**: ajustar tono según la señal emocional que ya detecta `signals.py` (más cálido si frustración, más enérgico si interés).
- **Memoria de largo plazo entre llamadas**: que en la 2ª llamada recuerde la 1ª ("la última vez me comentaste que…"). Profundamente humano y 100% técnico.
- **Suite de evaluación continua**: un corpus de llamadas grabadas que se re-juega en cada cambio (regression testing conversacional) → evita que mejorar A rompa B.

Con esto se llega a un sistema que **engaña a la mayoría de la gente la mayor parte del tiempo**. Eso es un 9.5 honesto.

### 8.3 El techo duro (9.5 → 10) — lo que NO se compra con trabajo

Aquí está la frontera que ningún documento serio debería ocultar:

| Límite | Por qué es duro | ¿Se puede romper? |
|--------|-----------------|-------------------|
| **Audio μ-law 8kHz del PSTN** | Twilio/teléfono fijo recortan a 4kHz de banda. El MOS techo es ~4.1-4.3, no 4.8. Una voz "perfecta HD" no cabe por el cable. | Solo migrando a SIP/VoIP wideband o llamadas por app — cambia el producto. |
| **Suelo de latencia físico** | red celular + inferencia + jitter buffer ≈ 400-500ms mínimo irreducible. El humano está en 200-400ms. | No del todo; co-locar servidor ayuda ~100ms, pero el PSTN pone un piso. |
| **Alucinación residual del LLM** | aunque hagas grounding total, el modelo puede malinterpretar o improvisar bajo presión conversacional. Riesgo → 0, nunca = 0. | Se mitiga con tools+validación, no se elimina. |
| **El "alma" de la conversación** | humor espontáneo, empatía genuina, leer un silencio incómodo. Los LLMs lo *imitan* muy bien, no lo *tienen*. En llamadas largas o raras, se nota. | No con la tecnología actual. Es el último 5%. |
| **Compliance MX** | la ley obliga a **avisar que es IA**. Un sistema legal en México **no puede** pasar un test de Turing ciego — y no debería intentarlo. | El 10 "indetectable" choca con el 10 "ético/legal". |

**Conclusión del tramo final:** un 10.0 literal ("ningún humano lo distingue, nunca, en ninguna llamada") es **inalcanzable por física + derecho**, no por falta de esfuerzo. Lo honesto es apuntar a un **9.5 sólido y sostenido**, que en la práctica es "tan bueno como tu mejor SDR humano en el 90% de las llamadas, y mejor en disponibilidad, coste y consistencia". Eso es un éxito rotundo y es real.

### 8.4 Cómo documentarlo para tratarlo "como un sistema perfecto"

Para que el sistema se *gestione* como si aspirara al 10, la documentación tiene que dejar de ser estática y volverse un **contrato medible**. Tres artefactos:

1. **`SLO.md` — Contrato de calidad.** Define los umbrales del 8.1 como objetivos numéricos con presupuesto de error (ej. "P95 de latencia < 600ms, 99% de las llamadas"). Un número que no se mide no es un objetivo, es un deseo.
2. **`EVALS.md` + corpus de llamadas.** Un set de 50-100 conversaciones reales/sintéticas (incl. casos adversariales: ruido, enfado, cambio de tema, prospecto que miente) que se re-evalúa en cada release. La nota de calidad sale de aquí, no de la opinión de nadie.
3. **Tablero de "humano de referencia".** Cada métrica del agente al lado de la del mejor SDR humano del equipo. El 10 se define como "iguala o supera al humano en todas las columnas medibles". Cuando eso pase, el debate sobre el "10 filosófico" deja de importar comercialmente.

> **El truco de la documentación perfecta:** no escribir "el sistema es perfecto", sino escribir **cómo se prueba que lo es**, ejecutar esa prueba en cada cambio, y publicar el número. Un sistema que mide su propia distancia al humano y la cierra release a release *es*, a efectos prácticos, lo más cerca del 10 que se puede estar.

### 8.5 Resumen del 10

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se puede llegar al 10 literal? | **No** — μ-law 8k, suelo de latencia y compliance MX lo impiden por diseño físico/legal, no por esfuerzo. |
| ¿A qué se puede llegar de verdad? | **9.5** — indistinguible de un humano en ~90% de llamadas, superior en coste/disponibilidad/consistencia. |
| ¿Qué separa el 8.5 del 9.5? | Backchannels, TTS especulativo, cache semántico, grounding anti-alucinación, memoria entre llamadas y una **suite de evaluación continua**. |
| ¿Cuál es el último 5% irreducible? | El "alma": humor, empatía genuina, leer silencios. Se imita, no se posee. |
| ¿Cómo se documenta "como perfecto"? | No declarándolo perfecto, sino con un **SLO medible + corpus de evals + comparación contra un SDR humano real**, re-ejecutado en cada release. |

---

## 9. Plan real con 50-100€ y 2 amigos probando

> Pregunta: *"¿A qué nivel y calidad llegamos invirtiendo 50-100€ entre 3, probando y ajustando? ¿Qué tenemos que mirar?"*

### 9.1 La conclusión que cambia todo: el dinero NO es tu límite

Con 50-100€ el presupuesto **no es el cuello de botella** — ni de lejos. Para probar y ajustar (no para hacer outreach masivo) esa cantidad da para **muchas más llamadas de las que 3 personas podéis escuchar y analizar con cabeza**. Tu límite real es el **tiempo de análisis** y la **calidad de los datos** (amigos ≠ prospectos fríos), no los euros.

**Cuánto compran 100€ en minutos de prueba** (estimación, precios verificados en docs previos):

| Configuración para testing | Coste/min aprox. | Minutos con 100€ | Equivale a… |
|------------------------------|:---:|:---:|---|
| **Gemini nativo + Twilio fijo MX** | ~0,024€ | **~4.000 min** | ~66 horas de llamada |
| **Gemini nativo + Twilio móvil MX** | ~0,057€ | **~1.750 min** | ~29 horas / cientos de llamadas |
| ElevenLabs híbrido + Twilio móvil | ~0,10€ + susc. | ~700 min | menos, y sumas suscripción |

> **Recomendación para la fase de pruebas:** usa el **pipeline Gemini nativo** (`voice_pipeline="gemini"`), no el ElevenLabs. Razones: (1) evitas la suscripción mensual de ElevenLabs (~20€) que se comería medio presupuesto, (2) es 4-7x más barato por minuto, (3) el barge-in nativo te da menos sorpresas mientras depuras. Cuando el flujo esté afinado, enciendes ElevenLabs y comparas calidad de voz en A/B. **Para "probar y ajustar", Gemini nativo es la opción correcta.**

### 9.2 ⚠️ ANTES de marcar: candado de gasto (o los 100€ vuelan en 1 hora)

Esto es lo primero, no lo último. **Hoy no hay rate limiting** (ver §4.1). Un bug de re-marcado en bucle, o la URL del webhook filtrada, puede fundir los 100€ en minutos. Antes de la primera llamada real:

- [ ] **Límite de gasto en Twilio**: panel Twilio → *Billing → set a spend limit* (ej. 30€) + alerta por email al 50%. Es nativo de Twilio, 5 minutos.
- [ ] **Tope de llamadas/día en código**: un contador simple en `/outbound` que corte a, p.ej., 100 llamadas/día. Mientras no exista `slowapi`, un guard manual.
- [ ] **Whitelist de números en modo prueba**: que `/outbound` solo marque a vuestros 3 móviles + números autorizados. Evita marcar a un desconocido por error y evita abuso.
- [ ] **Recarga prepago, NO tarjeta con auto-recarga**: mete 30-50€ de saldo y punto. Si se acaba, se acaba — no quieres una factura sorpresa.
- [ ] **Mata el `prewarm` en bucle**: verifica que un fallo de sesión no reintente infinitamente quemando cuota de Gemini.

> Sin esto, el riesgo nº1 de vuestros 100€ no es "que el agente sea malo", es **gastarlos por un bug en una tarde**.

### 9.3 A qué nivel realista llegáis

Probando entre 3 durante unas semanas, ajustando prompts/VAD/voz sobre llamadas reales:

| | Punto de partida | Con las pruebas de 3 amigos | Por qué no más |
|---|:---:|:---:|---|
| **Nivel global** | 6.5/10 | **~8 / 8.5** | Os falta volumen de prospectos reales y suite de evals automatizada |
| **Latencia (verificada)** | 3/10 | **8/10** | La medís de verdad por fin → deja de ser hipótesis |
| **Calidad de voz** | 7/10 | 7.5-8/10 | Afináis voz/prosodia, pero μ-law 8k es el techo |
| **Estrategia de ventas** | 7.5/10 | 8/10 | Pulís scripts con casos reales… pero amigos no objetan como un frío |
| **Seguridad** | 3/10 | 6/10 | Candado de gasto + whitelist; aún sin hardening completo |

**El gran salto que os llevÁis por 100€:** pasáis de "creemos que va a ~435ms" a **"medido: va a X ms en llamada real"**. Esa es la incógnita nº1 de todo el sistema (§7) y la reventáis con este presupuesto. Solo eso ya justifica la inversión.

**Por qué NO llegáis a 9.5 con esto:** el 9.5 necesita (a) **volumen de llamadas con prospectos reales fríos** —no amigos, que por educación no cuelgan ni objetan de verdad— y (b) la **suite de evals + SLO** del §8.4. Tres amigos generan datos valiosos pero **sesgados al alza**: te dirán que "suena genial" cuando un prospecto real estaría buscando colgar. Útil para depurar lo técnico, insuficiente para validar conversión.

### 9.4 Qué tenéis que mirar (checklist de las sesiones de prueba)

**Repartid roles** — que cada amigo NO sea "majo". Cubrid el espectro real:

| Rol que actúa el amigo | Qué pone a prueba |
|------------------------|-------------------|
| Interesado y colaborador | Flujo feliz, agendado de demo, tools |
| Ocupado/cortante ("¿quién es? no tengo tiempo") | Apertura, gancho en 10s, manejo de prisa |
| Escéptico que objeta precio/utilidad | Manejo de objeciones, MasterLLM, RAG |
| Que interrumpe constantemente | **Barge-in** (la métrica más "humana") |
| Con ruido de fondo (TV, calle, coche) | STT + DSP, recuperación de errores |
| Que se va por las ramas / cambia de tema | Que no se rompa, que reconduzca |

**Qué medir/anotar en CADA llamada** (hoja de cálculo simple basta):

- ⏱️ **Latencia percibida**: ¿responde rápido o hay silencio incómodo? Cronometrad el peor turno.
- ✂️ **Barge-in**: al interrumpir, ¿se calla al instante o sigue 2-3 palabras pisándote?
- 🧠 **Alucinaciones**: ¿inventó algún precio, fecha o dato que no le disteis? (es el fallo más grave para confianza — anotad cada uno).
- 🗣️ **Naturalidad**: ¿en qué segundo exacto "sonó a robot"? (entonación plana, muletilla repetida, respuesta fuera de lugar).
- 🎯 **Objetivo**: ¿consiguió agendar la demo / cumplir el goal? ¿en qué punto se atascó?
- 🔁 **Repeticiones/cuelgues**: ¿se quedó colgado, repitió, o se cortó la sesión?
- 🏷️ **Marca correcta** (§4.3): si probáis post-call (WhatsApp), ¿firma con la marca del software correcto o sale "GestPro/Mariana"?

**Y lo más rentable de todo:** **grabad las llamadas** (con consentimiento entre vosotros). Esas grabaciones SON vuestro corpus de evals inicial (§8.4) — el activo que luego os permite no romper lo que ya funcionaba en cada ajuste. 100€ de pruebas sin grabar = aprendizaje que se evapora; grabado = base sobre la que escalar.

### 9.5 Resumen de la inversión de 100€

| Pregunta | Respuesta |
|----------|-----------|
| ¿Llega el dinero? | **De sobra.** 100€ = decenas de horas de llamada. El límite es vuestro tiempo, no los euros. |
| ¿A qué nivel llegáis? | **~8/8.5**, con la latencia por fin **medida** (salto de 3→8 en esa dimensión). |
| ¿Llegáis al 9.5? | **No con amigos.** Falta volumen de prospectos fríos reales + suite de evals. Esto valida lo técnico, no la conversión. |
| ¿Cuál es el riesgo nº1? | **Gastar los 100€ por un bug** (sin rate limiting). Poned el candado de gasto §9.2 ANTES de marcar. |
| ¿Qué pipeline uso para probar? | **Gemini nativo**, no ElevenLabs (más barato, sin suscripción, menos sorpresas). ElevenLabs lo comparáis después en A/B. |
| ¿Qué es lo más valioso que os lleváis? | **Llamadas reales medidas y grabadas** = fin de la incógnita de latencia + corpus de evals para escalar. |
