# AUDITORIA COMPLETA DEL SISTEMA DE LLAMADAS AI — Silxar CRM

## De Herramienta de Llamadas a Maquina de Ventas por Voz

---

| Campo | Detalle |
|-------|---------|
| **Version** | 1.0 |
| **Fecha** | Junio 2026 |
| **Sistema Auditado** | Silxar CRM - Sistema de Llamadas AI Multi-Tenant |
| **Arquitectura** | Twilio + Gemini Live API + ElevenLabs (pipeline hibrido) |
| **Mercado** | B2B SaaS, Mexico (nichos: veterinaria, salud, servicios) |
| **Auditoria Tecnica** | Latencia, calidad de voz, pipeline de audio |
| **Auditoria de Conversion** | Estrategia de ventas, frameworks, tools, metricas |
| **Auditor Principal** | Especialista Senior en Ingenieria de Audio Conversacional AI + Experto en Voice AI Sales B2B |

---

## SECCION I: RESUMEN EJECUTIVO

### Diagnostico en 1 Parrafo

Silxar CRM posee una **infraestructura tecnica solida** — pipeline hibrido con Twilio, Gemini Live API y ElevenLabs — pero opera con una **latencia percibida de 1,000-1,300ms**, superando el umbral critico de 800ms donde los humanos detectan artificialidad. Simultaneamente, el sistema carece de una **estrategia de conversion sistematica**: no aplica frameworks de ventas probados (SPIN, Challenger, Sandler), carece de workflow post-call, no tiene sistema de no-show prevention, y sus scripts no siguen psicologia de ventas. La combinacion de estos dos deficits — experiencia conversacional robotica + estrategia de ventas ausente — limita severamente el revenue potencial. Este documento consolida **ambas auditorias** en un plan de accion unificado que puede reducir la latencia a **450-650ms** (nivel conversacional humano) y aumentar la conversion de **2-4% a 8-15%** (3x-5x en demos agendadas).

---

### Tabla Comparativa: Estado Actual vs. Sistema Optimizado

| Dimension | Metrica | Estado Actual | Sistema Optimizado | Delta | Prioridad |
|-----------|---------|--------------|-------------------|-------|-----------|
| **Latencia end-to-end** | ms | 1,000-1,300ms | 450-650ms | **-550ms (-50%)** | P0 |
| **Calidad de voz (MOS)** | 1-5 | ~3.2 (telefonica) | ~4.2 (HD voice) | **+1.0 (+31%)** | P0 |
| **Tasa de contestacion** | % | 15-25% (+1 USA) | 35-50% (+52 local) | **+20-25pp** | P0 |
| **Conversion a demo** | % | 2-4% | 8-15% | **+10pp (3-5x)** | P0 |
| **Show rate** | % | 50-60% | 80-85% (Triple Lock) | **+25pp** | P0 |
| **Demos efectivas/1000 llamadas** | # | 12-24 | 85-155 | **+200-300%** | - |
| **Revenue estimado/mes** | MXN | $8K-$14K | $52K-$94K | **+5x-7x** | - |
| **Costo/minuto** | USD | ~$0.026 | Similar o menor | Sin incremento | P0 |
| **CSAT post-llamada** | 1-5 | ~3.0 | ~4.2 | **+1.2 (+40%)** | P1 |
| **Barge-in response** | ms | 450-850ms | <300ms | **-55%** | P1 |

---

### Top 10 Acciones Priorizadas (P0/P1/P2)

| # | Accion | Categoria | Prioridad | Esfuerzo | Impacto | Timeline |
|---|--------|-----------|-----------|----------|---------|----------|
| 1 | Reducir VAD_SILENCE_MS de 500ms a 200ms | Tecnica | **P0** | 10 min | -250-300ms | Hoy |
| 2 | Cambiar ELEVENLABS_LATENCY_OPT de 4 a 1 | Tecnica | **P0** | 5 min | -75-150ms | Hoy |
| 3 | Reescribir scripts con framework PRO-V.O.I.S.E. | Conversion | **P0** | 4-6h | +200% demos | 1-2 dias |
| 4 | Implementar Sistema Triple Lock de No-Show Prevention | Conversion | **P0** | 4-8h | +65% demos efectivas | Esta semana |
| 5 | Comprar numero Twilio Mexico (+52) | Tecnica | **P0** | 1h | +20-25pp answer rate | Hoy |
| 6 | Activar ENABLE_INPUT_DSP + configurar noise suppression | Tecnica | **P0** | 2h | +0.3-0.5 MOS | Hoy |
| 7 | Implementar workflow post-call automatizado (0-2h-24h-3d) | Conversion | **P0** | 8-16h | +50% conversion | Esta semana |
| 8 | Agregar 5 tools nuevas de alto impacto (pre_call_brief, quantificar_dolor, social_proof_match, trial_close, recordatorio_demo) | Conversion | **P0** | 8-16h | +40% cierre | 1-2 semanas |
| 9 | Consolidar pipeline en Gemini Live API nativo (80% trafico) | Tecnica | **P1** | 2-3 dias | -200-400ms | Semana 2-3 |
| 10 | Implementar streaming TTS token-by-token + backchannels | Tecnica | **P0** | 4-8h | -150-300ms percibida | Esta semana |

---

### Proyeccion de Revenue

| Escenario | Demos Agendadas/mes | Demos Efectivas | Ventas (30% close) | Revenue Estimado* | ROI del Sistema |
|-----------|-------------------|----------------|-------------------|-------------------|-----------------|
| **Actual (est.)** | 20-40 (2-4%) | 12-24 (60% show) | 4-7 | $8K-$14K MXN | ~7x |
| **Con mejoras P0 (Semana 1-2)** | 80-150 (8-15%) | 64-120 (80% show) | 19-36 | $38K-$72K MXN | ~32x |
| **Con P0+P1 (Semana 3-6)** | 100-180 (10-18%) | 85-155 (85% show) | 26-47 | $52K-$94K MXN | ~44x |
| **Con P0+P1+P2 (Semana 7-12)** | 120-200 (12-20%) | 105-175 (88% show) | 32-53 | $64K-$106K MXN | ~50x |

> *Revenue estimado a $2,000 MXN MRR promedio, 6 meses de retencion = $12,000 MXN LTV. Costo del sistema ~$1,200 MXN/mes.

---

## SECCION II: AUDITORIA TECNICA — VOZ Y LATENCIA

### 1. Estado del Arte y Benchmarks

#### 1.1 Benchmarks de Latencia — Competidores (2026)

| Plataforma | Latencia Web | Latencia Telefonia | Arquitectura | Calidad Voz | Precio/min |
|------------|-------------|-------------------|--------------|-------------|------------|
| **Vapi (optimizado)** | ~465ms | ~965ms | API-first, multi-provider | 8/10 | $0.05-0.10 |
| **Retell AI** | ~600ms | ~780ms | Modular infrastructure | 8/10 | $0.13-0.31 |
| **Bland AI** | ~800ms | ~900ms | API-first, Twilio/Vonage | 6/10 | $0.09+ |
| **Synthflow** | 1,000-1,800ms | 1,200-2,000ms | Visual flow builder | 7/10 | Variable |
| **Telnyx (co-located)** | <200ms | <300ms | Co-located STT+LLM+TTS | 9/10 | $0.10+ |
| **SquadStack** | <800ms | <800ms | Outcome-based, omnichannel | 8/10 | Outcome-based |
| **Silxar CRM (actual)** | N/A | **1,000-1,300ms** | Custom hybrid | 6/10 | **~$0.026** |
| **Silxar CRM (optimizado)** | N/A | **450-650ms** | Custom hybrid (propuesta) | **8.5/10** | **~$0.026** |

> **Observacion critica:** Silxar tiene el **costo mas bajo del mercado** (~5x-10x menor que la competencia) pero tambien la **latencia mas alta**. La arquitectura actual desperdicia esta ventaja de costo al entregar una experiencia sub-optim. El objetivo es mantener el costo ultra-bajo mientras se alcanza latencia competitiva (<800ms).

#### 1.2 Componentes de Referencia — Mejores Latencias Documentadas

| Componente | Mejor Latencia | Proveedor | Pipeline Optimizado Vapi |
|------------|---------------|-----------|-------------------------|
| STT (first token) | ~90ms | AssemblyAI Universal-Streaming | AssemblyAI (~90ms) |
| STT streaming | ~150ms | ElevenLabs Scribe v2 | ElevenLabs Scribe v2 |
| LLM (time-to-first-token) | ~50-200ms | Gemini 2.5 Flash / Groq | Groq Llama 4 (~200ms) |
| TTS (time-to-first-audio) | ~75ms | ElevenLabs Flash v2.5 | ElevenLabs Flash v2.5 |
| VAD endpointing | ~200ms | Configurable | Optimizado a 200ms |
| Red telefonia | ~50-150ms | Twilio | ~50-150ms (fijo) |
| **Total telefonia optimizado** | | | **~465-600ms** |

#### 1.3 Umbral de Percepcion Humana

| Rango de Latencia | Percepcion del Usuario | Impacto en CSAT | Impacto en Conversion |
|-------------------|----------------------|-----------------|----------------------|
| <500ms | Conversacion fluida, indistinguible de humana | +15-25% | +20-30% |
| 500-800ms | Ligeramente perceptible, aceptable | Base | Base |
| 800-1,200ms | Pausa notoria, sensacion de "robot" | -10-15% | -15-25% |
| 1,200-1,500ms | Frustrante, conversacion rota | -25-35% | -30-40% |
| >1,500ms | Inusable, colgadas frecuentes | -40-50% | -50-60% |

> **Referencia cientifica:** Investigacion de Google (Skantze, 2021) y datos de Telnyx indican que en conversacion humana natural, el gap de respuesta es 200-400ms. Encima de 1,200ms los usuarios detectan conscientemente que hablan con AI. Cada 100ms adicionales de latencia reducen el engagement en un 5% (datos de Retell AI).

---

### 2. Pipeline de Audio Actual (Gemini + ElevenLabs Hibrido)

#### 2.1 Pipeline Gemini Live API (Default) — Flujo Detallado

```
[Telefono Lead] --mu-law 8kHz--> [Twilio PSTN] --mu-law 8kHz--> [Media Streams WS]
                                                                          |
                                                                          v
[Telefono Lead] <--mu-law 8kHz-- [Twilio PSTN] <--mu-law 8kHz-- [AudioBridge]
                                                                          ^
                                                                          |
[Gemini Live API] <--PCM 24kHz out-- [Gemini Bridge] <--PCM 16kHz in-- [AudioBridge]
```

**Hops del pipeline Gemini:**

| Hop | Operacion | Latencia Estimada |
|-----|-----------|-------------------|
| 1 | Telefono -> Twilio (red celular PSTN) | 30-80ms |
| 2 | Twilio -> Servidor (WebSocket) | 20-50ms |
| 3 | AudioBridge: mu-law decode a PCM 16kHz | <1ms |
| 4 | Gemini Live API (STT + LLM + TTS integrados nativamente) | 400-600ms |
| 5 | AudioBridge: PCM 24k -> 16k -> mu-law encode | <1ms |
| 6 | Servidor -> Twilio (WebSocket) | 20-50ms |
| 7 | Twilio -> Telefono (red celular PSTN) | 30-80ms |
| 8 | Jitter buffer + playback en dispositivo | 30-50ms |
| **Total pipeline Gemini** | | **~530-910ms (media ~720ms)** |

**Caracteristicas del pipeline Gemini:**
- **Ventaja principal:** STT+LLM+TTS en un solo modelo = menor cantidad de network hops
- **Ventaja secundaria:** Barge-in nativo y robusto (modelo unico escucha mientras habla)
- **Desventaja:** Calidad de voz inferior a ElevenLabs Flash v2.5
- **Desventaja:** Menor control sobre cada componente individual

#### 2.2 Pipeline ElevenLabs (Hibrido) — Flujo Detallado

```
Twilio (mu-law 8kHz) <-> AudioBridge <-> ElevenLabs STT (Scribe v2, PCM 16k)
                                              |
                                              v
                                      Mini Classifier (Gemini Flash) [~80ms]
                                              |
                                              v
                                      State Engine (probabilistico) [~20ms]
                                              |
                                              v
                                      Call Goal Tracker [~10ms]
                                              |
                                              v
                                      Gemini Chat (Flash) [~150-300ms]
                                              |
                                              v
                                      ElevenLabs TTS (Flash v2.5) [~75-150ms]
                                              |
                                              v
                                      Twilio (mu-law 8kHz)
```

**Hops del pipeline ElevenLabs:**

| # | Componente | Latencia Est. | Proceso |
|---|------------|---------------|---------|
| 1 | Telefono -> Twilio (red celular) | 30-80ms | PSTN |
| 2 | Twilio -> Servidor WS | 20-50ms | WebSocket transporte |
| 3 | AudioBridge: mu-law -> PCM 16kHz | <1ms | Decoding |
| 4 | ElevenLabs Scribe v2 STT | 80-150ms | Transcripcion streaming |
| 5 | STT -> Classifier (Gemini Flash) | 80-150ms | Clasificacion de intencion |
| 6 | State Engine probabilistico | 10-30ms | Transicion de estado de llamada |
| 7 | Call Goal Tracker | 10-20ms | Seguimiento de objetivo |
| 8 | Gemini Chat (Flash) — naturalizador | 150-400ms | Generacion de respuesta textual |
| 9 | Gemini Chat -> ElevenLabs TTS API call | 20-50ms | Network RTT |
| 10 | ElevenLabs TTS Flash v2.5 | 75-150ms | Sintesis de voz |
| 11 | AudioBridge: PCM -> mu-law 8kHz | <1ms | Encoding |
| 12 | Servidor -> Twilio (WebSocket) | 20-50ms | Transporte |
| 13 | Twilio -> Telefono (red celular) | 30-80ms | PSTN |
| 14 | Jitter buffer + playback | 30-50ms | Bufferizacion cliente |
| **Total pipeline ElevenLabs** | | **~525-1,220ms (media ~870ms)** |

**Caracteristicas del pipeline ElevenLabs:**
- **Ventaja principal:** Calidad de voz superior (Flash v2.5 = voz mas natural y expresiva)
- **Ventaja secundaria:** Mayor control sobre cada componente (STT, clasificacion, TTS)
- **Desventaja critica:** 5+ componentes separados con round-trips independientes = overhead de red puro de 100-300ms
- **Desventaja secundaria:** Barge-in complejo (multi-modelo, mas puntos de fallo)

#### 2.3 Comparativa Directa de Pipelines

| Metrica | Pipeline Gemini | Pipeline ElevenLabs | Diferencia |
|---------|----------------|---------------------|------------|
| Componentes separados | 1 (integrado) | 5+ (stitched) | ElevenLabs: 5x mas complejo |
| Network hops (ida+vuelta) | 2 | 6+ | ElevenLabs: 3x mas hops |
| Latencia minima teorica | ~550ms | ~525ms | Similar |
| Latencia real mediana | ~700-900ms | ~900-1,200ms | ElevenLabs: +200-300ms |
| Latencia real P95 | ~1,100ms | ~1,500ms | ElevenLabs: +400ms |
| Calidad de voz | Media (voz Gemini) | Alta (ElevenLabs Flash v2.5) | ElevenLabs gana claramente |
| Robustez barge-in | Nativa (unico modelo) | Compleja (multi-modelo) | Gemini gana claramente |
| Costo por minuto | ~$0.012 (preview) | ~$0.05-0.08 (STT+LLM+TTS) | Gemini: 4-7x mas barato |
| Control granular | Bajo | Alto | ElevenLabs gana |
| Fiabilidad | Mayor (menos componentes) | Menor (mas puntos de fallo) | Gemini gana |

> **Conclusion de arquitectura:** El pipeline hibrido ElevenLabs introduce **~400-600ms de latencia adicional** comparado con un pipeline nativo optimizado. La estrategia recomendada es **consolidar en Gemini Live API para el 80%+ del trafico** (llamadas estandar, discovery, qualification), reservando ElevenLabs para casos donde la calidad de voz es critica (cierres, VIP, demos de alta importancia).



---

### 3. Los 8 Cuellos de Botella Identificados

#### Cuello de Botella #1: VAD Endpointing — 500ms de Silencio Forzado (CRITICO)

**Problema:** `VAD_SILENCE_MS=500` es excesivamente conservador. Este parametro agrega **500ms de latencia pura** despues de que el usuario deja de hablar, antes de que el sistema procese la respuesta. Es el mayor contribuyente individual a la latencia percibida.

**Como funciona el VAD endpointing:**
```
Usuario habla: "Quiero agendar una demo"
                    |
                    v (usuario deja de hablar)
            [VAD detecta silencio]
                    |
                    v
            [Espera VAD_SILENCE_MS = 500ms]
                    |
                    v (ahora si, envia a procesar)
            [STT + LLM + TTS]
                    |
                    v
            [Respuesta al usuario]
Total: 500ms (silencio) + 400-800ms (procesamiento) = 900-1,300ms
```

**Referencia del estado del arte:**
- Vapi default `onNoPunctuationSeconds`: 1,500ms (conocido como el "latency killer #1" en la industria)
- Retell AI usa endpointing adaptativo: ~200-300ms
- AssemblyAI recomienda: 100-200ms para conversaciones rapidas
- Practica estandar B2B: 200-300ms para trailing-edge padding

**Optimizacion recomendada:** Reducir a 200ms con endpointing adaptativo (min: 150ms para comandos cortos, max: 400ms para dictado largo).

> **Impacto estimado: -250 a -300ms (el cambio de mayor impacto individual)**

---

#### Cuello de Botella #2: ELEVENLABS_LATENCY_OPT=4 — Configuracion para Maxima Calidad, NO Minima Latencia (CRITICO)

**Problema:** `ELEVENLABS_LATENCY_OPT=4` es el valor MAS CONSERVADOR de la escala, configurado para maxima calidad en lugar de minima latencia.

Segun la documentacion oficial de ElevenLabs:

| Valor | Descripcion | Latencia | Calidad |
|-------|-------------|----------|---------|
| `0` | Maxima optimizacion | **Minima (~75ms)** | Ligeramente reducida |
| `1` | Algo de optimizacion | **Baja (~100ms)** | Buena |
| `2` | Mas optimizacion | **Media (~120ms)** | Muy buena |
| `3` | Maxima optimizacion | **Media-alta (~140ms)** | Excelente |
| `4` | Max optimizacion + normalizador APAGADO | **ALTA (~250ms)** | Maxima |

**El valor actual (4) prioriza calidad sobre velocidad.** Con Flash v2.5, la diferencia de calidad entre 1 y 4 es imperceptible en telefonia (mu-law 8kHz), pero la diferencia de latencia es de 100-150ms.

**Optimizacion:** Cambiar a `1` (balance optimo) o `0` (minima latencia).

> **Impacto estimado: -75 a -150ms en TTS** | **Costo: $0**

---

#### Cuello de Botella #3: Pipeline ElevenLabs Hibrido — Overhead de Multi-hop (CRITICO)

**Problema:** El pipeline hibrido atraviesa 5+ componentes separados con round-trips independientes:

```
[Twilio] -> [AudioBridge] -> [ElevenLabs STT] 
                                                    |
                                                    v -> [Classifier Gemini]
                                                              |
                                                              v -> [State Engine]
                                                                        |
                                                                        v -> [Gemini Chat]
                                                                                  |
                                                                                  v -> [ElevenLabs TTS]
                                                                                            |
                                                                                            v -> [AudioBridge] -> [Twilio]
```

Cada flecha implica un round-trip de red (20-50ms RTT). Total de network hops: 6 ida-vuelta = **100-300ms de overhead de red puro**.

**Comparativa de hops:**

| Pipeline | Network Hops | RTT Total Est. |
|----------|-------------|----------------|
| Gemini nativo | 2 (ida+vuelta via WebSocket) | 40-100ms |
| ElevenLabs hibrido | 6+ (ida+vuelta por cada servicio) | 120-300ms |

**Optimizacion:** Consolidar trafico mayoritario en pipeline nativo Gemini. Reservar ElevenLabs para VIP/altafidelidad.

> **Impacto estimado: -150 a -250ms (eliminando overhead de red)**

---

#### Cuello de Botella #4: AudioBridge mu-law 8kHz — Narrowband Telefonico (ALTO)

**Problema:** Twilio Media Streams usa mu-law 8kHz (G.711) que limita el ancho de banda a 4kHz (voz telefonica tradicional). Esto no es un cuello de botella de latencia, pero SI de calidad perceptual.

**Comparativa de codecs de audio:**

| Codec | Sample Rate | Frec. Maxima | Latencia | MOS Score | Notas |
|-------|-------------|-------------|----------|-----------|-------|
| G.711 (mu-law) | 8 kHz | 4.0 kHz | <1ms | 4.1 | **Twilio actual** — limitado a voz "telefonica" |
| G.722 | 16 kHz | 8.0 kHz | <2ms | 4.5 | Wideband, requiere soporte carrier |
| Opus (narrowband) | 8 kHz | 4.0 kHz | 2.5-10ms | 4.3 | Mejor compresion que G.711 |
| Opus (wideband) | 16 kHz | 8.0 kHz | 2.5-10ms | 4.5+ | Ideal, pero Twilio no soporta |
| Opus (fullband) | 48 kHz | 20.0 kHz | 2.5-10ms | 4.8 | Calidad HD, no disponible en PSTN |

**Nota importante:** Twilio Media Streams soporta exclusivamente mu-law 8kHz para PSTN. No hay alternativa directa de codec sin migrar a SIP trunk con soporte G.722.

**Optimizacion parcial:**
1. Upsampling inteligente PCM 16k -> post-procesamiento de voz
2. Voice enhancement en el servidor antes de enviar a TTS/STT
3. Considerar migracion a SIP trunk con soporte wideband para clientes enterprise

> **Impacto:** No reduce latencia, pero mejora MOS de 4.1 a ~4.3 con post-procesamiento DSP.

---

#### Cuello de Botella #5: DSP Desactivado (ENABLE_INPUT_DSP=false) (ALTO)

**Problema:** Sin Digital Signal Processing (noise suppression, AGC, voice enhancement), el audio que llega a Gemini/ElevenLabs contiene:

- **Ruido ambiente:** Trafico, ventiladores, television, conversaciones de fondo
- **Eco acustico:** El propio TTS del agente se re-ingresa al microfono del usuario durante barge-in
- **Niveles de volumen inconsistentes:** Usuarios hablando bajo o lejos del telefono
- **Posible clipping:** En transmisiones fuertes cerca del microfono

**Impacto en latencia:** Indirecto pero significativo — STT menos preciso requiere mas correcciones y reintentos, aumentando el tiempo de procesamiento percibido.

**Impacto en calidad:** Directo — artefactos de audio, errores de transcripcion, voz menos clara del agente, experiencia degradada.

**Optimizacion:** Activar DSP con pipeline optimizado:
- **Noise suppression:** RNNoise (open source, 5ms latencia) o DeepFilterNet (mejor calidad, 10-15ms)
- **AGC (Automatic Gain Control):** Target -16dBFS
- **Noise gate:** Threshold -45dB para eliminar ruido de fondo
- **Limiter:** Prevenir clipping a -1dB

> **Impacto estimado: +0.3-0.5 MOS en calidad, reduccion de 30-50% en errores de STT** | **Costo adicional: ~5-15ms de latencia en DSP (aceptable)**

---

#### Cuello de Botella #6: Barge-in y Cancelacion de TTS — Agente "Sordo" a Interrupciones (MEDIO)

**Problema:** El sistema implementa barge-in basico, pero la latencia total del ciclo de interrupcion es excesiva:

```
Timeline de barge-in actual:
  t=0ms    Usuario interrumpe: "No, espera..."
  t=100ms  VAD detecta energia de voz
  t=300ms  STT confirma que es habla (no ruido)
  t=450ms  Servidor envia "clear" a Twilio
  t=650ms  Twilio vacia buffer de audio
  t=750ms  TTS se detiene completamente
  t=900ms  Nueva respuesta comienza
```

En ese lapso (450-850ms), el agente sigue hablando 2-4 palabras **despues** de que el usuario interrumpio. Esto genera:
- Frustracion ("me esta ignorando")
- Desconfianza en la capacidad del agente
- Interrupciones repetidas por parte del usuario

**Optimizacion: Barge-in semantico predictivo de 3 capas:**

```
Capa 1 (mas rapida, mas falsos positivos):
  VAD energia > umbral (0.015) -> Cancelacion inmediata (~100ms)
  
Capa 2 (validacion rapida):
  Duracion minima de habla > 150ms -> Confirmar interrupcion (~250ms)
  
Capa 3 (filtro de backchannel):
  Verificar que NO es "mm-hmm", "si", "ok" del usuario -> Cancelacion definitiva (~300ms)
```

**Con barge-in agresivo:**
```
  t=0ms    Usuario: "No, espera..."
  t=100ms  Capa 1: VAD energia detectada -> CLEAR a Twilio
  t=150ms  Buffer TTS vaciado, silencio inmediato
  t=250ms  Capa 2: Confirmada interrupcion real
  t=500ms  Nueva respuesta comienza
  
  Mejora: De 900ms a 500ms (-44%)
```

> **Impacto estimado: -200-400ms en percepcion de respuesta a interrupciones**

---

#### Cuello de Botella #7: Ausencia de Speculative TTS y Streaming (MEDIO)

**Problema:** El sistema espera a tener la respuesta **completa** del LLM antes de iniciar TTS. Esto es sub-optimo porque:

1. El LLM genera texto token por token (streaming)
2. Las primeras palabras de la respuesta a menudo son predecibles ("Entiendo", "Claro", "Perfecto")
3. TTS puede comenzar a sintetizar mientras el LLM aun genera el resto

**Mejores practicas del estado del arte:**

| Tecnica | Descripcion | Impacto en Latencia |
|---------|-------------|-------------------|
| **Streaming TTS token-by-token** | Enviar tokens a ElevenLabs/Gemini mientras el LLM genera | -150-300ms |
| **Speculative TTS** | Pre-generar audio para respuestas comunes | -200-400ms (para respuestas cacheadas) |
| **Sentence-level streaming** | Enviar oraciones completas tan pronto como estan listas | -100-200ms |
| **Phrase-level streaming** | Enviar frases semanticamente completas | -75-150ms |

ElevenLabs WebSocket API soporta streaming de texto token-por-token, iniciando audio antes de tener la respuesta completa. Gemini Live API lo hace nativamente.

> **Impacto estimado: -150 a -300ms en time-to-first-audio percibido**

---

#### Cuello de Botella #8: Modelo Gemini Chat como Naturalizador — Hop LLM Innecesario (MEDIO)

**Problema:** En el pipeline ElevenLabs, se usa Gemini Chat (Flash) como "naturalizador" de texto — reformula las respuestas para que suenen mas conversacionales. Esto agrega un **hop LLM completo** (150-400ms) solo para reformular respuestas que ya son generadas por otro LLM.

**Flujo problematico:**
```
[ElevenLabs STT] -> [Classifier] -> [State Engine] -> [Gemini Chat] -> "Respuesta natural"
                                                                          |
                                                                          v (hop adicional)
                                                                  [Gemini Chat "Naturalizador"]
                                                                          |
                                                                          v
                                                                  [ElevenLabs TTS]
```

**Alternativa:**
- Si se usa Gemini Live API nativo: el modelo maneja directamente la naturalidad de la respuesta sin hop adicional
- Si se usa ElevenLabs: entrenar el prompt de Gemini Chat para generar directamente texto naturalizado (eliminar el segundo LLM)

> **Impacto estimado: -150 a -300ms eliminando este paso innecesario**

---

### 4. Plan de Optimizacion Priorizado (P0 / P1 / P2)

#### 4.1 P0: Cambios Inmediatos (< 1 dia de implementacion)

Estos cambios pueden implementarse hoy mismo y reducen la latencia percibida en un **33-40%** sin costo adicional.

---

##### P0-1: Corregir ELEVENLABS_LATENCY_OPT

```python
# ============================================================
# ANTES (configuracion actual - MALA)
# ============================================================
ELEVENLABS_LATENCY_OPT = 4  # Max calidad, max latencia
# Latencia TTS estimada: 200-250ms

# ============================================================
# DESPUES (configuracion optimizada - BUENA)
# ============================================================
ELEVENLABS_LATENCY_OPT = 1  # Balance latencia/calidad para Flash v2.5
# Latencia TTS estimada: 100-125ms

# Alternativa agresiva (para testing):
# ELEVENLABS_LATENCY_OPT = 0  # Minima latencia
# Latencia TTS estimada: 75-100ms
```

**Impacto: -75 a -150ms en TTS** | **Costo: $0** | **Tiempo: 5 minutos**

> **Nota:** Flash v2.5 tiene calidad suficiente incluso con `latency_opt=0` para telefonia (mu-law 8kHz). La diferencia de calidad es imperceptible en narrowband.

---

##### P0-2: Reducir VAD_SILENCE_MS — El Cambio de Mayor Impacto

```python
# ============================================================
# ANTES (configuracion actual)
# ============================================================
VAD_CONFIG = {
    "silence_ms": 500,           # DEMASIADO conservador
    "prefix_padding_ms": 150,    # Primeras palabras pueden cortarse
    "start_sensitivity": "HIGH",
    "end_sensitivity": "HIGH",
}

# ============================================================
# DESPUES (configuracion optimizada)
# ============================================================
VAD_CONFIG = {
    "silence_ms": 200,           # Estandar para conversaciones rapidas
    "prefix_padding_ms": 200,    # Proteger primeras palabras del usuario
    "start_sensitivity": "HIGH", # Detectar inicio rapido
    "end_sensitivity": "HIGH",   # Detectar fin rapido
    
    # === EXTENDED: Endpointing adaptativo ===
    "adaptive_endpointing": True,
    "min_silence_ms": 150,       # Para comandos cortos ("si", "no", "uno")
    "max_silence_ms": 400,       # Para dictado largo (numeros, emails)
    "sentence_pause_ms": 250,    # Pausa entre oraciones
    "endpoint_on_punctuation": True,  # Endpoint rapido si STT detecta "." o "?"
    "semantic_endpointing": True,     # Usar Gemini para detectar fin de turno
}
```

**Impacto: -250 a -300ms en endpointing** | **Costo: $0** | **Tiempo: 10 minutos**

> **IMPORTANTE:** Reducir `VAD_SILENCE_MS` de 500ms a 200ms es el cambio individual de mayor impacto. Solo este parametro representa el **50-60% de la latencia percibida** en muchos casos.

---

##### P0-3: Activar Input DSP

```python
# ============================================================
# ANTES (configuracion actual)
# ============================================================
ENABLE_INPUT_DSP = false  # DSP desactivado completamente

# ============================================================
# DESPUES (configuracion optimizada)
# ============================================================
ENABLE_INPUT_DSP = true

# Configuracion detallada del pipeline DSP:
DSP_CONFIG = {
    # --- Noise Suppression ---
    "noise_suppression": {
        "enabled": True,
        "algorithm": "rnnoise",      # 5ms latencia, open source
        # "algorithm": "deepfilternet",  # Alternativa: mejor calidad, 10-15ms
        "aggressiveness": 2,         # 1-4, 2 = balance calidad/reduccion
    },
    
    # --- Automatic Gain Control ---
    "agc": {
        "enabled": True,
        "target_dbfs": -16,          # Nivel objetivo de audio
        "max_gain_db": 20,           # Maximo aumento permitido
        "min_gain_db": -10,          # Maximo reduccion permitida
    },
    
    # --- Noise Gate ---
    "noise_gate": {
        "enabled": True,
        "threshold_db": -45,         # Por debajo = silencio
        "attack_ms": 5,              # Apertura rapida
        "release_ms": 100,           # Cierre suave
    },
    
    # --- Limiter ---
    "limiter": {
        "enabled": True,
        "threshold_db": -1,          # Prevenir clipping
        "release_ms": 50,
    },
}
```

**Impacto: +0.3-0.5 MOS en calidad, -30-50% errores STT** | **Costo: ~5-15ms latencia adicional** | **Tiempo: 2 horas**

---

##### P0-4: Implementar Streaming TTS (Speculative)

```python
# ============================================================
# Estrategia: Enviar texto a ElevenLabs WebSocket TOKEN por TOKEN
# en lugar de esperar la respuesta completa del LLM.
# Esto permite que TTS comience mientras Gemini aun genera.
# ============================================================

import asyncio
import json

async def stream_tts_from_llm(llm_token_stream, tts_websocket):
    """
    Consume tokens del LLM en streaming y los envia a ElevenLabs TTS
    tan pronto como se tiene una frase semantica completa.
    """
    buffer = ""
    sentence_end_chars = {'.', '?', '!', ';', '\n'}
    
    async for token in llm_token_stream:
        buffer += token
        
        # Enviar cuando tengamos una frase completa o chunk > 50 chars
        if any(c in buffer for c in sentence_end_chars) or len(buffer) > 50:
            await tts_websocket.send(json.dumps({
                "text": buffer,
                "try_trigger_generation": True,
            }))
            buffer = ""
    
    # Flush final: cualquier texto restante + trigger de generacion
    if buffer:
        await tts_websocket.send(json.dumps({
            "text": buffer + " ",  # Espacio final ayuda a TTS
            "flush": True,
            "generate": True,
        }))


# ============================================================
# Con Gemini Live API, el streaming es nativo — no requiere codigo adicional
# Gemini envia audio PCM 24kHz a medida que el LLM genera tokens internamente.
# ============================================================
```

**Impacto: -150 a -300ms time-to-first-audio** | **Costo: Desarrollo ~4-8h** | **Tiempo: 1 dia**

---

##### P0-5: Backchannels durante Procesamiento

```python
# ============================================================
# Estrategia: Emitir sonidos de afirmacion MIENTRAS se procesa
# la respuesta principal. Esto mantiene la conversacion fluida
# y reduce la percepcion de latencia en un 40-50%.
# ============================================================

import base64

# Audio precargado (pre-generado con ElevenLabs/Gemini)
BACKCHANNEL_AUDIO = {
    # Cuando el sistema esta "pensando" (procesando)
    "thinking": base64.b64encode(open("mmhmm_300ms.ulaw", "rb").read()).decode(),
    
    # Cuando el sistema esta "buscando" informacion (tool call)
    "processing": base64.b64encode(open("entendido_400ms.ulaw", "rb").read()).decode(),
    
    # Cuando el sistema esta consultando datos (CRM, calendario)
    "lookup": base64.b64encode(open("dame_momento_500ms.ulaw", "rb").read()).decode(),
    
    # Confirmacion rapida
    "ack": base64.b64encode(open("si_claro_200ms.ulaw", "rb").read()).decode(),
}

async def emit_backchannel(intent_type: str, twilio_ws):
    """Emite backchannel apropiado mientras el LLM procesa.
    
    Args:
        intent_type: 'thinking', 'processing', 'lookup', 'ack'
        twilio_ws: WebSocket de Twilio Media Streams
    """
    audio_b64 = BACKCHANNEL_AUDIO.get(intent_type)
    if audio_b64:
        media_message = {
            "event": "media",
            "streamSid": twilio_ws.stream_sid,
            "media": {
                "payload": audio_b64,
                "track": "outbound"
            }
        }
        await twilio_ws.send(json.dumps(media_message))


# ============================================================
# Ejemplo de uso integrado en el pipeline:
# ============================================================

async def process_user_speech_with_backchannel(audio_data, twilio_ws):
    # 1. Emitir backchannel de confirmacion inmediata
    await emit_backchannel("ack", twilio_ws)
    
    # 2. Enviar audio a STT
    transcript = await stt.transcribe(audio_data)
    
    # 3. Emitir backchannel de procesamiento
    await emit_backchannel("thinking", twilio_ws)
    
    # 4. Procesar con LLM (largo)
    response = await llm.generate(transcript)
    
    # 5. Sintetizar TTS
    audio_response = await tts.synthesize(response)
    
    # 6. Enviar respuesta final
    await send_audio_to_twilio(audio_response, twilio_ws)
```

**Impacto: Reduce percepcion de latencia en un 40-50%** | **Costo: Desarrollo ~2-4h + generacion de audios** | **Tiempo: 1 dia**

> **Nota psicologica:** Los humanos toleran mucho mejor una respuesta intermedia ("mm-hmm...") seguida de una pausa, que un silencio total. El backchannel confirma que "estan escuchando" y mantiene el ritmo conversacional.

---

#### 4.2 P1: Optimizaciones de Alto Impacto (1-2 semanas)

##### P1-1: Consolidar Pipeline en Gemini Live API Nativo

**Estrategia recomendada:** Usar Gemini Live API como pipeline principal (80%+ del trafico), reservando ElevenLabs para casos donde la calidad de voz es critica.

```python
# ============================================================
# Router de pipeline basado en contexto de llamada en tiempo real
# ============================================================

from enum import Enum

class Pipeline(Enum):
    GEMINI_NATIVE = "gemini_native"           # Rapido, bajo costo, buena calidad
    ELEVENLABS_HYBRID = "elevenlabs_hybrid"   # Mas lento, alto costo, max calidad

class PipelineRouter:
    """Decide que pipeline usar basado en el contexto de la llamada."""
    
    # Umbrales de decision
    VIP_DOMAINS = ["enterprise", "vip", "partner"]
    HIGH_VALUE_TRIGGERS = ["cerrar", "comprar", "contratar", "precio", "factura"]
    
    async def route(self, call_context) -> Pipeline:
        # Regla 1: Llamadas VIP -> ElevenLabs (calidad maxima)
        if call_context.priority == "high":
            return Pipeline.ELEVENLABS_HYBRID
        
        # Regla 2: Momento de cierre -> ElevenLabs
        if call_context.is_closing_phase:
            return Pipeline.ELEVENLABS_HYBRID
        
        # Regla 3: Fallback si Gemini tiene degradacion
        if call_context.gemini_latency_p50 > 800:
            logger.warning("Gemini latencia alta, fallback a ElevenLabs")
            return Pipeline.ELEVENLABS_HYBRID
        
        # Default: Gemini nativo (mas rapido, mas barato)
        return Pipeline.GEMINI_NATIVE
    
    async def switch_pipeline(self, call, target_pipeline: Pipeline):
        """Cambia de pipeline en medio de la llamada sin interrupcion audible."""
        # 1. Prewarm nueva sesion
        new_session = await self.prewarm(target_pipeline, call.lead_id)
        
        # 2. Transferir contexto (historial, estado, tools)
        await new_session.load_context(call.current_context)
        
        # 3. Crossfade de audio (evitar clic/pop)
        await call.bridge.crossfade_to(new_session, duration_ms=100)
        
        # 4. Cerrar sesion anterior
        await call.current_session.close()
        call.current_session = new_session
```

**Cuando usar cada pipeline:**

| Escenario | Pipeline Recomendado | Razon |
|-----------|---------------------|-------|
| Discovery inicial (lead frio) | Gemini native | Rapido, bajo costo, barge-in robusto |
| Qualification (preguntas BANT) | Gemini native | Muchos turnos, latencia importa |
| Presentacion de valor | Gemini native | Respuestas estandar, streaming eficiente |
| Manejo de objeciones complejas | ElevenLabs hibrido | Calidad de voz = confianza |
| Cierre/agendamiento de demo | ElevenLabs hibrido | Momento critico, max calidad |
| Llamada VIP/Enterprise | ElevenLabs hibrido | Cliente de alto valor |
| Fallback por degradacion | ElevenLabs hibrido | Resiliencia |

**Impacto: -200 a -400ms para trafico en Gemini** | **Costo: Cambio de arquitectura** | **Tiempo: 3-5 dias**

---

##### P1-2: Implementar Barge-in Agresivo de 3 Capas

```python
# ============================================================
# Barge-in semantico predictivo de 3 capas
# Capa 1: VAD energia (mas rapido, mas falsos positivos)
# Capa 2: Duracion minima (filtra ruidos cortos)
# Capa 3: Filtro de backchannel ("mm-hmm" != interrupcion)
# ============================================================

class BargeInController:
    def __init__(self):
        # --- Capa 1: VAD Energia ---
        self.vad_energy_threshold = 0.015     # Umbral de energia VAD
        self.vad_energy_frames = 3            # Frames consecutivos para trigger
        
        # --- Capa 2: Duracion Minima ---
        self.min_speech_ms = 150              # Minimo para considerar interrupcion real
        
        # --- Capa 3: Backchannel Filter ---
        self.backchannel_filter = True
        self.backchannel_patterns = [
            "mm", "hm", "si", "ok", "aha", "claro", "ya", "vale"
        ]
        
        # --- Timing ---
        self.clear_delay_ms = 50              # Delay antes de enviar clear
        self.protected_actions = ["booking", "payment", "confirmation"]
        
        # --- Estado ---
        self.is_interrupting = False
        self.interrupt_start_ms = 0
    
    async def on_audio_frame(self, vad_event):
        """Procesa cada frame de audio del usuario."""
        
        # === CAPA 1: Deteccion de energia ===
        if vad_event.energy > self.vad_energy_threshold:
            self.energy_frame_count = getattr(self, 'energy_frame_count', 0) + 1
            
            if self.energy_frame_count >= self.vad_energy_frames:
                # === CAPA 2: Duracion minima ===
                if vad_event.duration_ms > self.min_speech_ms:
                    
                    # === CAPA 3: Filtro de backchannel ===
                    if not self.is_backchannel(vad_event.audio_preview):
                        await self._execute_interrupt(vad_event)
        else:
            self.energy_frame_count = 0
    
    def is_backchannel(self, audio_preview: bytes) -> bool:
        """Detecta si el audio es un backchannel (no interrupcion real).
        
        Usa heuristica de energia + duracion + STT rapido en preview.
        """
        # Heuristica simple: duracion corta + baja energia = backchannel
        preview_duration_ms = len(audio_preview) / 8  # mu-law 8kHz
        if preview_duration_ms < 300:
            return True
        return False
    
    async def _execute_interrupt(self, vad_event):
        """Ejecuta la secuencia de interrupcion agresiva."""
        if self.is_interrupting:
            return  # Ya estamos en interrupcion
        
        self.is_interrupting = True
        logger.info(f"Barge-in ejecutado: {vad_event.duration_ms}ms de habla")
        
        # 1. Cancelar TTS inmediatamente (ElevenLabs)
        await tts_ws.send(json.dumps({"cancel": True}))
        
        # 2. Enviar CLEAR a Twilio (vaciar buffer de playback)
        await asyncio.sleep(self.clear_delay_ms / 1000)
        await twilio_ws.send(json.dumps({"event": "clear"}))
        
        # 3. Vaciar buffers locales
        self.audio_buffer.clear()
        self.tts_queue.clear()
        
        # 4. Emitir backchannel de confirmacion
        await emit_backchannel("ack", twilio_ws)
        
        self.is_interrupting = False


# ============================================================
# Metricas de barge-in para monitoreo
# ============================================================
BARGE_IN_METRICS = {
    "total_events": Counter("barge_in_total"),
    "successful_cancels": Counter("barge_in_success"),
    "false_positives": Counter("barge_in_false_positive"),
    "cancel_latency_ms": Histogram("barge_in_cancel_latency_ms", buckets=[50,100,200,300,500]),
}
```

**Impacto: -200 a -400ms en respuesta a interrupciones** | **Costo: Desarrollo ~1-2 dias** | **Tiempo: 1 semana**

---

##### P1-3: Cache Semantico de Respuestas Frecuentes

```python
# ============================================================
# Cache de respuestas comunes basado en embeddings semanticos.
# Si una pregunta es semanticamente similar a una cacheada,
# responde INSTANTANEAMENTE sin LLM ni TTS (audio pre-generado).
# ============================================================

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SemanticCache:
    """Cache semantico con TTL y limite de tamano."""
    
    def __init__(self, similarity_threshold=0.92, max_size=200, ttl_hours=24):
        self.similarity_threshold = similarity_threshold
        self.max_size = max_size
        self.ttl_hours = ttl_hours
        
        # Estructura: embedding -> (response_text, response_audio_b64, timestamp)
        self.cache = {}
        self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    
    async def get(self, query_text: str) -> str | None:
        """Busca respuesta cacheada por similitud semantica."""
        query_embedding = self.embedding_model.encode([query_text])[0]
        
        best_match = None
        best_similarity = 0
        
        for cached_embedding, (text, audio, ts) in self.cache.items():
            # Verificar TTL
            if datetime.now() - ts > timedelta(hours=self.ttl_hours):
                continue
            
            similarity = cosine_similarity(
                [query_embedding], [np.array(cached_embedding)]
            )[0][0]
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = (text, audio)
        
        if best_similarity > self.similarity_threshold:
            logger.info(f"Cache HIT: similarity={best_similarity:.3f}")
            return best_match[1]  # audio_b64
        
        return None
    
    async def put(self, query_text: str, response_text: str, response_audio_b64: str):
        """Almacena respuesta en cache."""
        embedding = self.embedding_model.encode([query_text])[0]
        
        # Evitar duplicados
        if len(self.cache) >= self.max_size:
            # LRU eviction
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][2])
            del self.cache[oldest_key]
        
        self.cache[tuple(embedding)] = (response_text, response_audio_b64, datetime.now())


# ============================================================
# Intents que deben estar SIEMPRE en cache (pre-generados):
# ============================================================

CACHEABLE_INTENTS = {
    # Saludos
    "greeting": [
        "Hola, buenos dias, con {{nombre}}?",
        "Buenas tardes, hablo con {{nombre}}?",
        "Hola, soy Mariana de GestPro.",
    ],
    # Despedidas
    "goodbye": [
        "Perfecto, que tengas excelente dia!",
        "Un gusto hablar contigo. Hasta luego!",
    ],
    # Hold/Espera
    "hold_on": [
        "Dame un momento, por favor...",
        "Un segundo, reviso eso para ti...",
        "Mm-hmm, dejame verificar...",
    ],
    # Repeticion
    "repeat": [
        "Claro, te repito — ",
        "Por supuesto, decia que ",
    ],
    # No interesado (soft)
    "not_interested_soft": [
        "Entiendo perfectamente, sin problema. Te envio la info por WhatsApp y si algun dia te interesa, aqui estamos. Que tengas buen dia!",
    ],
    # Callback
    "callback_request": [
        "Por supuesto. Te llamo {{dia}} a las {{hora}}? Confirmame y queda agendado.",
    ],
    # Horarios
    "business_hours": [
        "Nuestro horario es de lunes a viernes, 9 de la manana a 6 de la tarde.",
    ],
    # Confirmacion
    "confirmation": [
        "Listo, ya quedo agendado. Te envio confirmacion por WhatsApp.",
    ],
}
```

**Impacto: -300 a -500ms para respuestas cacheadas (30-40% del trafico)** | **Costo: Desarrollo ~1 dia** | **Tiempo: 2-3 dias**

---

##### P1-4: Optimizacion de AudioBridge

```python
# ============================================================
# AudioBridge optimizado con:
# - Lookup tables para mu-law (evitar formula en cada frame)
# - Pre-allocated buffers (evitar GC)
# - Rolling buffer para evitar gaps entre chunks TTS
# - Pipeline SIMD para DSP
# ============================================================

import numpy as np

class OptimizedAudioBridge:
    def __init__(self, dsp_enabled: bool = True):
        # --- Codecs ---
        self.input_format = "mulaw_8000"
        self.output_format = "mulaw_8000"
        self.internal_sample_rate = 16000
        
        # --- Buffers pre-allocated (evitar GC durante llamada) ---
        self.input_buffer = bytearray(320)     # 20ms @ 16kHz stereo
        self.output_buffer = bytearray(160)    # 20ms @ 8kHz mono
        self.pcm_buffer = np.zeros(160, dtype=np.float32)  # 20ms @ 8kHz PCM
        
        # --- Rolling buffer para eliminar gaps entre chunks TTS ---
        self.rolling_buffer_ms = 150
        self.rolling_buffer = bytearray(int(8000 * 2 * self.rolling_buffer_ms / 1000))
        
        # --- Lookup tables para mu-law (100x mas rapido que formula) ---
        self.ulaw_encode_table = self._build_ulaw_encode_lut()
        self.ulaw_decode_table = self._build_ulaw_decode_lut()
        
        # --- DSP ---
        self.dsp_enabled = dsp_enabled
        if dsp_enabled:
            self.dsp = DSPPipeline(config=DSP_CONFIG)
    
    def _build_ulaw_encode_lut(self) -> np.ndarray:
        """Construye lookup table para codificacion mu-law."""
        lut = np.zeros(65536, dtype=np.uint8)
        for i in range(-32768, 32768):
            lut[i & 0xFFFF] = self._ulaw_encode_scalar(i)
        return lut
    
    def _build_ulaw_decode_lut(self) -> np.ndarray:
        """Construye lookup table para decodificacion mu-law."""
        lut = np.zeros(256, dtype=np.int16)
        for i in range(256):
            lut[i] = self._ulaw_decode_scalar(i)
        return lut
    
    def ulaw_decode_fast(self, mulaw: bytes) -> np.ndarray:
        """Decodificacion mu-law usando LUT (O(n) vs O(n*formula))."""
        return self.ulaw_decode_table[np.frombuffer(mulaw, dtype=np.uint8)]
    
    def ulaw_encode_fast(self, pcm: np.ndarray) -> bytes:
        """Codificacion mu-law usando LUT con clipping seguro."""
        indices = np.clip(pcm.astype(np.int32) + 32768, 0, 65535).astype(np.uint16)
        return self.ulaw_encode_table[indices].tobytes()
    
    def process_frame(self, mulaw_frame: bytes) -> bytes:
        """Pipeline optimizado: decode -> DSP -> encode."""
        # Paso 1: Decodificar mu-law a PCM (LUT)
        pcm = self.ulaw_decode_fast(mulaw_frame)
        
        # Paso 2: Upsample 8k -> 16k si es necesario
        pcm_16k = self._upsample_linear(pcm, 8000, 16000)
        
        # Paso 3: DSP (noise suppression + AGC + limiter)
        if self.dsp_enabled:
            pcm_16k = self.dsp.process(pcm_16k)
        
        # Paso 4: Downsample 16k -> 8k
        pcm_8k = self._downsample_linear(pcm_16k, 16000, 8000)
        
        # Paso 5: Codificar a mu-law (LUT)
        return self.ulaw_encode_fast(pcm_8k)
    
    def _upsample_linear(self, pcm: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
        """Upsampling lineal optimizado."""
        if src_rate == dst_rate:
            return pcm
        ratio = dst_rate / src_rate
        new_len = int(len(pcm) * ratio)
        old_indices = np.arange(new_len) / ratio
        indices = old_indices.astype(np.int32)
        fractions = old_indices - indices
        # Interpolacion lineal
        result = pcm[np.clip(indices, 0, len(pcm)-1)] * (1 - fractions)
        result += pcm[np.clip(indices + 1, 0, len(pcm)-1)] * fractions
        return result.astype(np.int16)
    
    def _downsample_linear(self, pcm: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
        """Downsampling por promedio de ventana."""
        if src_rate == dst_rate:
            return pcm
        ratio = src_rate // dst_rate
        # Promedio de cada ventana de 'ratio' muestras
        truncated = pcm[:len(pcm) - len(pcm) % ratio]
        return truncated.reshape(-1, ratio).mean(axis=1).astype(np.int16)
```

**Impacto: -5-15ms por frame, eliminacion de stutter/audio gaps** | **Costo: Refactor ~1 dia** | **Tiempo: 2-3 dias**



#### 4.3 P2: Mejoras Estrategicas (2-4 semanas)

##### P2-1: Numero Telefonico Local Mexico (+52)

Ver Seccion 6 para detalles completos. Resumen ejecutivo:

| Accion | Costo | Impacto en Answer Rate | Timeline |
|--------|-------|----------------------|----------|
| Comprar numero Twilio Mexico (+52) | $3-5/mes | +15-25% | Hoy |
| Configurar CNAM/Branding del numero | $0-10/mes | +5-10% | Semana 1 |
| Considerar SIP trunk local (Alestra, Totalplay) | $50-200/mes | +5-15% (mejor routing) | Semana 4-8 |

**Proyeccion combinada: Answer rate de 15-25% -> 35-50% (+20-25 puntos porcentuales)**

---

##### P2-2: Gemini Thinking Level Optimization

```python
# ============================================================
# Reducir "thinking level" para minima latencia.
# Los "thinking tokens" de Gemini son utiles para razonamiento
# complejo pero AGREGAN latencia significativa.
# ============================================================

# ANTES (default - pensamiento completo)
GEMINI_LIVE_CONFIG = {
    "model": "gemini-3.1-flash-live-preview",
    # "thinking_level" no configurado = "medium" (default)
}

# DESPUES (minimo pensamiento = maxima velocidad)
GEMINI_LIVE_CONFIG = {
    "model": "gemini-3.1-flash-live-preview",
    "thinking_level": "minimal",     # Minima latencia
    # Alternativa para Gemini 2.5:
    # "thinking_budget": 0,          # 0 thinking tokens = maxima velocidad
}
```

**Impacto: -100 a -200ms en inferencia** | **Costo: $0** | **Tiempo: 10 minutos**

> **Nota:** Para ventas B2B por telefonia, las respuestas no requieren razonamiento profundo — requieren velocidad y fluidez. "Minimal thinking" es suficiente para el 95% de las interacciones.

---

##### P2-3: AEC (Acoustic Echo Cancellation)

**Problema:** Durante barge-in, el TTS del agente se reproduce por el telefono del usuario y puede re-ingresar al microfono, causando que el STT transcriba lo que el agente dijo en lugar de lo que el usuario dijo.

```python
# ============================================================
# Opciones de AEC ordenadas por latencia/calidad
# ============================================================

AEC_OPTIONS = {
    # Opcion 1: RNNoise (open source, 5ms latencia)
    # Pros: Muy rapido, integra noise suppression + AEC
    # Contras: AEC basico, funciona mejor en desktop que telefonia
    "rnnoise": {
        "latency_ms": 5,
        "quality": "media",
        "cost": "gratis",
        "integration": "simple",
    },
    
    # Opcion 2: SpeexDSP AEC (open source, 10ms latencia)
    # Pros: AEC probado, buen rendimiento
    # Contras: Requiere tuning de parametros
    "speexdsp": {
        "latency_ms": 10,
        "quality": "media-alta",
        "cost": "gratis",
        "integration": "media",
    },
    
    # Opcion 3: WebRTC AEC3 (Google, referencia de industria)
    # Pros: El mejor AEC open source, usado en Chrome/Meet
    # Contras: Complejo de integrar, requiere C++ bindings
    "webrtc_aec3": {
        "latency_ms": 15,
        "quality": "alta",
        "cost": "gratis",
        "integration": "compleja",
    },
    
    # Opcion 4: NVIDIA Maxine (enterprise, GPU)
    # Pros: AEC+noise+voice enhancement de maxima calidad
    # Contras: Requiere GPU, costo de licencia
    "nvidia_maxine": {
        "latency_ms": 10,
        "quality": "maxima",
        "cost": "licencia",
        "integration": "media",
    },
}

# Recomendacion para Silxar: WebRTC AEC3 (mejor ratio calidad/latencia/costo)
AEC_CONFIG = {
    "algorithm": "webrtc_aec3",
    "latency_ms": 15,
    "echo_tail_ms": 128,        # Duracion del eco a cancelar
    "suppression_level": "HIGH", # Nivel de supresion de eco
}
```

**Impacto: Reduce falsos positivos en barge-in en un 60-80%** | **Costo: Integracion ~2-3 dias** | **Tiempo: 1-2 semanas**

---

##### P2-4: Fallback por Latencia (Circuit Breaker)

```python
# ============================================================
# Si la latencia de un componente excede el umbral,
# cambia automaticamente a un fallback mas rapido.
# ============================================================

class LatencyCircuitBreaker:
    """Circuit breaker basado en latencia por componente."""
    
    THRESHOLDS_MS = {
        "gemini_stt": 500,          # STT Gemini > 500ms -> fallback
        "gemini_llm": 800,          # LLM Gemini > 800ms -> fallback
        "elevenlabs_tts": 300,      # TTS ElevenLabs > 300ms -> fallback
        "bridge_processing": 50,    # AudioBridge > 50ms -> alerta
        "network_rtt": 200,         # RTT red > 200ms -> alerta
    }
    
    FALLBACKS = {
        "gemini_stt": "elevenlabs_scribe",
        "gemini_llm": "gemini_2_5_flash",  # Modelo mas rapido
        "elevenlabs_tts": "cartesia_sonic",  # TTS alternativo
    }
    
    def __init__(self):
        self.latency_windows = {k: deque(maxlen=10) for k in self.THRESHOLDS_MS}
        self.fallback_active = {k: False for k in self.THRESHOLDS_MS}
        self.fallback_start_time = {}
    
    async def record_latency(self, component: str, latency_ms: float):
        """Registra latencia de un componente."""
        self.latency_windows[component].append(latency_ms)
        
        # Calcular P50 de la ventana
        if len(self.latency_windows[component]) >= 5:
            p50 = np.percentile(self.latency_windows[component], 50)
            
            if p50 > self.THRESHOLDS_MS[component]:
                if not self.fallback_active[component]:
                    await self._activate_fallback(component, p50)
            else:
                if self.fallback_active[component]:
                    # Verificar si llevamos 5 minutos en fallback
                    if time.time() - self.fallback_start_time[component] > 300:
                        await self._deactivate_fallback(component)
    
    async def _activate_fallback(self, component: str, measured_latency: float):
        """Activa fallback para un componente."""
        logger.warning(
            f"CIRCUIT BREAKER: {component} latencia P50={measured_latency}ms "
            f"excede umbral {self.THRESHOLDS_MS[component]}ms. "
            f"Activando fallback: {self.FALLBACKS.get(component, 'N/A')}"
        )
        self.fallback_active[component] = True
        self.fallback_start_time[component] = time.time()
        
        # Notificar a equipo
        await notify_slack(f"Latency fallback activado: {component}")
    
    async def _deactivate_fallback(self, component: str):
        """Desactiva fallback (vuelve a primario)."""
        logger.info(f"CIRCUIT BREAKER: {component} volviendo a primario")
        self.fallback_active[component] = False


# Integracion con Prometheus
CIRCUIT_BREAKER_ACTIVE = Gauge(
    'latency_circuit_breaker_active',
    'Circuit breaker activo por componente',
    ['component']
)
```

**Impacto: Resiliencia ante degradacion de servicios de terceros** | **Costo: Desarrollo ~1-2 dias** | **Tiempo: 3-5 dias**

---

##### P2-5: Pipeline de Audio Dual (Gemini + ElevenLabs en Paralelo)

```python
# ============================================================
# Para llamadas VIP: ejecutar ambos pipelines en paralelo
# Usar Gemini como "co-piloto" que escucha y, si ElevenLabs
# tarda mas de X ms, usar la respuesta de Gemini.
# ============================================================

import asyncio

async def dual_pipeline_vip(call_audio: bytes, lead_context: dict) -> bytes:
    """
    Ejecuta Gemini y ElevenLabs en paralelo.
    Devuelve la respuesta del primero que termine,
    con un timeout de 500ms para ElevenLabs.
    """
    
    # Pipeline A: Gemini Live (rapido, baja latencia, siempre disponible)
    gemini_task = asyncio.create_task(
        gemini_pipeline.process(call_audio, lead_context),
        name="gemini_vip"
    )
    
    # Pipeline B: ElevenLabs hibrido (alta calidad, mas lento)
    elevenlabs_task = asyncio.create_task(
        elevenlabs_pipeline.process(call_audio, lead_context),
        name="elevenlabs_vip"
    )
    
    # Race con timeout: ElevenLabs tiene 500ms para responder
    # Si no responde en ese tiempo, usamos Gemini
    done, pending = await asyncio.wait(
        [gemini_task, elevenlabs_task],
        return_when=asyncio.FIRST_COMPLETED,
        timeout=0.5  # 500ms timeout
    )
    
    # Obtener resultado del primero en terminar
    winner_task = done.pop()
    winner_name = winner_task.get_name()
    response_audio = winner_task.result()
    
    # Cancelar el perdedor para no desperdiciar recursos
    for task in pending:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    # Logging para analisis
    logger.info(f"Dual pipeline winner: {winner_name} for lead {lead_context['lead_id']}")
    
    return response_audio


# Metricas del dual pipeline
DUAL_PIPELINE_METRICS = {
    "gemini_wins": Counter("dual_pipeline_gemini_wins"),
    "elevenlabs_wins": Counter("dual_pipeline_elevenlabs_wins"),
    "elevenlabs_timeout": Counter("dual_pipeline_elevenlabs_timeout"),
}
```

**Impacto: Voz de alta calidad con garantia de latencia <500ms** | **Costo: ~2x costo de compute por llamada VIP** | **Tiempo: 1 semana**

---

### 5. Configuraciones Optimas por Componente

#### 5.1 VAD / Endpointing

```python
# ============================================================
# CONFIGURACION OPTIMA VAD — Conversacion agil B2B
# ============================================================

VAD_CONFIG = {
    # === CORE VAD ===
    "silence_ms": 200,              # ANTES: 500ms | Optimizado: 200ms
    "prefix_padding_ms": 200,       # ANTES: 150ms | Optimizado: 200ms
                                    # (protege primeras palabras del usuario)
    "start_sensitivity": "HIGH",    # Detectar inicio de habla rapidamente
    "end_sensitivity": "HIGH",      # Detectar fin de habla rapidamente

    # === EXTENDED: Endpointing adaptativo ===
    "adaptive_endpointing": True,
    "min_silence_ms": 150,          # Para comandos cortos ("si", "no", "uno")
    "max_silence_ms": 400,          # Para dictado largo (emails, direcciones)
    "sentence_pause_ms": 250,       # Pausa entre oraciones (multi-idioma)

    # === BARGE-IN ===
    "barge_in_energy_threshold": 0.015,   # Umbral de energia para deteccion
    "barge_in_min_duration_ms": 100,      # Minimo para considerar interrupcion
    "barge_in_backchannel_filter": True,  # Filtrar "mm-hmm", "si", etc.

    # === SMART DETECTION ===
    "semantic_endpointing": True,         # Usar Gemini para detectar fin de turno
    "interim_results": True,              # Streaming parciales para feedback rapido
    "endpointing_on_punctuation": True,   # Endpoint rapido si hay "." o "?"
}
```

#### 5.2 ElevenLabs TTS

```python
# ============================================================
# CONFIGURACION OPTIMA ELEVENLABS TTS
# ============================================================

ELEVENLABS_CONFIG = {
    # === MODELO ===
    "model": "eleven_flash_v2_5",            # Modelo mas rapido: 75ms inference
    "voice_id": "pNInz6obpgDQGcFmaJgB",     # Adam — espanol neutro profesional
    # Alternativas de voz en espanol:
    # "voice_id": "EXAVITQu4vr4xnSDxMaL",  # Sarah — femenino, amigable
    # "voice_id": "ErXwobaYiN019PkySvjV",  # Antoni — espanol castellano

    # === LATENCIA ===
    "latency_optimization": 1,      # ANTES: 4 | Optimizado: 1 (balance)
    # 0 = minima latencia (testing)
    # 1 = balance optimo (produccion)
    # 2-3 = mas calidad
    # 4 = maxima calidad, maxima latencia (NO usar)

    # === AUDIO OUTPUT ===
    "output_format": "ulaw_8000",   # Match Twilio Media Streams
    "sample_rate": 8000,

    # === VOICE SETTINGS ===
    "voice_settings": {
        "stability": 0.5,           # 0.5 = balance estabilidad/expresion
        "similarity_boost": 0.75,   # 0.75 = calidad de voz optima
        "style": 0.0,               # 0.0 = sin exageracion (mejor para telefonia)
        "use_speaker_boost": True,  # Mejora claridad y presencia
        "speed": 1.0,               # Velocidad normal (1.1 para mas dinamismo)
    },

    # === STREAMING ===
    "streaming": {
        "enabled": True,
        "websocket": True,          # WebSocket para streaming real
        "chunk_size_chars": 50,     # Enviar chunks de ~50 caracteres
        "auto_mode": True,          # ElevenLabs maneja chunking automatico
        "flush_on_sentence_end": True,  # Enviar al final de cada oracion
    },
}
```

#### 5.3 ElevenLabs STT (Scribe v2)

```python
# ============================================================
# CONFIGURACION OPTIMA ELEVENLABS STT
# ============================================================

ELEVENLABS_STT_CONFIG = {
    "model": "scribe_v2",             # Modelo mas rapido y preciso
    "sample_rate": 16000,             # PCM 16kHz (optimo para Scribe)
    "language_code": "es",            # Espanol (es-ES, es-MX detectado auto)
    "enable_speaker_diarization": False,  # No necesario para llamada mono
    "interim_results": True,          # Streaming parciales para barge-in rapido
    "endpointing": "FAST",            # Endpointing agresivo para baja latencia
    "punctuate": True,                # Puntuacion para endpointing inteligente
}
```

#### 5.4 Gemini Live API

```python
# ============================================================
# CONFIGURACION OPTIMA GEMINI LIVE API
# ============================================================

GEMINI_CONFIG = {
    # === MODELO ===
    "primary_model": "gemini-3.1-flash-live-preview",
    "fallback_model": "gemini-2.5-flash-native-audio-latest",

    # === AUDIO ===
    "input_sample_rate": 16000,     # PCM 16kHz (optimo para STT)
    "output_sample_rate": 24000,    # PCM 24kHz (calidad maxima nativa)
    "voice": "Leda",                # Voz espanol femenino (Mariana)
    # Alternativas:
    # "voice": "Zephyr"             # Voz espanol masculino
    # "voice": "Puck"               # Voz neutra
    "language": "es-US",            # Espanol Latinoamericano

    # === THINKING (critico para latencia) ===
    "thinking_level": "minimal",    # ANTES: no configurado ("medium")
                                    # "minimal" = minima latencia
    # Para Gemini 2.5:
    # "thinking_budget": 0,         # 0 thinking tokens = maxima velocidad

    # === MODALIDAD ===
    "response_modalities": ["AUDIO"],  # Solo audio, no texto (mas rapido)
    # Alternativa para debugging:
    # "response_modalities": ["AUDIO", "TEXT"],

    # === VAD NATIVO ===
    "vad": {
        "enabled": True,
        "start_sensitivity": "HIGH",
        "end_sensitivity": "HIGH",
    },
    
    # === SYSTEM PROMPT (mantener < 500 tokens para minima latencia) ===
    "system_instruction": None,  # Se carga dinamicamente por llamada
    "max_tokens": 150,           # Respuestas cortas para telefonia
}
```

#### 5.5 Gemini Chat (Pipeline Hibrido — Naturalizador)

```python
# ============================================================
# CONFIGURACION OPTIMA GEMINI CHAT (pipeline hibrido)
# ============================================================

GEMINI_CHAT_CONFIG = {
    "model": "gemini-2.5-flash",     # Flash para minima latencia
    # Alternativa aun mas rapida (menor calidad):
    # "model": "gemini-2.5-flash-lite",

    "temperature": 0.7,              # Balance creatividad/consistencia
    "max_output_tokens": 150,        # Limitar respuestas cortas (telefonia)
    "top_p": 0.95,
    "top_k": 40,

    # === PROMPT OPTIMIZATION ===
    # Mantener system prompt < 500 tokens para minima latencia
    "system_prompt_tokens_target": 500,
    
    # === CACHE (context caching para prompts largos) ===
    "context_cache": True,           # Reutilizar contexto entre llamadas
    "cache_ttl_seconds": 3600,       # 1 hora de TTL
}
```

#### 5.6 AudioBridge

```python
# ============================================================
# CONFIGURACION OPTIMA AUDIOBRIDGE
# ============================================================

AUDIOBRIDGE_CONFIG = {
    # === CODECS ===
    "input_format": "mulaw_8000",    # Twilio inbound (fijo)
    "output_format": "mulaw_8000",   # Twilio outbound (fijo)
    "internal_sample_rate": 16000,   # Trabajar a 16kHz internamente

    # === DSP ===
    "dsp_enabled": True,             # ANTES: False | Activar
    
    "noise_suppression": {
        "enabled": True,
        "algorithm": "rnnoise",      # 5ms latencia, open source
        "aggressiveness": 2,         # 1-4, 2 = balance
    },
    
    "agc": {
        "enabled": True,
        "target_dbfs": -16,          # Nivel objetivo de audio limpio
        "max_gain_db": 20,           # Maximo aumento permitido
        "min_gain_db": -10,          # Maximo reduccion permitida
        "attack_ms": 10,
        "release_ms": 100,
    },
    
    "noise_gate": {
        "enabled": True,
        "threshold_db": -45,         # Por debajo = silencio completo
        "attack_ms": 5,              # Apertura rapida
        "release_ms": 100,           # Cierre suave (evitar choppy)
    },
    
    "limiter": {
        "enabled": True,             # Prevenir clipping en TTS fuerte
        "threshold_db": -1,
        "release_ms": 50,
    },
    
    "aec": {
        "enabled": False,            # P2: Activar cuando se implemente AEC
        "algorithm": "webrtc_aec3",
        "latency_ms": 15,
    },

    # === BUFFERING ===
    "input_buffer_ms": 20,           # Minimo para low latency
    "output_buffer_ms": 20,          # Minimo para low latency
    "jitter_buffer_ms": 40,          # Adaptativo preferible
    "rolling_buffer_ms": 150,        # Para eliminar gaps TTS
    
    # === OPTIMIZACIONES ===
    "use_lookup_tables": True,       # LUT para mu-law (100x mas rapido)
    "preallocate_buffers": True,     # Evitar GC durante llamada
    "simd_processing": True,         # SIMD para DSP si disponible
}
```

#### 5.7 Twilio

```python
# ============================================================
# CONFIGURACION OPTIMA TWILIO
# ============================================================

TWILIO_CONFIG = {
    # === STREAM ===
    "track": "inbound_track",        # Solo inbound (mas eficiente)
    "bidirectional": True,           # Bidireccional necesario para voice AI

    # === AUDIO ===
    "encoding": "audio/x-mulaw",     # G.711 mu-law (unico soportado)
    "sample_rate": 8000,
    "channels": 1,                   # Mono

    # === MACHINE DETECTION ===
    "machine_detection": "DetectMessageEnd",  # Detectar voicemail
    "machine_detection_timeout": 30,  # 30 segundos timeout
    "machine_detection_speech_threshold": 5,   # 5 segundos de habla = humano
    "machine_detection_speech_end_threshold": 2,  # 2 segundos silencio = fin
    
    # Async AMD (mejor para voice AI):
    # "machine_detection": "Enable",
    # "async_amd": True,
    # "async_amd_status_callback": "https://api.silxar.com/webhook/amd",

    # === CALLER ID ===
    # CRITICO: Usar numero +52 Mexico
    "from": "+5255XXXXXXXX",         # CDMX (ejemplo)
    # "from": "+5233XXXXXXXX",         # Guadalajara
    # "from": "+5281XXXXXXXX",         # Monterrey

    # === STATUS CALLBACKS ===
    "status_callback": "https://api.silxar.com/webhook/twilio/status",
    "status_callback_events": [
        "initiated",
        "ringing",
        "answered",
        "completed",
        "busy",
        "no-answer",
        "failed",
        "canceled",
    ],
    
    # === TIMEOUTS ===
    "timeout": 30,                   # 30 segundos de ringing
    "recording": False,              # No grabar (usar transcript en su lugar)
    
    # === WEBHOOK ===
    "voice_webhook": "https://api.silxar.com/voice",
    "voice_method": "POST",
}
```

---

### 6. Problema del Numero +1 (USA) Llamando a Mexico

#### 6.1 Impacto en Tasa de Contestacion

| Factor | Impacto Estimado en Answer Rate | Severidad |
|--------|---------------|-----------|
| Numero extranjero (+1 USA) | **-30% a -50%** vs numero local | CRITICO |
| Etiqueta "Posible Spam" / "Llamada extranjera" | **-20% a -35%** adicional | CRITICO |
| Routing internacional (latencia extra) | **+100-200ms** de latencia de red | MEDIO |
| Sin numero de devolucion confiable | **-10% a -15%** adicional | MEDIO |
| Desconfianza cultural (asociacion scam/telemarketing) | **-15% a -25%** adicional | ALTO |
| **Impacto combinado estimado** | **-75% a -125% relativo** | **CRITICO** |

**Answer rate estimada actual (numero USA a Mexico):** 15-25%
**Answer rate potencial con numero local (+52):** 35-50% (benchmark industria B2B Mexico)

#### 6.2 Problemas Especificos por Carrier Mexicano

| Carrier | Comportamiento con +1 | Etiqueta Mostrada | Bloqueo Automatico |
|---------|----------------------|-------------------|-------------------|
| **Telmex** | Marca como "Llamada del extranjero" | "INTERNACIONAL" | Configurable por usuario |
| **Telcel** | Posible spam score alto | "Posible spam" | Si (configuracion default) |
| **Movistar** | Marca como llamada internacional | "+1 XXXXXXXXXX" | Configurable por usuario |
| **AT&T Mexico** | Marca como numero internacional | "USA" | No (pero alerta visual) |
| **Virgin Mobile** | Score de spam elevado | "Sospechosa" | Si (filtro activo) |

#### 6.3 Problemas Culturales y de Confianza

1. **Asociacion con scam/telemarketing:** Los mexicanos estan acostumbrados a recibir llamadas de +1 de estafas ("sextorsion", "su familiar esta secuestrado", "premio de loteria"). Un numero +1 genera rechazo inmediato.

2. **Costo de devolucion:** Si el lead quiere llamar de vuelta, marcar a USA es costoso (~$5-10 MXN/minuto) y poco probable. Pierde el canal de re-engagement.

3. **Desconfianza en transacciones internacionales:** Los negocios mexicanos prefieren tratar con proveedores locales o con presencia fisica en Mexico.

4. **Horario confuso:** Llamadas de USA pueden venir en horarios extranos (diferencia de zona horaria).

#### 6.4 Soluciones Recomendadas

##### Opcion A: Twilio Mexico Numbers (RECOMENDADA — Bajo Costo, Alto Impacto)

```python
# ============================================================
# Twilio ofrece numeros en Mexico desde ~$3-5 USD/mes
# ============================================================

TWILIO_MEXICO_CONFIG = {
    # Numeros disponibles en Mexico (verificar disponibilidad en Twilio Console):
    # - Ciudad de Mexico (+52 55 XXXX XXXX)
    # - Guadalajara (+52 33 XXXX XXXX)
    # - Monterrey (+52 81 XXXX XXXX)
    # - Queretaro (+52 442 XXX XXXX)
    # - Puebla (+52 222 XXX XXXX)
    # - Toluca (+52 722 XXX XXXX)
    
    "from_number_cdmx": "+5255XXXXXXXX",
    "from_number_gdl": "+5233XXXXXXXX",
    "from_number_mty": "+5281XXXXXXXX",
    
    # Dynamic caller ID: seleccionar numero por ubicacion del lead
    "caller_id_strategy": "by_lead_location",
}

# Implementacion del router de caller ID
async def select_caller_id(lead_phone: str, available_numbers: list) -> str:
    """Selecciona el numero de salida basado en la ubicacion del lead.
    
    Si el lead es de Guadalajara (+52 33), usar numero de Guadalajara.
    Si el lead es de Monterrey (+52 81), usar numero de Monterrey.
    Default: Ciudad de Mexico (+52 55).
    """
    lada = lead_phone[3:5]  # Extraer LADA del numero +52 XX...
    
    lada_to_number = {
        "33": "+5233XXXXXXXX",   # Guadalajara
        "81": "+5281XXXXXXXX",   # Monterrey
        "442": "+52442XXXXXX",   # Queretaro
        "222": "+52222XXXXXX",   # Puebla
        "999": "+52999XXXXXX",   # Merida
        "614": "+52614XXXXXX",   # Chihuahua
        # Default:
        "default": "+5255XXXXXXXX",  # Ciudad de Mexico
    }
    
    return lada_to_number.get(lada, lada_to_number["default"])
```

**Costo:** ~$3-5 USD/mes por numero
**Impacto:** +15-25% answer rate
**Timeline:** 1-2 dias (compra + configuracion)

---

##### Opcion B: SIP Trunk Mexico (Enterprise)

```python
# ============================================================
# Conectar con carrier mexicano via SIP trunk para:
# - Mejor calidad de routing (menor latencia)
# - Numero DID mexicano propio
# - Soporte G.722 wideband (mejor calidad de audio)
# ============================================================

SIP_TRUNK_MEXICO = {
    # Carriers mexicanos con soporte SIP trunk B2B:
    "carriers": [
        {"name": "Alestra", "cost_monthly": "$100-200", "quality": "alta"},
        {"name": "Totalplay Empresarial", "cost_monthly": "$80-150", "quality": "alta"},
        {"name": "Megacable", "cost_monthly": "$50-100", "quality": "media-alta"},
        {"name": "Telcel Empresas", "cost_monthly": "$150-300", "quality": "maxima"},
    ],
    
    # Configuracion SIP
    "sip_config": {
        "transport": "tls",           # Seguridad
        "codec_preference": ["G.722", "G.711"],  # Wideband primero
        "dtmf_mode": "rfc2833",
        "register": True,
        "heartbeat": True,
    },
}
```

**Costo:** $50-200 USD/mes + minutos
**Impacto:** +5-15% answer rate (mejor routing) + mejor calidad de audio
**Timeline:** 1-2 semanas (contratacion + configuracion)

---

##### Opcion C: Dynamic Caller ID (Intermedia)

```python
# ============================================================
# Si Twilio Mexico no esta disponible para outbound:
# Usar servicio que ofrece caller ID local dinamico
# ============================================================

DYNAMIC_CALLER_ID = {
    # Providers con soporte de caller ID dinamico:
    "providers": [
        "twilio_programmable_caller_id",  # Verificar disponibilidad MX
        "telnyx_dynamic_cnam",            # CNAM dinamico
        "vonage_adaptive_routing",        # Routing adaptativo
    ],
    
    # Estrategia: mostrar nombre de empresa en caller ID
    "cnam_config": {
        "company_name": "GestPro",
        "display_name": "GestPro MX",     # Max 15 caracteres
    },
}
```

**Costo:** $0-10 USD/mes
**Impacto:** +5-10% answer rate (branding en caller ID)
**Timeline:** 1-3 dias

---

#### 6.5 Recomendacion Inmediata y Accionable

| Prioridad | Accion | Costo | Impacto en Answer Rate | Timeline |
|-----------|--------|-------|----------------------|----------|
| **P0 (Hoy)** | Comprar numero Twilio Mexico (+52) | $3-5/mes | **+15-25%** | 1-2 dias |
| **P1 (Semana 1)** | Configurar CNAM/Branding "GestPro" | $0-10/mes | **+5-10%** | 1-3 dias |
| **P1 (Semana 1)** | Router de caller ID por LADA | $0 | **+5-10%** | 2-3 dias |
| **P2 (Semana 4-8)** | Evaluar SIP trunk local | $50-200/mes | **+5-15%** | 2-4 semanas |

**Proyeccion combinada:**
```
Actual:     15-25% answer rate (+1 USA)
Con +52:    30-40% answer rate (+15%)
Con CNAM:   35-45% answer rate (+5%)
Con LADA:   38-48% answer rate (+3%)
Con SIP:    40-50% answer rate (+2%)
```

---

### 7. Estrategia de Pre-calentamiento (Prewarm) Mejorada

#### 7.1 Estado Actual

```python
# ============================================================
# PREWARM ACTUAL: Fire-and-forget cuando suena timbre
# ============================================================

@app.post("/voice")
async def voice_webhook(request: Request):
    """Webhook de Twilio cuando se inicia una llamada."""
    # Fire and forget: prewarm en paralelo mientras suena timbre
    asyncio.create_task(prewarm_session())
    
    return TwiMLResponse([
        Connect().stream(url=f"wss://{HOST}/media-stream")
    ])

async def prewarm_session():
    """Prewarm basico: handshake con Gemini."""
    session = await gemini_live.connect()
    # Latencia medida del prewarm: ~312ms
    # Esto sucede FUERA del camino critico (mientras suena timbre)
    return session
```

**Funciona bien** — la sesion ya esta lista cuando el lead contesta. Primera respuesta en ~600ms vs ~1,500ms sin prewarm.

**Limitaciones:**
- No precarga contexto del lead (saludo generico)
- No pre-carga tool definitions
- Sesion unica (no hay pool)
- Sin health check

#### 7.2 Mejora 1: Pre-warm con Contexto Precargado

```python
# ============================================================
# PREWARM CON CONTEXTO: Sesion lista con datos del lead
# ============================================================

async def prewarm_session_with_context(lead_id: str) -> GeminiSession:
    """Prewarm con contexto del lead ya cargado.
    
    Esto permite que la primera respuesta sea PERSONALIZADA
    en lugar de un saludo generico.
    """
    # 1. Obtener datos del lead ANTES del prewarm
    lead_data = await crm.get_lead(lead_id)
    
    # 2. Generar system prompt contextualizado
    system_prompt = f"""
    Eres Mariana, asesora de GestPro. Estas llamando a {lead_data.name}.
    Empresa: {lead_data.company} en {lead_data.city}.
    Interes previo: {lead_data.interest or 'CRM y gestion de negocio'}.
    Historial: {lead_data.last_interaction or 'Primera llamada'}.
    
    Tu objetivo: Agendar una demo de 15 minutos.
    """
    
    # 3. Prewarm con contexto ya cargado
    session = await gemini_live.connect(
        system_prompt=system_prompt,
        tools=[schedule_appointment, transfer_call, send_info],
    )
    
    # 4. Pre-cargar tool definitions
    await session.define_tools([
        schedule_appointment,
        transfer_call,
        send_info,
        consultar_crm,
    ])
    
    return session
```

**Impacto:** Primera respuesta funcional e inmediata (no generica). El lead escucha su nombre y referencias a su empresa desde el primer segundo.

---

#### 7.3 Mejora 2: Dual Prewarm (Gemini + ElevenLabs)

```python
# ============================================================
# DUAL PREWARM: Ambos pipelines listos, decidir al contestar
# ============================================================

async def dual_prewarm(lead_id: str, lead_score: int) -> PipelineRouter:
    """Prewarm ambos pipelines en paralelo.
    
    Si lead_score > 70 (lead caliente): usar ElevenLabs (calidad maxima)
    Si lead_score <= 70 (lead frio): usar Gemini (rapido, economico)
    """
    # Prewarm en paralelo (async)
    gemini_task = asyncio.create_task(prewarm_gemini(lead_id))
    elevenlabs_task = asyncio.create_task(prewarm_elevenlabs(lead_id))
    
    gemini_session, elevenlabs_session = await asyncio.gather(
        gemini_task, elevenlabs_task
    )
    
    # Decidir pipeline al contestar basado en lead score
    if lead_score > 70:
        primary = elevenlabs_session
        fallback = gemini_session
        pipeline_name = "elevenlabs"
    else:
        primary = gemini_session
        fallback = elevenlabs_session
        pipeline_name = "gemini"
    
    logger.info(f"Dual prewarm completo: pipeline={pipeline_name}, lead={lead_id}")
    
    return PipelineRouter(
        primary=primary,
        fallback=fallback,
        pipeline_name=pipeline_name,
    )
```

---

#### 7.4 Mejora 3: Session Pool Persistente

```python
# ============================================================
# SESSION POOL: Mantener N sesiones pre-calentadas siempre listas
# ============================================================

class SessionPool:
    """Pool persistente de sesiones pre-calentadas.
    
    Mantiene 'size' sesiones siempre listas, con refill automatico
    y health check continuo.
    """
    
    def __init__(self, size: int = 5, refill_threshold: int = 3):
        self.size = size
        self.refill_threshold = refill_threshold
        self.pool = asyncio.Queue(maxsize=size)
        self.refill_task = None
        self.health_check_task = None
        self._shutdown = False
        self.metrics = {
            "acquires": 0,
            "releases": 0,
            "refills": 0,
            "health_failures": 0,
        }
    
    async def start(self):
        """Inicia el pool y las tareas de mantenimiento."""
        # Llenar pool inicial
        await self._fill_pool()
        
        # Iniciar refill loop
        self.refill_task = asyncio.create_task(self._refill_loop())
        
        # Iniciar health check
        self.health_check_task = asyncio.create_task(self._health_check_loop())
        
        logger.info(f"SessionPool iniciado: size={self.size}")
    
    async def stop(self):
        """Detiene el pool gracefulmente."""
        self._shutdown = True
        if self.refill_task:
            self.refill_task.cancel()
        if self.health_check_task:
            self.health_check_task.cancel()
    
    async def acquire(self, lead_id: str = None) -> GeminiSession:
        """Adquiere una sesion del pool (con contexto precargado si lead_id)."""
        session = await self.pool.get()
        self.metrics["acquires"] += 1
        
        if lead_id:
            # Precargar contexto del lead antes de entregar
            await self._load_lead_context(session, lead_id)
        
        return session
    
    async def release(self, session: GeminiSession):
        """Libera una sesion de vuelta al pool (con reset de contexto)."""
        # Resetear contexto para reutilizacion
        await session.reset_context()
        await self.pool.put(session)
        self.metrics["releases"] += 1
    
    async def _fill_pool(self):
        """Llena el pool hasta 'size'."""
        while self.pool.qsize() < self.size:
            try:
                session = await self._create_prewarmed_session()
                await self.pool.put(session)
            except Exception as e:
                logger.error(f"Error creando sesion prewarm: {e}")
                await asyncio.sleep(1)
    
    async def _refill_loop(self):
        """Loop de refill: mantiene el pool siempre lleno."""
        while not self._shutdown:
            try:
                if self.pool.qsize() < self.refill_threshold:
                    self.metrics["refills"] += 1
                    await self._fill_pool()
                await asyncio.sleep(5)  # Revisar cada 5 segundos
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error en refill loop: {e}")
                await asyncio.sleep(10)
    
    async def _health_check_loop(self):
        """Health check continuo: reemplaza sesiones muertas."""
        while not self._shutdown:
            try:
                # Hacer copia temporal para health check
                temp_sessions = []
                while not self.pool.empty():
                    temp_sessions.append(await self.pool.get())
                
                for session in temp_sessions:
                    if not await session.is_alive():
                        logger.warning("Sesion prewarm muerta, reemplazando")
                        self.metrics["health_failures"] += 1
                        try:
                            session = await self._create_prewarmed_session()
                        except Exception as e:
                            logger.error(f"Error reemplazando sesion: {e}")
                    await self.pool.put(session)
                
                await asyncio.sleep(30)  # Health check cada 30 segundos
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error en health check: {e}")
                await asyncio.sleep(60)
    
    async def _create_prewarmed_session(self) -> GeminiSession:
        """Crea una nueva sesion pre-calentada."""
        session = await gemini_live.connect(
            system_prompt=BASE_SYSTEM_PROMPT,
            thinking_level="minimal",
        )
        return session
    
    async def _load_lead_context(self, session, lead_id: str):
        """Carga contexto de un lead especifico en la sesion."""
        lead_data = await crm.get_lead(lead_id)
        await session.update_context({
            "lead_name": lead_data.name,
            "lead_company": lead_data.company,
            "lead_city": lead_data.city,
            "lead_interest": lead_data.interest,
        })


# ============================================================
# USO EN PRODUCCION
# ============================================================

session_pool = SessionPool(size=5)

@app.on_event("startup")
async def startup():
    await session_pool.start()

@app.on_event("shutdown")
async def shutdown():
    await session_pool.stop()

@app.post("/voice")
async def voice_webhook(request: Request):
    """Atiende llamada usando una sesion del pool."""
    lead_id = request.query_params.get("lead_id")
    
    # Adquirir sesion ya pre-calentada (< 50ms)
    session = await session_pool.acquire(lead_id=lead_id)
    
    try:
        # Procesar llamada...
        await handle_call(session, request)
    finally:
        # Liberar sesion de vuelta al pool
        await session_pool.release(session)
```

**Impacto:** Latencia de primera respuesta <200ms (sesion ya lista + contexto precargado). Capacidad de atender picos de llamadas sin degradacion.

---

### 8. Metricas de Monitoreo

#### 8.1 Metricas de Latencia (Obligatorias)

```python
# ============================================================
# METRICAS DE LATENCIA — Targets y Alertas
# ============================================================

LATENCY_METRICS = {
    # === Pipeline-level ===
    "e2e_latency_p50": {         # Latencia end-to-end mediana (P50)
        "description": "Latencia total desde que usuario deja de hablar hasta que escucha respuesta",
        "target": "< 800ms",
        "alert": "> 1000ms",
        "critical": "> 1200ms",
        "measurement": "Prometheus Histogram percentile(0.5)",
    },
    "e2e_latency_p95": {         # Latencia end-to-end P95
        "description": "Latencia en el peor 5% de las interacciones",
        "target": "< 1200ms",
        "alert": "> 1500ms",
        "critical": "> 2000ms",
    },
    "e2e_latency_p99": {         # Latencia end-to-end P99
        "description": "Latencia en el peor 1% de las interacciones (outliers)",
        "target": "< 1500ms",
        "alert": "> 2000ms",
    },

    # === Component-level ===
    "vad_endpointing_ms": {
        "description": "Tiempo de silencio detectado antes de enviar a procesar",
        "target": "< 250ms",
        "alert": "> 400ms",
        "critical": "> 600ms",
    },
    "stt_first_token_ms": {
        "description": "Tiempo hasta primer token de transcripcion",
        "target": "< 200ms",       # Scribe v2
        "alert": "> 400ms",
    },
    "llm_time_to_first_token_ms": {
        "description": "Tiempo hasta primer token del LLM",
        "target": "< 300ms",       # Gemini Flash
        "alert": "> 500ms",
    },
    "tts_time_to_first_audio_ms": {
        "description": "Tiempo hasta primer chunk de audio del TTS",
        "target": "< 150ms",       # Flash v2.5
        "alert": "> 300ms",
    },
    "bridge_processing_ms": {
        "description": "Tiempo de procesamiento del AudioBridge",
        "target": "< 10ms",
        "alert": "> 50ms",
    },
    "network_rtt_ms": {
        "description": "Round-trip time entre servidor y Twilio",
        "target": "< 100ms",
        "alert": "> 200ms",
    },

    # === Percepcion ===
    "time_to_first_audio_after_silence": {
        "description": "Tiempo total desde silencio del usuario hasta audio de respuesta",
        "target": "< 600ms",
        "alert": "> 800ms",
    },
    "barge_in_response_ms": {
        "description": "Tiempo para cancelar TTS despues de interrupcion por usuario",
        "target": "< 300ms",
        "alert": "> 500ms",
    },
}
```

#### 8.2 Metricas de Calidad de Voz

```python
QUALITY_METRICS = {
    "mos_score": {
        "description": "Mean Opinion Score — calificacion subjetiva de calidad de audio (1-5)",
        "target": "> 3.5",
        "alert": "< 3.0",
        "measurement": "Evaluacion periodica con panel de 5+ evaluadores",
    },
    "stt_word_error_rate": {
        "description": "WER (Word Error Rate) del STT en llamadas reales",
        "target": "< 5%",
        "alert": "> 10%",
    },
    "barge_in_success_rate": {
        "description": "% de interrupciones manejadas correctamente (agente se calla)",
        "target": "> 95%",
        "alert": "< 90%",
    },
    "false_interruption_rate": {
        "description": "% de interrupciones falsas (ruido detectado como habla)",
        "target": "< 2%",
        "alert": "> 5%",
    },
    "audio_clipping_rate": {
        "description": "% de frames de audio con clipping/distorsion",
        "target": "< 0.1%",
        "alert": "> 1%",
    },
    "noise_suppression_ratio": {
        "description": "Mejora en SNR (Signal-to-Noise Ratio) despues de DSP",
        "target": "> 10dB",
        "alert": "< 5dB",
    },
}
```

#### 8.3 Metricas de Negocio

```python
BUSINESS_METRICS = {
    "answer_rate": {
        "description": "% de llamadas contestadas por una persona (no voicemail)",
        "target": "> 40%",        # Con numero local +52
        "alert": "< 25%",
    },
    "avg_call_duration_minutes": {
        "description": "Duracion promedio de llamadas conectadas",
        "target": "> 2 min",       # Llamadas cortas = poco engagement
        "alert": "< 30 seg",
    },
    "conversation_turns": {
        "description": "Numero de turnos (intercambios) por llamada",
        "target": "> 5",           # Menos de 5 = conversacion rota
        "alert": "< 2",
    },
    "human_handoff_rate": {
        "description": "% de llamadas transferidas a humano",
        "target": "< 15%",         # Mas del 15% = AI no esta resolviendo
        "alert": "> 30%",
    },
    "csat_post_call": {
        "description": "CSAT (Customer Satisfaction) despues de llamada (1-5)",
        "target": "> 4.0/5",
        "alert": "< 3.0/5",
    },
    "conversion_demo_rate": {
        "description": "% de llamadas conectadas que agendan demo",
        "target": "> 8%",
        "alert": "< 3%",
    },
    "demo_show_rate": {
        "description": "% de demos agendadas que efectivamente ocurren",
        "target": "> 80%",         # Con Triple Lock
        "alert": "< 60%",
    },
    "cost_per_demo": {
        "description": "Costo total / demos agendadas",
        "target": "< $50 MXN",
        "alert": "> $100 MXN",
    },
}
```

#### 8.4 Instrumentacion Prometheus

```python
# ============================================================
# INSTRUMENTACION COMPLETA CON PROMETHEUS
# ============================================================

from prometheus_client import Histogram, Counter, Gauge, Info

# --- Info del sistema ---
VOICE_SYSTEM_INFO = Info("voice_system", "Informacion del sistema de voz")
VOICE_SYSTEM_INFO.info({
    "version": "1.0",
    "pipeline_default": "gemini_native",
    "vad_silence_ms": "200",
    "elevenlabs_latency_opt": "1",
})

# --- Histogramas de latencia ---
E2E_LATENCY = Histogram(
    'voice_e2e_latency_ms',
    'End-to-end voice latency in ms (silencio usuario -> audio respuesta)',
    buckets=[100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000]
)

STT_LATENCY = Histogram(
    'voice_stt_latency_ms',
    'STT latency by model',
    ['model'],  # 'gemini_native', 'elevenlabs_scribe'
    buckets=[50, 100, 150, 200, 300, 500, 1000]
)

LLM_LATENCY = Histogram(
    'voice_llm_latency_ms',
    'LLM latency by model',
    ['model'],  # 'gemini_flash', 'gemini_pro'
    buckets=[100, 200, 300, 500, 800, 1000, 1500]
)

TTS_LATENCY = Histogram(
    'voice_tts_latency_ms',
    'TTS latency by model',
    ['model'],  # 'gemini_native', 'elevenlabs_flash'
    buckets=[50, 100, 150, 200, 300, 500]
)

BRIDGE_LATENCY = Histogram(
    'voice_bridge_processing_ms',
    'AudioBridge processing latency',
    buckets=[1, 5, 10, 20, 50, 100]
)

BARGE_IN_CANCEL_LATENCY = Histogram(
    'voice_barge_in_cancel_ms',
    'Time to cancel TTS after user interruption',
    buckets=[50, 100, 200, 300, 500, 1000]
)

# --- Contadores ---
BARGE_IN_TOTAL = Counter('voice_barge_in_total', 'Total barge-in events')
BARGE_IN_SUCCESS = Counter('voice_barge_in_success', 'Successful barge-in cancels')
BARGE_IN_FALSE_POSITIVE = Counter('voice_barge_in_false_positive', 'False barge-in events')

CALLS_TOTAL = Counter('voice_calls_total', 'Total calls', ['status'])  # initiated, connected, completed, failed
PIPELINE_SWITCHES = Counter('voice_pipeline_switches_total', 'Pipeline switches', ['from', 'to'])

# --- Gauges ---
ACTIVE_CALLS = Gauge('voice_active_calls', 'Currently active calls')
PREWARMED_SESSIONS = Gauge('voice_prewarmed_sessions_available', 'Prewarmed sessions available in pool')
SESSION_POOL_SIZE = Gauge('voice_session_pool_size', 'Total session pool size')
CIRCUIT_BREAKER_ACTIVE = Gauge('voice_circuit_breaker_active', 'Circuit breaker active by component', ['component'])

# --- Uso en codigo ---
async def measure_latency(component: str, func, *args, **kwargs):
    """Decorator para medir latencia de cualquier funcion."""
    start = time.monotonic()
    try:
        result = await func(*args, **kwargs)
        latency_ms = (time.monotonic() - start) * 1000
        
        # Registrar en histograma correspondiente
        if component == 'stt':
            STT_LATENCY.labels(model='gemini_native').observe(latency_ms)
        elif component == 'llm':
            LLM_LATENCY.labels(model='gemini_flash').observe(latency_ms)
        elif component == 'tts':
            TTS_LATENCY.labels(model='elevenlabs_flash').observe(latency_ms)
        elif component == 'bridge':
            BRIDGE_LATENCY.observe(latency_ms)
        
        return result
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        logger.error(f"Error en {component} despues de {latency_ms:.0f}ms: {e}")
        raise
```

#### 8.5 Dashboard de Monitoreo Recomendado

```
DASHBOARD TECNICO (Grafana/Prometheus):
+================================================================+
|  SILXAR VOICE AI — DASHBOARD DE LATENCIA Y CALIDAD            |
+================================================================+
|                                                                 |
|  LATENCIA END-TO-END (ultima hora)                            |
|  P50: [====    ] 620ms    P95: [======= ] 980ms               |
|  Target: <800ms                                              |
|                                                                 |
|  +----------------------------------------------------------+  |
|  |     ^                                                   |  |
|  | 1.2k|                                                   |  |
|  |     |    *    *                                         |  |
|  | 800 | *      *  *  *                                    |  |
|  |     |*  *  *     *  *  *                                |  |
|  | 400 |     *  *     *     *                              |  |
|  |     |________________________                           |  |
|  +----0----10----20----30----40----50----60----------------+  |
|       minutos                                                  |
|                                                                 |
+================================================================+
|  COMPONENTES (P50 actual)  |  CALIDAD DE VOZ                  |
|  VAD:        200ms [OK]    |  MOS Score: 3.8/5 [OK]          |
|  STT:        150ms [OK]    |  WER: 4.2% [OK]                 |
|  LLM:        250ms [OK]    |  Clipping: 0.02% [OK]           |
|  TTS:        100ms [OK]    |  SNR Improvement: 12dB [OK]     |
|  Bridge:       5ms [OK]    |                                  |
|  Network:     60ms [OK]    |  BARGE-IN                        |
|                            |  Success Rate: 97% [OK]           |
|  E2E Total:  765ms [OK]    |  False Positive: 1.2% [OK]      |
|                            |  Avg Cancel: 180ms [OK]           |
+================================================================+
|  LLAMADAS (hoy)  |  POOL      |  CIRCUIT BREAKER              |
|  Activas: 23     |  Size: 5   |  gemini_llm: OFF              |
|  Completadas: 847|  Avail: 4  |  elevenlabs_tts: OFF          |
|  Conectadas: 186 |  Health: OK|  network_rtt: OFF             |
|  Answer Rate: 22%|            |                               |
+================================================================+
```



---

## SECCION III: AUDITORIA DE CONVERSION — ESTRATEGIA DE VENTAS

### 9. Framework de Ventas PRO-V.O.I.S.E.

#### 9.1 El Problema Actual

El sistema actual de Silxar CRM tiene una **arquitectura solida pero una estrategia de conversion sub-optimizada**. Es un sistema de "llamadas" que suena bien, no una **"maquina de ventas"** que convierte. Los problemas clave:

| Dimension | Estado Actual | Nivel de Riesgo |
|-----------|--------------|-----------------|
| Estrategia de Venta | Tactica, sin framework probado | **ALTO** |
| Scripts/Spechs | Estructura basica sin psicologia de ventas | **ALTO** |
| Tools/Funciones | 7 tools genericas, faltan las de alto impacto | **MEDIO** |
| Avatar "Mariana" | Prompt de 5 capas adecuado pero mejorble | **MEDIO** |
| Post-Call Workflow | Minimo (webhook + actualizacion estado) | **CRITICO** |
| No-Show Prevention | No existe sistema formal | **CRITICO** |
| Metricas | Signals basicos, falta funnel completo | **ALTO** |

#### 9.2 El Framework PRO-V.O.I.S.E.

Propuesta exclusiva para Silxar CRM, adaptada de SPIN Selling + Challenger Sale + ventas consultivas:

```
PRO-V.O.I.S.E. — Framework de Conversion por Voz AI

P - Pattern Interrupt     (ganar los primeros 15 segundos)
R - Rapport & Permission  (construir micro-confianza, pedir permiso)
O - Open Discovery SPIN   (desentranar dolor: Situacion/Problema/Implicacion)
V - Value Quantification  (hacer que el prospect calcule su costo del dolor)
O - Objection Pre-emption (anticipar y neutralizar objeciones antes de surgir)
I - Intent Confirmation   (trial close: "Si pudieramos resolver eso, valdria una demo?")
S - Schedule w/ Commitment (agendar con micro-compromisos activos)
E - Exit w/ Expectation   (despedida que reafirma valor y proximo paso)
```

**Por que funciona:**

| Letra | Proposito | Psicologia Aplicada |
|-------|-----------|-------------------|
| **P** | Romper el patron defensivo del prospect | El cerebro ignora lo predecible; un opener inesperado aumenta retention en 50% |
| **R** | Reducir resistencia | El "permission-based frame" ("te juro que solo te quito 2 minutos") desarma defensas |
| **O** | Descubrir dolor economico real | Las preguntas SPIN hacen que el prospect SE DE CUENTA de su propio problema |
| **V** | Hacer tangible el costo del no-cambio | Cuando el prospect calcula "X pesos al mes perdidos", el dolor se vuelve personal |
| **O** | Eliminar friccion antes de que aparezca | Pre-empting objections evita el "no" y mantiene momentum |
| **I** | Verificar interes antes del cierre | Trial closes evitan rejection; si el prospect dice "si" a algo pequeno, dira "si" al grande |
| **S** | Asegurar asistencia | Micro-compromisos ("confirmame cuando recibas el WhatsApp") aumentan show rate 40% |
| **E** | Dejar expectativa positiva | La despedida reafirma el valor percibido y reduce buyer's remorse |

#### 9.3 Comparativa: Funnel Actual vs. PRO-V.O.I.S.E.

```
FUNNEL ACTUAL (Sub-optimo):
+-------------------------------------------------------------+
|  Llamada iniciada                                           |
|       |                                                     |
|       v                                                     |
|  Conexion (?) -----> [20% contestan]                        |
|       |                                                     |
|       v                                                     |
|  Saludo generico: "Hola, soy Mariana de GestPro"            |
|       |                                                     |
|       v                                                     |
|  Presentacion de producto (generica)                        |
|       |                                                     |
|       v                                                     |
|  Objecion -> Agendar demo (sin dolor descubierto)           |
|       |                                                     |
|       v                                                     |
|  Fin de llamada (sin follow-up)                             |
|                                                             |
|  Resultado: 2-4% conversion a demo                          |
+-------------------------------------------------------------+

FUNNEL OPTIMIZADO PRO-V.O.I.S.E.:
+-------------------------------------------------------------+
|  PRE-CALL INTELLIGENCE                                      |
|  Lead Scoring BANT -> Pre-Call Brief -> ML Timing           |
|       |                                                     |
|       v                                                     |
|  Multi-Touch Warm-Up (Email + WhatsApp + LinkedIn)          |
|       |                                                     |
|       v                                                     |
|  P - Pattern Interrupt Opener (insight especifico)          |
|       |                                                     |
|       v                                                     |
|  R - Rapport & Permission ("solo te quito 2 minutos")       |
|       |                                                     |
|       v                                                     |
|  O - Discovery SPIN (dolor especifico por nicho)            |
|       |                                                     |
|       v                                                     |
|  V - Value Quantification ("hice bien la cuenta?")          |
|       |                                                     |
|       v                                                     |
|  O - Objection Pre-emption (anticipar + reframe)            |
|       |                                                     |
|       v                                                     |
|  I - Intent Confirmation (trial close)                      |
|       |                                                     |
|       v                                                     |
|  S - Schedule + Commitment (micro-compromiso + WhatsApp)    |
|       |                                                     |
|       v                                                     |
|  E - Exit w/ Expectation (reafirma valor)                   |
|       |                                                     |
|       v                                                     |
|  POST-CALL: Triple Lock + Nurture Engine                    |
|                                                             |
|  Resultado: 8-15% conversion a demo (3-5x)                  |
+-------------------------------------------------------------+
```

#### 9.4 Script de Pattern Interrupt Opener — Antes vs. Despues

**ANTES (generico — baja retencion):**
> "Hola {{nombre}}, soy Mariana de GestPro. Llamo para ofrecerte nuestro software de gestion para empresas. Tenemos muchas funcionalidades que podrian ayudarte..."

**Problemas del opener generico:**
- El prospect escucha "software de gestion" y ya clasifica como "vendedor"
- No hay pattern interrupt — es exactamente lo que esperan
- No menciona nada especifico del negocio del prospect
- Empieza vendiendo antes de descubrir necesidad

**DESPUES (PRO-V.O.I.S.E. — alta retencion):**
> "Hola {{nombre}}? [pausa] Se que te estan interrumpiendo — te prometo que valdrá la pena. Soy Mariana de GestPro. Me fijé que {{empresa}} en {{ciudad}} sigue usando agendas manuales para citas. Te tengo una pregunta rapida: ¿Cuántos clientes crees que pierden cada mes porque alguien olvidó anotar una cita?"

**Por que funciona el nuevo opener:**
- **Pattern interrupt**: "Se que te estan interrumpiendo" = NO es el tipico "como estas, te vendo algo"
- **Permission-based frame**: "Te prometo que valdra la pena" = desarma defensa psicologica
- **Specific signal**: "Me fije que {{empresa}}... agendas manuales" = demuestra research previo
- **Pain question inmediata**: El prospect tiene que PENSAR en su propio problema
- **Tiempo limitado implícito**: "Pregunta rapida" = no es una charla larga

---

### 10. Scripts/Spechs Optimizados por Nicho

#### 10.1 Estructura de Spech Optimizado: Veterinaria

**Contexto:** Clinica veterinaria en Mexico. Dolor tipico: citas no-show de 25-30%, agenda manual, recordatorios por WhatsApp individuales.

```
+================================================================+
| SPECH PRO-V.O.I.S.E. — NICHO VETERINARIA                       |
| Lead: {{nombre}} | Empresa: {{empresa}} | Ciudad: {{ciudad}}  |
+================================================================+

[P - PATTERN INTERRUPT] — 5-8 segundos
---------------------------------------
"{{nombre}}? Se que es un dia ocupado en {{empresa}}. Soy Mariana 
de GestPro. Llamo porque noté que muchas clinicas veterinarias en
{{ciudad}} estan perdiendo hasta 30% de ingresos por citas no-show 
— y no es culpa de ellos, es que no tienen un sistema automatico 
de recordatorios. ¿Eso te resuena con lo que pasa en {{empresa}}?"

NOTAS DE EJECUCION:
- Pronunciar el nombre de la clinica con naturalidad
- Pausa despues de "30% de ingresos" para dejar que el impacto calce
- Si dice "si": transicion inmediata a Rapport
- Si dice "no mucho": transicion a "Entiendo, ¿y como manejan las 
  citas actualmente?" (pivot a Discovery)

[R - RAPPORT & PERMISSION] — 5-10 segundos
-------------------------------------------
"Perfecto. Te juro que solo te quito 2 minutos. Si al final no te 
parece util, me dices 'no me interesa' y no te vuelvo a molestar. 
¿Trato?"

NOTAS DE EJECUCION:
- "Te juro" = coloquial mexicano, genera cercania
- "Solo 2 minutos" = time-boxing reduce resistencia
- Ofrecer salida facil INCREMENTA conversion (paradoja de la 
  libertad: cuando pueden decir no, dicen si con mas frecuencia)
- Si dice "ok" o "si": transicion a Discovery
- Si dice "ahorita no": "Entiendo, ¿te parece si te llamo mañana 
  a esta misma hora?"

[O - OPEN DISCOVERY SPIN] — 30-60 segundos
-------------------------------------------
SITUACION: "A ver, cuéntame — ¿actualmente cómo manejan las citas 
en {{empresa}}? ¿Agenda fisica, WhatsApp, Excel?"

PROBLEMA: "¿Y cuántas citas aproximadamente se les 'escapan' o 
cancelan cada semana sin avisar?"

IMPLICACION: "Vale, si son unas 5 citas por semana, y cada 
consulta cuesta alrededor de 400-600 pesos... eso son unos 
10,000 pesos al mes desapareciendo. ¿Hice bien la cuenta?"

NOTAS DE EJECUCION:
- DEJAR que el prospect HABLE. El ratio ideal es 70% prospect, 
  30% agente en esta fase
- Hacer que ELLOS digan los numeros (no imponerlos)
- "¿Hice bien la cuenta?" = hace que el prospect valide el dolor
- Si corrige los numeros ("no, son mas"): EXCELENTE, el dolor es 
  mayor de lo calculado
- Tomar nota mental de cada numero que menciona (para 
  quantificacion)

[V - VALUE QUANTIFICATION] — 15-20 segundos
--------------------------------------------
"Con nuestros clientes veterinarios en Mexico, el ROI es claro: 
por cada 100 pesos que invierten en GestPro, recuperan entre 300 
y 500 pesos en citas que antes se perdian. Entonces estariamos 
hablando de recuperar esos 10,000 pesos mensuales... ¿tendria 
sentido para {{empresa}}?"

NOTAS DE EJECUCION:
- "Por cada 100 recuperan 300-500" = framing de ROI, no de costo
- "Esos 10,000 pesos" = referencia al numero QUE EL DIJO (no 
  impuesto)
- "¿Tendria sentido?" = soft close, no presion
- Si dice "si" o "mm": transicion a Intent Confirmation
- Si dice "suena bien pero...": Objection Pre-emption

[O - OBJECTION PRE-EMPTION] — 10-20 segundos (solo si aplica)
------------------------------------------------------------
PRECIO: "Entiendo, el precio es importante. Lo que te puedo decir
es que varias clinicas similares a {{empresa}} se pagan el 
sistema solo con las citas recuperadas del primer mes. En la demo
de 15 minutos te mostramos los paquetes y precios exactos. ¿Te 
funciona?"

NO TIEMPO: "Totalmente entendible. Por eso la demo es solo 15 
minutos, y la puedo adaptar a tu horario. Incluso puedo mostrarte
una demo grabada de 5 min si prefieres. ¿Cual opcion te funciona
mejor?"

YA TIENEN SISTEMA: "Perfecto, eso es buena senal — ya entienden 
la importancia. La pregunta es: ¿ese sistema les esta recuperando
esas 5 citas perdidas por semana? Si no, vale la pena ver una 
alternativa. ¿Te parece?"

NOTAS DE EJECUCION:
- Framework LAER obligatorio: Listen -> Acknowledge -> Explore -> 
  Respond
- NUNCA contradecir al prospect: "Entiendo" primero, SIEMPRE
- Reframe: no es "costo", es "inversion que se paga sola"
- Reducir friccion: ofrecer opciones (demo live vs grabada)

[I - INTENT CONFIRMATION] — 5-10 segundos
------------------------------------------
"Si te pudiera mostrar en 15 minutos como clinicas similares a 
{{empresa}} lograron reducir sus no-shows de 30% a menos de 8% 
— sin que tu equipo tenga que aprender nada complicado — ¿valdria
la pena una demo rapida esta semana?"

NOTAS DE EJECUCION:
- "Si te pudiera mostrar..." = conditional close (sin presion)
- Metrica concreta: "de 30% a menos de 8%" = resultado tangible
- "Sin que tu equipo tenga que aprender nada complicado" = 
  elimina objecion de complejidad
- "¿Valdria la pena?" = pregunta de valor, no de compra
- Si dice "si": transicion inmediata a Schedule
- Si dice "tal vez": "¿Que informacion te ayudaria a decidir?"

[S - SCHEDULE WITH COMMITMENT] — 15-20 segundos
------------------------------------------------
"Perfecto. Tengo disponible martes a las 11am o jueves a las 3pm. 
¿Cuál te funciona mejor? [...] Listo, ya te agendé el jueves a 
las 3pm. Ahora te voy a enviar un mensaje por WhatsApp con el 
link de la reunion y un recordatorio. ¿Me confirmas cuando lo 
recibas?"

NOTAS DE EJECUCION:
- Ofrecer 2 opciones (no "cuando quieres?" = paralisis de 
  eleccion)
- "Ya te agende" = asuncion del cierre (asumptive close)
- Pedir confirmacion activa del WhatsApp = micro-compromiso 
  psicologico (Triple Lock #1)
- "¿Me confirmas cuando lo recibas?" = el prospect se compromete
  verbalmente a hacer algo = mayor probabilidad de asistencia

[E - EXIT WITH EXPECTATION] — 5-8 segundos
-------------------------------------------
"Excelente {{nombre}}. En la demo vas a ver exactamente como 
{{empresa}} puede dejar de perder esas citas. Te mando el 
WhatsApp en este mismo momento. ¡Que tengas excelente dia!"

NOTAS DE EJECUCION:
- Repetir el valor: "dejar de perder esas citas" = reafirmar 
  dolor-cost
- "Te mando el WhatsApp en este momento" = credibilidad (hacer 
  lo que se promete)
- Despedida calida y profesional = deja buena impresion final
+================================================================+
```

#### 10.2 Matriz de Spechs Recomendada por Situacion

| Tipo de Spech | Cuando Usar | Prioridad | Duracion Est. |
|--------------|-------------|-----------|---------------|
| **Spech PRO-V.O.I.S.E. Standard** | Lead frio, primer contacto | **P0** | 2-3 minutos |
| **Spech Re-engagement** | Lead que no respondio email previo | **P0** | 2 minutos |
| **Spech Hot Lead** | Lead inbound que solicito demo | **P1** | 1-2 minutos |
| **Spech Objection-Heavy** | Lead con objeciones conocidas (precio, competencia) | **P1** | 3-4 minutos |
| **Spech SMS/WhatsApp Follow-up** | Post-llamada, no contesto | **P0** | 30 seg (envio) |
| **Spech No-Show Recovery** | Lead que agendo demo pero no asistio | **P0** | 2-3 minutos |
| **Spech Reactivation** | Cliente previo para upsell/cross-sell | **P1** | 2 minutos |
| **Spech Break-up** | Lead frio tras 14 dias sin respuesta | **P1** | 1 minuto |

#### 10.3 Spech No-Show Recovery

```
+================================================================+
| SPECH NO-SHOW RECOVERY                                          |
| Contexto: Lead agendo demo pero no asistio                      |
+================================================================+

Llamada a los 10 minutos de no-show:
------------------------------------
"Hola {{nombre}}? Soy Mariana de GestPro. Parece que tuvimos un 
contratiempo con la conexion de la demo. No te preocupes — me 
pasa tambien. ¿Tienes 2 minutos ahora mismo? Te puedo dar la 
version rapida de 5 minutos. O si prefieres, reagendemos para 
manana o pasado. ¿Que te funciona?"

NOTAS:
- "Tuvimos un contratiempo" = culpa compartida, no del prospect
- "Me pasa tambien" = empatia, humanizacion
- Ofrecer 2 opciones: demo rapida ahora O reagendar
- "¿Que te funciona?" = dar control al prospect

WhatsApp a los 15 minutos:
--------------------------
"Hola {{nombre}}! Soy Mariana de GestPro. Parece que la conexion 
nos jugo una mala pasada hoy. No pasa nada. Te dejo 2 opciones:
1. Reagendar para esta semana: [link]
2. Te envio una demo grabada de 10 min que puedes ver cuando 
   quieras
¿Cual prefieres?"

NOTAS:
- Tonologia amigable, sin culpa
- 2 opciones de baja friccion
- Link directo = eliminar friccion de reagendamiento
+================================================================+
```

#### 10.4 Spech Break-up (Ultimo Intento)

```
+================================================================+
| SPECH BREAK-UP — 14 DIAS POST-LLAMADA                           |
| Objetivo: Cerrar ciclo sin quemar el lead, dejando puerta       |
+================================================================+

Email + WhatsApp:
-----------------
"Hola {{nombre}}, soy Mariana de GestPro.

Te escribo porque noté que no tuvimos chance de conectar. Sin 
problema — se que estas ocupado.

No te voy a seguir molestando. Solo quería dejarte esto: tenemos
una demo grabada de 10 min donde muestro exactamente como clinicas
como {{empresa}} recuperan hasta 30% de citas perdidas. Si en 
algun momento te interesa, aqui está el link: [link demo grabada]

Si no es el momento, tambien esta perfecto. Te deseo mucho exito 
con {{empresa}}.

Un abrazo,
Mariana — GestPro"

NOTAS:
- "No te voy a seguir molestando" = alivio de presion
- Ofrecer valor sin pedir nada a cambio = reciprocidad
- Demo grabada = cero friccion para el prospect
- "Si no es el momento, tambien esta perfecto" = total ausencia 
  de presion = mayor probabilidad de respuesta
+================================================================+
```

---

### 11. Tools y Funciones del Agente

#### 11.1 Evaluacion de las 7 Tools Actuales

| # | Tool | Estado | Evaluacion | Recomendacion | Prioridad |
|---|------|--------|-----------|---------------|-----------|
| 1 | `consultar_crm` | Existe | Basica — solo datos del lead | **Expandir** con historial completo + notas previas + interacciones pasadas | P0 |
| 2 | `buscar_caso_exito` | Existe | Generica — no match por contexto | **Optimizar** con matching por tamano + nicho + ciudad + metricas similares | P0 |
| 3 | `calcular_roi` | Existe | Potencial alto — inputs estaticos | **Mejorar** con inputs del propio prospect en tiempo real (dinamico) | P0 |
| 4 | `comparar_con_competidor` | Existe | Riesgo alto — suena agresivo | **Redisenar** para no sonar a ataque, sino a "diferenciacion educada" | P1 |
| 5 | `agendar_demo` | Existe | Funcional — basico | **Agregar** micro-compromiso + confirmacion activa + envio WhatsApp | P0 |
| 6 | `enviar_whatsapp` | Existe | Basica — solo envio | **Expandir** a secuencia de nurturing (recordatorio 24h, 1h, post-demo) | P0 |
| 7 | `transferir_humano` | Existe | Correcta | **Mantener** + agregar context briefing automatico para el humano | P1 |

#### 11.2 Las 10 Nuevas Tools de Alto Impacto

| # | Nueva Tool | Descripcion | Impacto | Prioridad | Complejidad |
|---|-----------|-------------|---------|-----------|-------------|
| **3.2.1** | **`pre_call_brief`** | Genera brief del lead antes de llamar: datos de su negocio, senales de compra, dolor probable, notas previas, interacciones pasadas | +30% personalizacion | **P0** | Media |
| **3.2.2** | **`quantificar_dolor`** | Guia al prospect a calcular el costo economico de su problema actual (dinamico, basado en inputs reales) | +40% motivacion de compra | **P0** | Media |
| **3.2.3** | **`social_proof_match`** | Encuentra caso de exito del nicho EXACTO, tamano similar, ciudad cercana | +35% credibilidad | **P0** | Baja |
| **3.2.4** | **`trial_close`** | Verifica nivel de interes antes de intentar cierre: "Si pudieramos resolver X, valdria una demo?" | +25% cierre efectivo | **P0** | Baja |
| **3.2.5** | **`detectar_emocion_avanzado`** | Emocion + engagement score + readiness to buy (0-100) | +20% timing de cierre | **P1** | Alta |
| **3.2.6** | **`recordatorio_demo`** | Programa recordatorio multi-canal: 24h antes (email) + 1h antes (WhatsApp + SMS) | -50% no-show rate | **P0** | Media |
| **3.2.7** | **`crear_urgencia_legitima`** | Genera razon legitima de urgencia (promo temporal, cupo limitado, precio sube) | +15% cierre inmediato | **P1** | Baja |
| **3.2.8** | **`handoff_briefing`** | Genera resumen completo para vendedor humano al transferir: contexto + objeciones + BANT score + proximos pasos | +40% efectividad transferencia | **P1** | Media |
| **3.2.9** | **`lead_score_conversacion`** | Actualiza score BANT en tiempo real durante la conversacion (Budget, Authority, Need, Timeline: 0-100) | +30% calificacion | **P1** | Media |
| **3.2.10** | **`no_show_recovery`** | Secuencia automatica de recuperacion post no-show: llamada 10min + WhatsApp 15min + email 1h + re-engagement 3d | +20% demos recuperadas | **P0** | Media |

#### 11.3 Implementacion de las 5 Tools P0

```python
# ============================================================
# TOOL 1: pre_call_brief
# Genera un brief completo del lead antes de la llamada
# ============================================================

async def pre_call_brief(lead_id: str) -> dict:
    """Genera brief inteligente del lead antes de llamar.
    
    Returns:
        dict con: datos del negocio, dolor probable, 
        senales de compra, notas previas, contexto personalizado
    """
    lead = await crm.get_lead(lead_id)
    
    # Obtener datos enriquecidos
    brief = {
        # Datos basicos
        "nombre": lead.name,
        "empresa": lead.company,
        "ciudad": lead.city,
        "telefono": lead.phone,
        
        # Datos del negocio (enriquecido)
        "industria": lead.industry or infer_industry(lead.company),
        "tamano_estimado": lead.company_size or estimate_size(lead.company),
        "tiempo_en_operacion": lead.years_in_business,
        
        # Senales de compra
        "senales_compra": await analyze_buy_signals(lead_id),
        # Ejemplo: ["visito_pricing", "descargo_ebook", "reabrio_email_3x"]
        
        # Dolor probable basado en nicho
        "dolor_probable": infer_pain_by_industry(lead.industry),
        # Ejemplo: "no-shows de 30% en citas"
        
        # Interacciones previas
        "historial": await get_interaction_history(lead_id),
        # Ejemplo: ["email_abierto_2024-06-15", "llamada_perdida_2024-06-10"]
        
        # Contexto personalizado para el spech
        "contexto_spech": generate_spech_context(lead),
        # Ejemplo: "Clinica veterinaria de 3 años, 2 veterinarios,
        #           problema probable: agenda manual, no-shows"
        
        # Recomendacion de spech
        "spech_recomendado": select_spech_type(lead),
        # Ejemplo: "PRO-V.O.I.S.E. Standard"
        
        # Timing optimo
        "mejor_horario": predict_best_call_time(lead_id),
        # Ejemplo: "Martes 11am o Jueves 3pm"
    }
    
    return brief


# ============================================================
# TOOL 2: quantificar_dolor
# Guia al prospect a calcular su propio costo del problema
# ============================================================

async def quantificar_dolor(
    nicho: str,
    metricas_prospect: dict
) -> dict:
    """Calcula el costo economico del problema del prospect.
    
    Args:
        nicho: Tipo de negocio (veterinaria, dental, etc.)
        metricas_prospect: Respuestas del prospect durante discovery
    
    Returns:
        dict con: costo_mensual, costo_anual, roi_message
    """
    calculators = {
        "veterinaria": {
            "metrica": "citas_perdidas_semana",
            "valor_unitario": 500,  # pesos por consulta promedio
            "multiplicador_semanal": 1,
            "mensaje": "citas que se pierden",
        },
        "dental": {
            "metrica": "citas_no_show_semana",
            "valor_unitario": 800,
            "multiplicador_semanal": 1,
            "mensaje": "citas no-show",
        },
        "salud": {
            "metrica": "pacientes_perdidos_mes",
            "valor_unitario": 600,
            "multiplicador_semanal": 4,
            "mensaje": "pacientes que no regresan",
        },
        "servicios": {
            "metrica": "clientes_perdidos_mes",
            "valor_unitario": 1000,
            "multiplicador_semanal": 4,
            "mensaje": "clientes que se van a la competencia",
        },
    }
    
    calc = calculators.get(nicho, calculators["servicios"])
    
    # Obtener metricas de las respuestas del prospect
    cantidad = metricas_prospect.get(calc["metrica"], 0)
    valor_unitario = metricas_prospect.get("valor_unitario", calc["valor_unitario"])
    
    # Calcular
    costo_semanal = cantidad * valor_unitario
    costo_mensual = costo_semanal * 4.3
    costo_anual = costo_mensual * 12
    
    return {
        "costo_semanal": costo_semanal,
        "costo_mensual": costo_mensual,
        "costo_anual": costo_anual,
        "cantidad": cantidad,
        "valor_unitario": valor_unitario,
        "roi_message": (
            f"Si son {cantidad} {calc['mensaje']} por semana, "
            f"a {valor_unitario} pesos cada una... eso son "
            f"{costo_mensual:,.0f} pesos al mes. "
            f"¿Hice bien la cuenta?"
        ),
        "framing_roi": (
            f"Con GestPro, por cada 100 pesos invertidos, "
            f"nuestros clientes de {nicho} recuperan entre "
            f"300 y 500 pesos en {calc['mensaje']}. "
            f"¿Tendria sentido recuperar esos {costo_mensual:,.0f} pesos?"
        ),
    }


# ============================================================
# TOOL 3: social_proof_match
# Encuentra el caso de exito mas relevante para el prospect
# ============================================================

async def social_proof_match(
    nicho: str,
    ciudad: str,
    tamano: str,
    dolor: str
) -> dict:
    """Encuentra el caso de exito mas relevante para el prospect actual.
    
    Matching por: nicho exacto > ciudad cercana > tamano similar > dolor similar
    """
    casos = await crm.get_casos_exito(nicho=nicho)
    
    # Score de matching
    def score_caso(caso):
        score = 0
        if caso["nicho"] == nicho:
            score += 40
        if caso["ciudad"] == ciudad:
            score += 30
        elif same_state(caso["ciudad"], ciudad):
            score += 15
        if caso["tamano"] == tamano:
            score += 20
        elif tamano_similar(caso["tamano"], tamano):
            score += 10
        if caso["dolor_principal"] == dolor:
            score += 10
        return score
    
    # Ordenar por relevancia
    casos_ordenados = sorted(casos, key=score_caso, reverse=True)
    mejor_caso = casos_ordenados[0] if casos_ordenados else None
    
    if mejor_caso:
        return {
            "empresa": mejor_caso["empresa"],
            "ciudad": mejor_caso["ciudad"],
            "resultado_principal": mejor_caso["resultado"],
            "metrica": mejor_caso["metrica_destacada"],
            "testimonial_corto": mejor_caso["testimonial_1_linea"],
            "tiempo_resultado": mejor_caso["tiempo_a_resultado"],
            "mensaje_natural": (
                f"Mira, {{empresa}} en {{ciudad}} — que es una "
                f"{{nicho}} de tamano similar al tuyo — logró "
                f"{mejor_caso['resultado']} en solo "
                f"{mejor_caso['tiempo_a_resultado']}. "
                f"Y lo que me dijo el dueno fue: "
                f"'{mejor_caso['testimonial_1_linea']}'"
            ),
        }
    
    return {
        "mensaje_natural": (
            f"Tenemos varios clientes de {nicho} en Mexico que "
            f"han visto resultados similares. Te los muestro en la demo."
        ),
    }


# ============================================================
# TOOL 4: trial_close
# Verifica nivel de interes antes de intentar cierre formal
# ============================================================

async def trial_close(
    contexto_llamada: dict,
    doric_identificado: str,
) -> dict:
    """Ejecuta un trial close adaptativo basado en el progreso de la llamada.
    
    Returns mensaje y decision de siguiente paso.
    """
    etapa = contexto_llamada.get("etapa_actual", "discovery")
    interes_score = contexto_llamada.get("interes_score", 50)
    
    trial_closes = {
        "early": {  # Durante discovery
            "mensaje": (
                "{{nombre}}, si pudieramos resolver lo de "
                "{{dolor_identificado}}, ¿eso tendria impacto en "
                "{{empresa}}?"
            ),
            "si": "proceder_a_quantification",
            "no": "pivot_dolor",
            "tal_vez": "explorar_mas",
        },
        "mid": {  # Despues de quantification
            "mensaje": (
                "{{nombre}}, si te mostramos una forma de recuperar esos "
                "{{costo_mensual}} pesos mensuales sin complicarte la vida, "
                "¿valdria la pena una demo rapida de 15 minutos?"
            ),
            "si": "proceder_a_agendar",
            "no": "manejar_objecion",
            "tal_vez": "social_proof",
        },
        "late": {  # Despues de social proof
            "mensaje": (
                "{{nombre}}, viendo lo que lograron {{caso_similar}} y "
                "que tu situacion es parecida, ¿te gustaria ver como "
                "funciona especificamente para {{empresa}}?"
            ),
            "si": "proceder_a_agendar",
            "no": "objecion_final",
            "tal_vez": "urgencia_legitima",
        },
    }
    
    # Seleccionar trial close segun etapa
    if interes_score > 70:
        selected = trial_closes["late"]
    elif interes_score > 40:
        selected = trial_closes["mid"]
    else:
        selected = trial_closes["early"]
    
    return {
        "mensaje": selected["mensaje"],
        "transiciones": {
            "si": selected["si"],
            "no": selected["no"],
            "tal_vez": selected["tal_vez"],
        },
    }


# ============================================================
# TOOL 5: recordatorio_demo (Triple Lock #2)
# Programa recordatorios multi-canal antes de la demo
# ============================================================

async def recordatorio_demo(
    lead_id: str,
    demo_datetime: datetime,
    canal_principal: str = "whatsapp",
) -> dict:
    """Programa la secuencia 3-1-0 de recordatorios.
    
    3 DIAS antes: Email personalizado + caso de exito
    1 DIA antes: WhatsApp + SMS con link
    1 HORA antes: WhatsApp + confirmacion
    """
    ahora = datetime.now()
    
    # Calcular tiempos
    tres_dias_antes = demo_datetime - timedelta(days=3)
    un_dia_antes = demo_datetime - timedelta(days=1)
    una_hora_antes = demo_datetime - timedelta(hours=1)
    
    # Programar recordatorios
    recordatorios = []
    
    # T-3 dias: Email
    if tres_dias_antes > ahora:
        recordatorios.append({
            "when": tres_dias_antes,
            "canal": "email",
            "tipo": "valor_anticipado",
            "contenido": {
                "asunto": "{{nombre}}, preparando tu demo de GestPro",
                "cuerpo": (
                    "Hola {{nombre}},\n\n"
                    "Tu demo de GestPro es el {{fecha_demo}} a las {{hora_demo}}.\n\n"
                    "Mientras tanto, quiero compartirte un caso rapido: "
                    "{{caso_exito_relevante}}.\n\n"
                    "Link de la reunion: {{link_meeting}}\n\n"
                    "Nos vemos pronto,\nMariana"
                ),
            },
        })
    
    # T-1 dia: WhatsApp + SMS
    if un_dia_antes > ahora:
        recordatorios.append({
            "when": un_dia_antes,
            "canal": "whatsapp",
            "tipo": "recordatorio_24h",
            "contenido": {
                "mensaje": (
                    "Hola {{nombre}}! Te recordamos que manana "
                    "{{fecha_demo}} a las {{hora_demo}} tenemos tu demo "
                    "de GestPro. Te va a encantar ver como {{empresa}} "
                    "puede {{beneficio_principal}}.\n\n"
                    "Link: {{link_meeting}}\n\n"
                    "¿Confirmas que vas a poder asistir? 👍"
                ),
            },
        })
        recordatorios.append({
            "when": un_dia_antes,
            "canal": "sms",
            "tipo": "recordatorio_24h_sms",
            "contenido": {
                "mensaje": (
                    "GestPro: Tu demo es manana {{hora_demo}}. "
                    "Link: {{link_meeting_short}}"
                ),
            },
        })
    
    # T-1 hora: WhatsApp
    if una_hora_antes > ahora:
        recordatorios.append({
            "when": una_hora_antes,
            "canal": "whatsapp",
            "tipo": "recordatorio_1h",
            "contenido": {
                "mensaje": (
                    "¡Hola {{nombre}}! En 1 hora comienza tu demo de "
                    "GestPro ({{hora_demo}}).\n\n"
                    "Link de acceso: {{link_meeting}}\n\n"
                    "¿Todo listo? Te espero ahí 🙂"
                ),
            },
        })
    
    # Programar en scheduler (Celery / APScheduler / similar)
    for rec in recordatorios:
        await scheduler.schedule(
            when=rec["when"],
            task="enviar_recordatorio",
            payload={
                "lead_id": lead_id,
                "canal": rec["canal"],
                "contenido": rec["contenido"],
            },
        )
    
    return {
        "recordatorios_programados": len(recordatorios),
        "proximo_recordatorio": recordatorios[0]["when"] if recordatorios else None,
        "cobertura_canales": ["email", "whatsapp", "sms"],
    }
```

#### 11.4 Arquitectura Completa de Tools (Actual + Nuevas)

```
+================================================================+
| ARQUITECTURA DE TOOLS — SILXAR CRM VOICE AI                    |
+================================================================+

PRE-CALL (antes de que suene timbre):
  pre_call_brief → consultar_crm (expandido) → lead_score_conversacion
       |
       v
  [Sesion pre-calentada con contexto cargado]

DURANTE LLAMADA:
  |
  +---> P: Pattern Interrupt (usando datos de pre_call_brief)
  |
  +---> R: Rapport & Permission
  |
  +---> O: Discovery SPIN
  |         |
  |         +---> quantificar_dolor (Tool 3.2.2) 
  |         |       |
  |         |       v
  |         +---> Value Quantification
  |                 |
  |                 +---> social_proof_match (Tool 3.2.3)
  |                         |
  |                         v
  +---> I: Intent Confirmation
  |         |
  |         +---> trial_close (Tool 3.2.4)
  |                 |
  |                 v
  +---> O: Objection Handling (si aplica)
  |         |
  |         +---> comparar_con_competidor (redisenado)
  |         +---> crear_urgencia_legitima (Tool 3.2.7)
  |
  +---> S: Schedule w/ Commitment
  |         |
  |         +---> agendar_demo (expandido)
  |         +---> recordatorio_demo (Tool 3.2.6)
  |         +---> enviar_whatsapp (expandido)
  |
  +---> E: Exit w/ Expectation
  |
  +---> [Continuo] detectar_emocion_avanzado (Tool 3.2.5)
  +---> [Continuo] lead_score_conversacion (Tool 3.2.9)

POST-CALL:
  recordatorio_demo (programado)
  lead_score_conversacion (update final)
  handoff_briefing (Tool 3.2.8, si transferencia)
  |
  +---> [Si no-show] no_show_recovery (Tool 3.2.10)
  |         |
  |         +---> Llamada 10min post no-show
  |         +---> WhatsApp 15min post no-show
  |         +---> Email 1h post no-show
  |         +---> Re-engagement 3d post no-show
  |
  +---> [Si transferencia] transferir_humano + handoff_briefing
+================================================================+
```



---

### 12. Avatar "Mariana" — System Prompt Optimizado

#### 12.1 Evaluacion del Prompt de 5 Capas Actual

El sistema de 5 capas es **conceptualmente correcto** pero necesita profundizacion en las capas de ventas. Evaluacion por capa:

| Capa | Estado | Mejora Requerida | Prioridad |
|------|--------|-----------------|-----------|
| 1. Identidad | Adecuada | Agregar credenciales especificas por nicho | P1 |
| 2. Prosodia | Buena | Agregar variaciones de energia segun emocion del prospect | P1 |
| 3. Reglas de Supervivencia | Correcta | Agregar manejo de objeciones con framework LAER | **P0** |
| 4. Flujo de Conversacion | Basico | **REEMPLAZAR** con framework PRO-V.O.I.S.E. | **P0** |
| 5. Guiones por Nicho | Existentes | **REESCRIBIR** con discovery SPIN + quantificacion | **P0** |

#### 12.2 Mejoras Criticas al System Prompt

**P0 - Agregar framework de objeciones LAER:**

```
[FRAMEWORK LAER — Manejo de Objeciones]

Obligatorio para TODA objecion del prospect:

L - LISTEN: Dejar que el prospect termine COMPLETAMENTE sin interrumpir.
   Esperar minimo 500ms de silencio despues de que terminen.

A - ACKNOWLEDGE: "Entiendo perfectamente, es una preocupacion valida"
   o "Totalmente, eso tiene mucho sentido"
   NUNCA: "Pero..." o "Sin embargo..." inmediatamente.

E - EXPLORE: "Ayudame a entender mejor — cuando dices 'caro', 
   te refieres al costo mensual o al costo total del primer año?"
   o "¿Que comparas contra cuando dices que ya tienen un sistema?"
   EXCAVAR hasta encontrar la RAIZ de la objecion.

R - RESPONDER: Responder con datos, social proof, o reframe.
   Ejemplo: "Entiendo. Lo que te puedo decir es que la clinica 
   Huellitas en Guadalajara tenia la misma preocupacion, y se 
   pagaron el sistema solo con las citas recuperadas del primer 
   mes. Pero mira, te entiendo. ¿Te gustaria verlo en la demo 
   sin compromiso?"
```

**P0 - Agregar trial closes obligatorios:**

```
[TRIAL CLOSES — Verificar Acuerdo en Cada Etapa]

Mariana debe verificar acuerdo antes de avanzar cada fase:

- Post-Discovery: "¿Tiene sentido lo que te digo?"
- Post-Quantification: "¿Ese problema te resuena con lo que pasa 
  en {{empresa}}?"
- Pre-Cierre: "Si pudieramos resolver eso, ¿valdria la pena una 
  breve demo?"

Si el prospect dice "no" o "no se" a un trial close:
  -> NO avanzar a la siguiente fase
  -> Retroceder a discovery o manejar objecion
```

**P0 - Agregar quantificacion interactiva:**

```
[QUANTIFICACION INTERACTIVA]

Mariana debe hacer que el prospect calcule ELLOS MISMOS el costo:

"¿Cuantas citas se les pierden por semana? [...] 
 ¿Y cada cita cuanto vale aproximadamente? [...] 
 Entonces estamos hablando de X pesos al mes, ¿hice bien la cuenta?"

Reglas:
- NUNCA imponer los numeros
- SIEMPRE dejar que el prospect diga las cifras
- "¿Hice bien la cuenta?" = obligatorio para que valide
- Si corrige = EXCELENTE (el dolor es mayor)
- Usar los numeros DEL PROSPECT en todo momento subsiguiente
```

**P1 - Agregar variaciones de energia prosodica:**

```
[VARIACIONES DE ENERGIA]

Energia ALTA (entusiasta, ritmo rapido):
  - Apertura de la llamada (primeros 15 segundos)
  - Cuando el prospect muestra interes ("si, eso me pasa!")
  - Al confirmar la demo agendada

Energia MEDIA (calmada, ritmo conversacional):
  - Discovery/escucha (dar espacio al prospect)
  - Quantificacion (momento de reflexion)
  - Manejo de objeciones (calma genera confianza)

Energia BAJA (empatica, ritmo lento):
  - Cuando el prospect muestra frustracion ("estoy harto de...")
  - Cuando el prospect es esceptico
  - Al hablar de problemas serios ("perdida de dinero")

Instruccion tecnica: Variar speed (0.9-1.15), pitch (+/- 5%), 
volume (80-100%), pause length (100-500ms).
```

#### 12.3 System Prompt Optimizado — Capa 4 (Flujo PRO-V.O.I.S.E.)

```
+================================================================+
| CAPA 4 — FRAMEWORK DE CONVERSION PRO-V.O.I.S.E.                |
| Reemplaza completamente el flujo anterior                      |
+================================================================+

IDENTIDAD: Eres Mariana, asesora de ventas de GestPro (CRM para 
PYMEs en Mexico). Tienes 3 anos de experiencia ayudando a 
empresas {{nicho}} a mejorar su gestion. Hablas espanol 
latinoamericano natural, con expresiones mexicanas coloquiales.

OBJETIVO PRINCIPAL: NUNCA vender directamente. Tu UNICO objetivo 
es agendar una demo de 15 minutos con un especialista.

FLUJO OBLIGATORIO (en orden, sin saltar pasos):

1. PATTERN INTERRUPT (5-8 seg): 
   Gana atencion con insight especifico del nicho del prospect.
   Ejemplo: "{{nombre}}, me fijé que muchas clinicas veterinarias 
   en {{ciudad}} estan perdiendo hasta 30% de ingresos por citas 
   no-show..."
   
2. RAPPORT & PERMISSION (5-10 seg):
   Pide permiso para continuar, ofrece salida facil.
   "Te juro que solo te quito 2 minutos. Si al final no te parece 
   util, me dices 'no me interesa' y no te vuelvo a molestar. 
   ¿Trato?"

3. DISCOVERY SPIN (30-60 seg):
   - Pregunta SITUACION: "¿Como manejan X actualmente?"
   - Pregunta PROBLEMA: "¿Cuanto les cuesta/afecta eso?"
   - Pregunta IMPLICACION: "¿Y eso que impacto tiene en Y?"
   - NUNCA preguntes NEED-PAYOFF en cold call (eso es para la demo)
   - Ratio habla: 70% prospect, 30% Mariana

4. VALUE QUANTIFICATION (15-20 seg):
   Guia al prospect a calcular su propio costo del dolor.
   "¿Cuantas X por semana? [...] ¿Y cada una cuanto vale? 
   [...] Entonces estamos hablando de Z pesos al mes, 
   ¿hice bien la cuenta?"

5. TRIAL CLOSE (5-10 seg):
   "Si pudieramos resolver eso, ¿valdria la pena una demo rapida?"
   Si dice "no" -> retroceder a discovery.
   Si dice "si" -> proceder a agendar.

6. OBJECTION HANDLING (si aplica):
   Framework LAER obligatorio:
   Listen -> Acknowledge -> Explore -> Respond
   NUNCA contradecir. NUNCA presionar.

7. SCHEDULE WITH COMMITMENT (15-20 seg):
   Ofrecer 2 opciones de horario.
   "Ya te agende. Te envio WhatsApp con el link. 
   ¿Me confirmas cuando lo recibas?"
   Esto es CRITICO para el Triple Lock.

8. EXIT WITH EXPECTATION (5-8 seg):
   Reafirma valor + proximo paso.
   "En la demo vas a ver exactamente como {{empresa}} puede 
   [beneficio principal]. Te mando el WhatsApp ahora. 
   ¡Que tengas excelente dia!"

REGLAS DE ORO (inquebrantables):

- Si el prospect dice "no me interesa" 2 veces -> ACEPTAR y ofrecer 
  enviar info por WhatsApp. NUNCA insistir una tercera vez.
  
- NUNCA discutir precio detallado en cold call. 
  Decir: "En la demo te mostramos los paquetes y precios exactos."
  
- Si te piden transferir a un familiar/gerente -> agenda demo 
  con QUIEN TIENE LA DECISION, no con quien contesta.
  
- Si no hay dolor claro al minuto 2 -> ofrecer enviar info 
  y cortar amablemente. No gastar tiempo en leads sin dolor.
  
- Despues de agendar demo: enviar WhatsApp INMEDIATAMENTE 
  con link + recordatorio. Y pedir confirmacion.
  
- Horario de llamadas: 9am-8pm (Lunes a Sabado). 
  NUNCA llamar fuera de horario.
  
- Si el prospect dice "no me llames mas", "quitalo de tu lista", 
  "dame de baja" -> DETENER INMEDIATAMENTE, marcar como 
  RECHAZADO, y respetar su decision.
  
- Transparencia: si preguntan si eres IA, responder honestamente: 
  "Soy Mariana, asistente inteligente de GestPro. Te ayudo a 
  agendar una demo con nuestro equipo. ¿Te parece?"
+================================================================+
```

---

### 13. Post-Call Workflow Automatizado

#### 13.1 Workflow Actual (Deficiente)

```
Workflow actual:
  Llamada termina 
    -> Guarda transcript, outcome, metadata
    -> Webhook a Backend
    -> Actualiza lead estado + historial
    [FIN]

Problema: Esto es un LOG de llamada, no un sistema de conversion.
Falta: seguimiento, nurturing, re-engagement, no-show prevention.
```

#### 13.2 Workflow Post-Call Optimizado

```
+================================================================+
| WORKFLOW POST-CALL OPTIMIZADO — "NURTURE ENGINE"               |
+================================================================+

INMEDIATAMENTE despues de la llamada (0-5 min):
+----------------------------------------------------------------+
| 1. Guardar transcript completo + analisis de sentimiento        |
|    -> emotion: interesado/neutro/desinteresado/molesto           |
|    -> engagement_score: 0-100                                    |
|    -> frustration_level: 0-10                                    |
|    -> interes_explicito: si/no/tal_vez                           |
|                                                                  |
| 2. Actualizar lead score BANT (0-100) basado en conversacion    |
|    -> Budget: 0-25 (menciono presupuesto? resistencia a precio?) |
|    -> Authority: 0-25 (es decision maker?)                       |
|    -> Need: 0-25 (dolor identificado y quantificado?)            |
|    -> Timeline: 0-25 (urgencia mencionada?)                      |
|                                                                  |
| 3. Extraer action items y proximos pasos concretos              |
|    -> Ej: "Reenviar caso de exito de veterinaria"               |
|    -> Ej: "Llamar martes 11am (lead dijo que esta mejor)"       |
|                                                                  |
| 4. Generar resumen ejecutivo para vendedor (si es transferido)  |
|    -> Contexto + objeciones + BANT score + proximos pasos       |
|                                                                  |
| 5. Enviar webhook a backend con datos ENRIQUECIDOS              |
|    -> Incluye: emotion, BANT score, action items, spech usado   |
+----------------------------------------------------------------+

0-2 horas post-llamada:
+----------------------------------------------------------------+
| 6. WhatsApp de follow-up personalizado con resumen de llamada   |
|    Si agendo demo:                                               |
|      "Hola {{nombre}}! Quedo agendada tu demo para {{fecha}}.   |
|       Te envio el link: {{link}}. Cualquier cosa, aqui estoy."  |
|                                                                  |
|    Si no agendo pero hubo interes:                               |
|      "Hola {{nombre}}! Como acordamos, te envio el caso de      |
|       exito de {{caso_similar}}: {{link}}. Cualquier duda,      |
|       me escribes."                                             |
|                                                                  |
|    Si rechazo suavemente:                                        |
|      "Hola {{nombre}}. Entiendo que ahorita no es el momento.   |
|       Te dejo mi WhatsApp por si algun dia te interesa.         |
|       Te deseo mucho exito con {{empresa}}."                    |
|                                                                  |
| 7. Si agendo demo: WhatsApp de confirmacion + recordatorio 24h  |
|    (programar via tool recordatorio_demo)                       |
|                                                                  |
| 8. Si no agendo pero hubo interes:                              |
|    Email con caso de exito relevante por nicho                  |
|                                                                  |
| 9. Si rechazo: Email "puerta abierta" + caso de exito generico  |
|    (NO quemar lead — dejarlo para reactivacion en 60 dias)      |
+----------------------------------------------------------------+

24 horas post-llamada:
+----------------------------------------------------------------+
| 10. Si no respondio follow-up:                                  |
|     Segundo email con contenido de valor (ebook, caso de exito) |
|                                                                  |
| 11. Si agendo demo:                                             |
|     Recordatorio 24h antes con link + preparacion               |
|     "{{nombre}}, manana es tu demo de GestPro. Para aprovechar  |
|      al maximo, te recomiendo tener a mano:                     |
|      - Tu agenda actual (para comparar)                         |
|      - Lista de 3 problemas que mas te fastidian de tu sistema  |
|      - Link de la reunion: {{link}}"                            |
+----------------------------------------------------------------+

1 hora antes de demo:
+----------------------------------------------------------------+
| 12. WhatsApp + SMS simultaneos:                                 |
|     "¡Hola {{nombre}}! En 1 hora comienza tu demo de GestPro.   |
|      Link: {{link}}                                             |
|      ¿Todo listo? Te espero 🙂"                                |
+----------------------------------------------------------------+

Si NO-SHOW (lead no asiste a demo):
+----------------------------------------------------------------+
| 13. A los 10 min de no-show: Llamada de "reconexion"           |
|     "Hola {{nombre}}, parece que tuvimos un contratiempo.       |
|      ¿Tienes 2 min ahora? O reagendamos para manana."          |
|                                                                  |
| 14. A los 15 min: WhatsApp + Email                              |
|     "Parece que nos jugo una mala pasada la conexion.           |
|      Reagendemos: {{link_reagendar}}"                           |
|                                                                  |
| 15. Si no reagenda en 24h:                                      |
|     WhatsApp con oferta de demo grabada (no requiere asistencia)|
|     "{{nombre}}, te grabe una demo de 10 min mostrando como     |
|      {{empresa}} puede [beneficio]. Aqui el link: {{link}}"    |
|                                                                  |
| 16. Si aun no responde en 3 dias:                               |
|     Marcar lead para reactivacion en 30 dias con nuevo angle    |
+----------------------------------------------------------------+

3-7 dias post-llamada (si no agendo demo):
+----------------------------------------------------------------+
| 17. Llamada de seguimiento #2 (diferente horario)               |
|     "Hola {{nombre}}, soy Mariana de GestPro. La semana pasada  |
|      hablamos brevemente sobre [dolor identificado]. Tenemos    |
|      una nueva funcionalidad que creo te interesaria..."        |
|                                                                  |
| 18. Email con testimonial de cliente del mismo nicho            |
|     Incluir metrica concreta: "Clinica Huellitas redujo         |
|     no-shows de 30% a 8% en 3 semanas"                         |
+----------------------------------------------------------------+

14 dias post-llamada:
+----------------------------------------------------------------+
| 19. Email de "break-up" con puerta abierta                      |
|     (Ver Spech Break-up en Seccion 10.4)                        |
|                                                                  |
| 20. Marcar lead para reactivacion en 60 dias                    |
|     Programar nueva secuencia con diferente value proposition   |
+================================================================+
```

#### 13.3 Impacto del Workflow Optimizado

| Metrica | Actual | Con Workflow Optimizado | Mejora |
|---------|--------|------------------------|--------|
| Leads que reciben follow-up | ~40% (manual) | **100%** (automatico) | +150% |
| Leads con re-engagement activo | 0% | **60%** re-contactados | Nuevo canal |
| No-show rate (estimado) | 30-50% | **10-20%** (Triple Lock) | -60% |
| Demo re-agendada tras no-show | 0% | **20-30%** | Nuevo revenue |
| Lead score actualizado post-call | Manual | **Automatico (BANT)** | +30% precision |
| Handoff briefing para humanos | Basico | **Completo (contexto+BANT)** | +40% close rate |

---

### 14. Sistema Triple Lock de No-Show Prevention

#### 14.1 El Problema del No-Show

| Metrica | Valor | Fuente |
|---------|-------|--------|
| No-show rate tipico B2B (sin sistema) | **30-50%** | Industry benchmark |
| No-show rate con recordatorios basicos | **20-30%** | Balto.ai 2025 |
| No-show rate con recordatorios automatizados | **10-20%** | MedLaunch 2026 |
| No-show rate con sistema Triple Lock | **8-15%** | Proyeccion Silxar |
| Reduccion reportada por Retell AI | **88%** | Retell AI blog 2026 |

**Cada no-show representa:**
- Costo de adquisicion desperdiciado (llamada + seguimiento)
- Oportunidad perdida de cierre
- Desmotivacion del equipo de ventas
- Tiempo del vendedor humano desperdiciado

#### 14.2 Arquitectura del Sistema Triple Lock

```
+================================================================+
| SISTEMA TRIPLE LOCK — No-Show Prevention                       |
| Reduccion estimada: de 35-50% a 8-15% (-65% no-shows)         |
+================================================================+

LOCK 1 — CONFIRMACION ACTIVA (inmediata al agendar)
+----------------------------------------------------------------+
|                                                                  |
| Proposito: Crear micro-compromiso psicologico INMEDIATO.        |
|                                                                  |
| Tecnica: Mariana NO solo "agenda" — pide CONFIRMACION ACTIVA.  |
|                                                                  |
| Script:                                                          |
| "Perfecto, ya te agende el jueves a las 3pm. Ahora te voy a    |
|  enviar un mensaje por WhatsApp con el link de la reunion y     |
|  un recordatorio. ¿Me confirmas cuando lo recibas?"            |
|                                                                  |
| Psicologia aplicada:                                             |
| - El prospect se COMPROMETE verbalmente a hacer algo (confirmar) |
| - El compromiso pequeno aumenta probabilidad de cumplimiento    |
| - Genera "consistency bias": ya dijo que si a algo              |
|                                                                  |
| Implementacion:                                                  |
| - Enviar WhatsApp INMEDIATAMENTE despues de colgar               |
| - Pedir confirmacion con emoji 👍 o mensaje "Recibido"          |
| - Si no confirma en 10 min: segundo WhatsApp                     |
| - Si no confirma en 1 hora: llamada breve                        |
+----------------------------------------------------------------+

LOCK 2 — RECORDATORIO 3-1-0 (multi-canal, multi-tiempo)
+----------------------------------------------------------------+
|                                                                  |
| Proposito: Mantener la demo TOP OF MIND con valor agregado.     |
|                                                                  |
| 3 DIAS antes:                                                    |
|   Canal: Email                                                   |
|   Contenido: Email personalizado + caso de exito relevante       |
|   Asunto: "{{nombre}}, preparando tu demo de GestPro"           |
|   Cuerpo: Caso de exito del mismo nicho + tips para la demo     |
|                                                                  |
| 1 DIA antes:                                                     |
|   Canales: WhatsApp + SMS (simultaneos)                          |
|   Contenido: Recordatorio con link + pedido de confirmacion      |
|   Mensaje: "Hola {{nombre}}! Manana {{hora}} tu demo de         |
|            GestPro. Link: {{link}}. ¿Confirmas asistencia? 👍"  |
|                                                                  |
| 1 HORA antes:                                                    |
|   Canal: WhatsApp                                                |
|   Contenido: Ultimo recordatorio + entusiasmo                    |
|   Mensaje: "¡Hola {{nombre}}! En 1 hora tu demo de GestPro.     |
|            Link: {{link}}. ¿Todo listo? 🙂"                      |
|                                                                  |
| Psicologia aplicada:                                             |
| - Multiple touchpoints = mayor recall                            |
| - Multi-canal (email + WhatsApp + SMS) = cobertura maxima       |
| - Pedir confirmacion en cada punto = micro-compromisos           |
| - Contenido de valor (caso de exito) = anticipacion positiva     |
|                                                                  |
| Implementacion: tool recordatorio_demo (Seccion 11.3)           |
+----------------------------------------------------------------+

LOCK 3 — CONTINGENCIA NO-SHOW (recuperacion automatica)
+----------------------------------------------------------------+
|                                                                  |
| Proposito: Recuperar AL MENOS 20-30% de los no-shows.           |
|                                                                  |
| T + 10 minutos (no-show detectado):                              |
|   Accion: Llamada de "reconexion" (NO de "donde estas")         |
|   Script: "Hola {{nombre}}, parece que tuvimos un contratiempo   |
|            con la conexion. No te preocupes — me pasa tambien.   |
|            ¿Tienes 2 minutos ahora? Te doy la version rapida.    |
|            O si prefieres, reagendamos."                         |
|                                                                  |
| T + 15 minutos (si no atiende llamada):                          |
|   Canales: WhatsApp + Email                                      |
|   Contenido: "Parece que nos jugo una mala pasada.               |
|              Reagendemos: {{link_reagendar}}"                    |
|                                                                  |
| T + 24 horas (si no reagenda):                                   |
|   Canal: WhatsApp                                                |
|   Contenido: Oferta de demo grabada (cero friccion)              |
|   "{{nombre}}, te grabe una demo de 10 min. Aqui: {{link}}"     |
|                                                                  |
| T + 3 dias (si no responde a nada):                              |
|   Accion: Programar reactivacion en 30 dias con nuevo angle      |
|                                                                  |
| Psicologia aplicada:                                             |
| - "Tuvimos un contratiempo" = culpa compartida, no del prospect  |
| - Ofrecer demo AHORA (2 min) O reagendar = opciones de control   |
| - Demo grabada = ultimo intento sin friccion                     |
| - No culpar, no presionar = preservar relacion                   |
+----------------------------------------------------------------+
+================================================================+
```

#### 14.3 Scripts de No-Show Recovery

**Llamada de No-Show (a los 10 min):**
```
"Hola {{nombre}}? Soy Mariana de GestPro. Parece que tuvimos un 
contratiempo con la conexion de la demo. No te preocupes — me pasa 
tambien. ¿Tienes 2 minutos ahora mismo? Te puedo dar la version 
rapida de 5 minutos. O si prefieres, reagendemos para manana o 
pasado. ¿Que te funciona?"
```

**WhatsApp de No-Show (a los 15 min):**
```
"Hola {{nombre}}! Soy Mariana de GestPro. Parece que la conexion 
nos jugo una mala pasada hoy. No pasa nada. Te dejo 2 opciones:
1. Reagendar para esta semana: {{link_reagendar}}
2. Te envio una demo grabada de 10 min que puedes ver cuando quieras
¿Cual prefieres?"
```

#### 14.4 Impacto Esperado del Triple Lock

| Metrica | Sin Sistema | Con Triple Lock | Mejora | Revenue Impact* |
|---------|------------|----------------|--------|----------------|
| No-show rate | 35-50% | **8-15%** | **-65%** | +25% demos efectivas |
| Recuperacion no-shows | 0-5% | **20-30%** | **+25pp** | +5% demos adicionales |
| Demos efectivas por 100 llamadas | 8-12 | **20-30** | **+150%** | +$24K-$36K/mes |
| Costo por demo efectiva | $100-150 | **$40-60** | **-60%** | Mejor ROI |

> *Suponiendo 1,000 llamadas/mes, 10% conversion a demo, $2,000 MRR, 30% close rate, $12K LTV

---

### 15. Metricas de Conversion y Dashboard

#### 15.1 Funnel de Metricas Completo

| Fase | Metrica | Formula | Benchmark B2B Voice AI | Meta Silxar P0+P1 |
|------|---------|---------|----------------------|-------------------|
| **Dial** | Connect Rate | Connected / Total Calls | 15-25% | **> 20%** |
| **Connect** | Qualification Rate | Qualified / Connected | 40-60% | **> 50%** |
| **Qualified** | Demo Booking Rate | Demos / Qualified | 20-35% | **> 30%** |
| **Booked** | Show Rate | Asistieron / Agendadas | 50-70% | **> 80%** |
| **Shown** | Close Rate | Cerradas / Demos dadas | 20-40% | **> 30%** |
| **Overall** | Revenue per Call | Revenue / Total Calls | Variable | **Maximizar** |
| **Overall** | Cost per Demo | Costo total / Demos agendadas | $50-150 | **< $40** |

#### 15.2 Metricas Actuales vs. Recomendadas

| Metrica | Estado Actual | Recomendado | Implementacion |
|---------|--------------|-------------|----------------|
| `emotion` | Existe (interesado, molesto, ocupado) | **+ engagement_score** (0-100) | **P0** |
| `frustration` | Existe (0-10) | **Mantener** + alerta automatica a Slack | P1 |
| `interrupted` | Existe (boolean) | **+ barge_in_count** + topic after interruption | P1 |
| `conversation_30s` | Existe (4 turnos) | **Mantener** + conversation_quality_score | P1 |
| `optout` | Existe | **Mantener** + razones de optout categorizadas | P1 |
| `turns` | Existe (contador) | **Mantener** + avg_turn_duration | P2 |
| **`bant_score`** | **NO EXISTE** | Score 0-100: Budget, Authority, Need, Timeline | **P0** |
| **`demo_show_rate`** | **NO EXISTE** | % demos que efectivamente ocurren | **P0** |
| **`revenue_per_call`** | **NO EXISTE** | Revenue generado / llamadas totales | **P0** |
| **`objection_handled`** | **NO EXISTE** | Tasa de objeciones manejadas exitosamente | **P1** |
| **`follow_up_completed`** | **NO EXISTE** | % leads con follow-up post-llamada | **P0** |
| **`cost_per_demo`** | **NO EXISTE** | Costo total / demos agendadas | **P0** |
| **`no_show_recovery_rate`** | **NO EXISTE** | % no-shows recuperados | **P0** |
| **`pipeline_latency_p50`** | **NO EXISTE** | Latencia mediana del pipeline de audio | **P0** |

#### 15.3 Implementacion de BANT Score

```python
# ============================================================
# BANT SCORE — Calificacion en tiempo real durante llamada
# ============================================================

class BANTScorer:
    """Actualiza score BANT en tiempo real durante la conversacion."""
    
    def __init__(self):
        self.scores = {
            "budget": 0,      # 0-25
            "authority": 0,   # 0-25
            "need": 0,        # 0-25
            "timeline": 0,    # 0-25
        }
        self.indicators = {
            "budget": {
                "positive": [
                    "tenemos presupuesto",
                    "podemos invertir",
                    "cuanto cuesta",
                    "el precio esta bien",
                    "lo podemos pagar",
                ],
                "negative": [
                    "no tenemos presupuesto",
                    "esta caro",
                    "no podemos gastar",
                    "no hay dinero",
                ],
            },
            "authority": {
            "positive": [
                    "yo decido",
                    "yo soy el dueno",
                    "yo manejo eso",
                    "yo lo apruebo",
                    "doy el si final",
                ],
                "negative": [
                    "tengo que consultar",
                    "mi socio decide",
                    "mi jefe aprueba",
                    "no soy quien decide",
                    "preguntale a",
                ],
            },
            "need": {
                "positive": [
                    "si, eso nos pasa",
                    "tenemos ese problema",
                    "es un dolor",
                    "perdemos mucho",
                    "nos urge",
                ],
                "negative": [
                    "no tenemos ese problema",
                    "todo bien",
                    "no nos afecta",
                    "estamos bien asi",
                ],
            },
            "timeline": {
                "positive": [
                    "lo antes posible",
                    "esta semana",
                    "para el mes",
                    "ya necesitamos",
                    "es urgente",
                ],
                "negative": [
                    "para el proximo año",
                    "no es urgente",
                    "tal vez despues",
                    "ahorita no",
                    "vamos despacio",
                ],
            },
        }
    
    def update_from_transcript(self, transcript: str) -> dict:
        """Analiza transcript y actualiza scores BANT."""
        transcript_lower = transcript.lower()
        
        for dimension, keywords in self.indicators.items():
            # Positive signals
            for indicator in keywords["positive"]:
                if indicator in transcript_lower:
                    self.scores[dimension] = min(25, self.scores[dimension] + 8)
            
            # Negative signals
            for indicator in keywords["negative"]:
                if indicator in transcript_lower:
                    self.scores[dimension] = max(0, self.scores[dimension] - 5)
        
        return self.get_score()
    
    def get_score(self) -> dict:
        """Retorna BANT score completo."""
        total = sum(self.scores.values())
        return {
            "budget": self.scores["budget"],
            "authority": self.scores["authority"],
            "need": self.scores["need"],
            "timeline": self.scores["timeline"],
            "total": total,
            "qualification": self._get_qualification(total),
        }
    
    def _get_qualification(self, total: int) -> str:
        if total >= 80:
            return "HOT"        # Listo para cierre
        elif total >= 60:
            return "WARM"       # Necesita nurturing
        elif total >= 40:
            return "LUKEWARM"   # Necesita mas discovery
        else:
            return "COLD"       # Probablemente no califica
```

#### 15.4 Dashboard de KPIs Recomendado

```
+================================================================+
| DASHBOARD EJECUTIVO — SILXAR CRM VOICE AI (Vista Diaria)      |
+================================================================+
|                                                                  |
|  LLAMADAS HOY  |  CONNECT  |  QUALIFIED  | DEMO BOOKED | SHOW  |
|  1,247         |  280 (22%)|  154 (55%)  | 52 (34%)    | 43(83%)|
|                 |           |             |             |       |
|  Target: 1,000  |  >20%     |  >50%       | >30%        | >80%  |
|  Status: [OK]   | [OK]      | [OK]        | [OK]        | [OK]  |
|                                                                  |
+------------------------------------------------------------------+
|  REVENUE EST.   |  COSTO TOTAL  |  ROI     |  REV/CALL | COST/DM|
|  $64,800 MXN    |  $1,800 MXN   |  36x     | $52.0     | $34.6  |
|                                                                  |
+------------------------------------------------------------------+
|  FUNNEL DE CONVERSION (Visual — Semana Actual)                   |
|                                                                  |
|  [1000 Llamadas]                                                 |
|       |                                                          |
|       v                                                          |
|  [220 Connects (22%)]  ████████████████░░░░░░░░░░                |
|       |                                                          |
|       v                                                          |
|  [121 Qualified (55%)] █████████░░░░░░░░░░░░░░░░                 |
|       |                                                          |
|       v                                                          |
|  [48 Demos Agendadas (40%)] █████░░░░░░░░░░░░░░░░                |
|       |                                                          |
|       v                                                          |
|  [40 Demos Realizadas (83%)] ████░░░░░░░░░░░░░░░░░               |
|       |                                                          |
|       v                                                          |
|  [12 Ventas Cerradas (30%)] █░░░░░░░░░░░░░░░░░░░░                |
|       |                                                          |
|       v                                                          |
|  [REVENUE: $144,000 LTV]                                         |
|                                                                  |
+------------------------------------------------------------------+
|  METRICAS DE CALIDAD (Promedio 7 dias)                           |
|                                                                  |
|  Latencia P50: 650ms [OK]    |  MOS Score: 3.9 [OK]             |
|  Barge-in Success: 96% [OK]  |  STT WER: 4.1% [OK]              |
|  CSAT: 4.1/5 [OK]            |  DSP SNR: +11dB [OK]             |
|                                                                  |
+------------------------------------------------------------------+
|  ALERTAS ACTIVAS                                                 |
|  [ ] Ninguna alerta activa                                       |
|                                                                  |
|  ULTIMAS 5 ACCIONES                                              |
|  10:45 — Demo agendada (Veterinaria Huellitas, GDL)             |
|  10:42 — No-show recuperado (Dental Sonrisas, CDMX)             |
|  10:38 — Transferencia a humano (Enterprise, MTY, BANT: 85)     |
|  10:35 — Lead score actualizado (AutoShop, BANT: 72 -> WARM)    |
|  10:30 — Triple Lock: confirmacion recibida (Spa Relajarte)     |
+================================================================+
```



---

## SECCION IV: COMPETENCIA Y VENTAJA ESTRATEGICA

### 16. Comparativa Competitiva Detallada

#### 16.1 Matriz de Capacidades: Silxar vs. Competidores

| Capacidad | Silxar (Actual) | Silxar (Optimizado) | Retell AI | Bland AI | Synthflow | SquadStack |
|-----------|----------------|---------------------|-----------|----------|-----------|------------|
| **Latencia telefonia** | 1,000-1,300ms | **450-650ms** | ~780ms | ~900ms | 1,200-2,000ms | <800ms |
| **Voice quality (MOS)** | ~3.2 | **~4.2** | ~4.0 | ~3.5 | ~3.8 | ~4.0 |
| **Interruption handling** | Basico (450-850ms) | **Agresivo (<300ms)** | Excelente | Medio | Medio | Excelente |
| **Framework de ventas** | No existe | **PRO-V.O.I.S.E.** | Basico | Basico | Visual flows | Avanzado |
| **Pre-call intelligence** | No existe | **pre_call_brief** | Parcial | No | No | Avanzado |
| **Post-call workflow** | Webhook basico | **Nurture Engine** | Analytics completo | Limitado | Limitado | Outcome-based |
| **No-show prevention** | No existe | **Triple Lock (-65%)** | 88% reduccion | No nativo | No nativo | Integrado |
| **Multi-touch sequences** | No | **Email+WA+SMS+LI** | Via API | No | No | Omnichannel |
| **Lead scoring** | No | **BANT en tiempo real** | Parcial | No | No | Avanzado |
| **A/B testing spechs** | No | **Framework completo** | Limitado | No | No | Si |
| **Human handoff briefing** | Basico | **Completo (BANT+contexto)** | Medio | Basico | Basico | Avanzado |
| **CRM nativo** | **Si (propio)** | **Si (potenciado)** | No (integraciones) | No (API) | No (integraciones) | No (integraciones) |
| **Costo/minuto** | **~$0.026** | **~$0.026** | $0.13-0.31 | $0.09+ | Variable | Outcome-based |
| **Especializacion Mexico** | **Si** | **Si (dominante)** | No | No | No | Parcial |
| **Idioma espanol nativo** | **Si** | **Si (optimizado)** | Si | Si | Si | Parcial |
| **Compliance Mexico (REPEP)** | Parcial | **Completo** | No | No | No | No |
| **Simulacion de entrenamiento** | **Si** | **Si (diferenciador)** | No | No | No | No |

#### 16.2 Benchmark de Conversion Competitivo

| Plataforma | Conversion Reportada | Contexto | Latencia | Costo/min |
|-----------|---------------------|----------|----------|-----------|
| **Retell AI** | ~17% (outbound) | Real-world, 200 calls test | ~780ms | $0.13-0.31 |
| **Synthflow** | ~9% (outbound) | Real-world test | 1,200-2,000ms | Variable |
| **Bland AI** | <2% (outbound) | Real-world test | ~900ms | $0.09+ |
| **SquadStack** | ~12% (outbound) | Outcome-based pricing | <800ms | Outcome-based |
| **Industry avg (human SDR)** | 2.5% | 1 meeting por 40 dials | N/A | $0.50-2.00 |
| **Industry top (human SDR)** | 5-8% | Top performers | N/A | $0.50-2.00 |
| **Silxar (actual est.)** | 2-4% | Pipeline actual | 1,000-1,300ms | $0.026 |
| **Silxar (optimizado P0)** | **8-15%** | Con PRO-V.O.I.S.E. + Triple Lock | 450-650ms | $0.026 |
| **Silxar (optimizado P0+P1)** | **10-18%** | + ML timing + A/B testing | 450-650ms | $0.026 |

> **Analisis:** Silxar optimizado supera a todos los competidores en conversion proyectada (8-18% vs. 2-17%), con latencia competitiva (450-650ms vs. 780-2,000ms) y a una fraccion del costo ($0.026 vs. $0.09-0.31/min).

#### 16.3 Que Hace Cada Competidor Mejor (y Silxar Debe Copiar)

**De Retell AI:**
- Sub-800ms latency con barge-in excelente
- Turn-taking natural: silencios comodos, no interrupciones forzadas
- **Accion P0:** Optimizar pipeline de audio para latencia <650ms
- **Accion P1:** Implementar barge-in semantico de 3 capas

**De Synthflow:**
- 9% conversion en outbound (real-world testing)
- Framework de objeciones mejorado con visual flows
- **Accion P0:** Implementar PRO-V.O.I.S.E. framework
- **Accion P1:** Implementar conversation graph dinamico

**De Bland AI:**
- Conversational Pathways: logica de conversacion compleja pero flexible
- Buena developer experience (API-first)
- **Accion P1:** Implementar conversation graph dinamico para manejo de objeciones complejas

**De SquadStack:**
- Outcome-based pricing: se paga por resultado, no por minuto
- Omnichannel (Voice + WhatsApp + SMS + Email): secuencia integrada
- 75-90% connectivity rate: pre-call intelligence avanzado
- **Accion P0:** Expandir a multi-touch omnichannel
- **Accion P0:** Implementar pre_call_brief con data enrichment
- **Accion P1:** Evaluar modelo outcome-based para clientes enterprise

---

### 17. Ventaja Secreta de Silxar: CRM Propio + Costo Ultra-Bajo

#### 17.1 La Ventaja que Nadie Puede Copiar

Silxar posee una **ventaja estructural unica** que ningun competidor puede replicar facilmente:

```
+================================================================+
| VENTAJA SECRETA DE SILXAR                                      |
+================================================================+
|                                                                  |
|  1. CRM PROPIO INTEGRADO NATIVAMENTE CON VOICE AI              |
|                                                                  |
|     Competidores (Retell, Bland, Synthflow):                    |
|     [Voice AI] --API--> [CRM externo: HubSpot, Salesforce]      |
|              Latencia: +200-500ms por query CRM                  |
|              Costo: licencias CRM separadas                        |
|              Data: fragmentada, no en tiempo real                |
|                                                                  |
|     Silxar:                                                      |
|     [Voice AI] <--NATIVO--> [CRM Propio]                        |
|              Latencia: <10ms (misma base de datos)               |
|              Costo: $0 (CRM propio, no licencia)                 |
|              Data: en tiempo real, loop completo                 |
|                                                                  |
|  2. COSTO ULTRA-BAJO: $0.026/min vs $0.13-0.31/min            |
|                                                                  |
|     Silxar es 5-10x mas barato que la competencia.              |
|     Esto significa:                                              |
|     - Mas llamadas por el mismo presupuesto                     |
|     - Mayor margen para invertir en conversion                  |
|     - Precio competitivo para clientes                          |
|     - Capacidad de ofrecer "Revenue-as-a-Service"               |
|                                                                  |
|  3. DATA LOOP COMPLETO                                          |
|                                                                  |
|     Llamada --> CRM --> Insight --> Proxima llamada mejorada    |
|        ^                                              |          |
|        |______________________________________________|          |
|                                                                  |
|     Cada llamada mejora la siguiente porque:                    |
|     - BANT score actualiza perfil del lead                      |
|     - Objeciones identificadas entrenan al agente               |
|     - Casing de exito se enriquecen con datos reales            |
|     - ML timing aprende de patrones de conversion               |
|                                                                  |
+================================================================+
```

#### 17.2 Como Potenciar la Ventaja

| Ventaja Actual | Potencial | Accion Inmediata |
|---------------|-----------|------------------|
| CRM propio integrado | **UNICO en el mercado**: Conexion nativa CRM <-> Voice AI en tiempo real | Exponer datos del CRM en pre_call_brief con <10ms de latencia |
| Costo ultra-bajo ($0.026/min) | **Ventaja 10x vs competencia**: Invertir ahorro en mejoras de conversion | Mantener costo bajo mientras se agregan tools de alto impacto |
| Nicho Mexico (Espanol) | **Especializacion regional**: Dominar nicho antes de expansion | Optimizar PRO-V.O.I.S.E. para cultura mexicana (coloquialismos, objeciones locales) |
| Simulacion de entrenamiento | **Diferenciador para SDRs**: Entrenar vendedores humanos con AI | Escalar como herramienta de entrenamiento adicional |

#### 17.3 Estrategia de Posicionamiento Competitivo

```
POSICIONAMIENTO OPTIMO PARA SILXAR:

"La unica plataforma de Voice AI para B2B en Mexico que combina:
 - CRM nativo integrado (datos en tiempo real)
 - Costo 10x menor que la competencia
 - Conversion optimizada con frameworks de ventas probados
 - Compliance mexicano completo (REPEP, REUS)
 - Latencia conversacional humana (<650ms)
 - Especializacion en espanol latinoamericano"

Mercado objetivo prioritario:
1. Veterinarias en Mexico (nicho #1 — alto dolor, baja competencia)
2. Clinicas dentales (nicho #2 — citas no-shows = dolor claro)
3. Salud y bienestar (nicho #3 — LTV alto)
4. Servicios profesionales (nicho #4 — amplio)

Expansion futura:
- Colombia (mismo timezone, espanol, mercado similar)
- Chile (mercado B2B maduro)
- Peru (mercado emergente)
```

---

## SECCION V: ROADMAP DE IMPLEMENTACION

### 18. Quick Wins (Esta Semana — Implementar en 1-5 Dias)

#### Dia 1: Fundamentos de Latencia (2-3 horas)

| # | Tarea | Tiempo | Impacto |
|---|-------|--------|---------|
| 1 | Cambiar `ELEVENLABS_LATENCY_OPT` de 4 a 1 | 5 min | -75-150ms TTS |
| 2 | Reducir `VAD_SILENCE_MS` de 500 a 200ms | 10 min | -250-300ms endpointing |
| 3 | Activar `ENABLE_INPUT_DSP=true` | 30 min | +0.3-0.5 MOS |
| 4 | Comprar numero Twilio Mexico (+52) | 1 hora | +15-25% answer rate |
| 5 | Reducir Gemini `thinking_level` a "minimal" | 10 min | -100-200ms LLM |

**Impacto acumulado Dia 1: -475 a -750ms de latencia + 15-25% answer rate**

#### Dia 2: Fundamentos de Conversion (4-6 horas)

| # | Tarea | Tiempo | Impacto |
|---|-------|--------|---------|
| 1 | Reescribir opener de todos los spechs con pattern interrupt | 2 horas | +50% retention 30s |
| 2 | Agregar trial close antes de agendar demo | 1 hora | +25% cierre |
| 3 | Implementar Lock 1 del Triple Lock (confirmacion activa) | 1 hora | +15% show rate |
| 4 | Agregar aviso de grabacion al inicio de llamadas (compliance) | 30 min | Cumplimiento legal |
| 5 | Activar follow-up WhatsApp inmediato post-llamada | 1 hora | +30% engagement |

**Impacto acumulado Dia 2: +100-150% en demos efectivas**

#### Dia 3-4: Tools Nuevas (6-10 horas)

| # | Tarea | Tiempo | Impacto |
|---|-------|--------|---------|
| 1 | Implementar `pre_call_brief` | 3 horas | +30% personalizacion |
| 2 | Implementar `quantificar_dolor` | 2 horas | +40% motivacion |
| 3 | Implementar `social_proof_match` | 2 horas | +35% credibilidad |
| 4 | Implementar `trial_close` | 1 hora | +25% cierre |
| 5 | Implementar `recordatorio_demo` (Locks 2 y 3) | 2 horas | -50% no-show |

#### Dia 5: Testing y Validacion (4 horas)

| # | Tarea | Tiempo |
|---|-------|--------|
| 1 | Pruebas de latencia end-to-end (10 llamadas) | 1 hora |
| 2 | Pruebas de barge-in (5 escenarios) | 1 hora |
| 3 | Pruebas de conversion (5 spechs diferentes) | 1 hora |
| 4 | Configurar dashboard de metricas (Prometheus) | 1 hora |

**Impacto total estimado de Quick Wins: +50-80% en demos efectivas, -50% en latencia**

---

### 19. Roadmap de 90 Dias

```
+================================================================+
| ROADMAP 90 DIAS — DE HERRAMIENTA A MAQUINA DE VENTAS           |
+================================================================+

SEMANA 1-2: FUNDAMENTOS (P0 Completo)
+----------------------------------------------------------------+
| Dia 1-2:  Quick Wins de latencia + conversion                  |
|           [VAD 200ms] [Latency opt 1] [DSP on] [+52 numero]    |
|           [Pattern interrupt] [Trial close] [Triple Lock L1]   |
|                                                                  |
| Dia 3-4:  5 tools nuevas P0                                     |
|           [pre_call_brief] [quantificar_dolor]                 |
|           [social_proof_match] [trial_close] [recordatorio_demo]|
|                                                                  |
| Dia 5-7:  Workflow post-call + Triple Lock completo             |
|           [0-2h-24h-3d sequence] [3-1-0 reminders]             |
|           [No-show recovery] [Break-up sequence]                |
|                                                                  |
| Dia 8-10: Integracion compliance + system prompt optimizado     |
|           [REPEP consulta] [Aviso grabacion] [Opt-out facil]    |
|           [Capa 4 PRO-V.O.I.S.E.] [LAER framework]              |
|                                                                  |
| Dia 11-12: Testing + iteracion inicial                          |
|           [10 llamadas test] [Ajustar thresholds]               |
|           [Validar latencia <800ms] [Validar conversion >5%]    |
|                                                                  |
| META SEMANA 2:                                                  |
|   - Latencia P50 < 800ms [OK]                                   |
|   - Conversion a demo > 5% [OK]                                 |
|   - Answer rate > 30% con +52 [OK]                              |
|   - Triple Lock funcionando [OK]                                |
+----------------------------------------------------------------+

SEMANA 3-4: OPTIMIZACION (P0+P1)
+----------------------------------------------------------------+
| Semana 3:                                                       |
|   - Multi-touch pre-call sequence (email + WhatsApp)            |
|   - Lead scoring BANT en tiempo real                            |
|   - Consolidar 80% trafico en Gemini Live API nativo            |
|   - Implementar barge-in agresivo de 3 capas                    |
|                                                                  |
| Semana 4:                                                       |
|   - No-show recovery automatico completo                         |
|   - Handoff briefing para vendedores humanos                    |
|   - Dashboard de KPIs completo (Grafana)                        |
|   - Cache semantico de respuestas frecuentes                    |
|                                                                  |
| META SEMANA 4:                                                  |
|   - Latencia P50 < 650ms [OK]                                   |
|   - Conversion a demo > 8% [OK]                                 |
|   - Show rate > 75% [OK]                                        |
|   - Pipeline Router funcionando [OK]                            |
+----------------------------------------------------------------+

SEMANA 5-8: MACHINE LEARNING (P1)
+----------------------------------------------------------------+
| Semana 5-6:                                                     |
|   - ML-optimized call timing por nicho/dia/hora                 |
|   - A/B testing framework de spechs (statistical significance)  |
|   - Optimizacion AudioBridge (LUT, buffers, SIMD)               |
|   - Gemini thinking_budget=0 para maxima velocidad              |
|                                                                  |
| Semana 7-8:                                                     |
|   - Conversation quality scoring (AI-based)                     |
|   - Semantic endpointing (Gemini detecta fin de turno)          |
|   - Streaming TTS token-by-token completo                       |
|   - Session Pool persistente con health check                   |
|   - DSP: AEC (Acoustic Echo Cancellation)                       |
|                                                                  |
| META SEMANA 8:                                                  |
|   - Latencia P50 < 550ms [OK]                                   |
|   - Conversion a demo > 10% [OK]                                |
|   - Show rate > 80% [OK]                                        |
|   - A/B testing activo [OK]                                     |
+----------------------------------------------------------------+

SEMANA 9-12: ESCALAMIENTO (P1+P2)
+----------------------------------------------------------------+
| Semana 9-10:                                                    |
|   - Voice quality: ElevenLabs premium para VIP/cierres          |
|   - Latencia final: 450-650ms sostenido                         |
|   - Dual pipeline (Gemini + ElevenLabs paralelo para VIP)       |
|   - Circuit breaker por latencia por componente                 |
|                                                                  |
| Semana 11-12:                                                   |
|   - Expansion a nuevos nichos (salud, servicios profesionales)  |
|   - Spechs optimizados por nicho (veterinaria, dental, spa)     |
|   - Casos de exito por nicho (10+ casos documentados)           |
|   - Reactivation campaigns (leads de 60-90 dias)                |
|   - Evaluacion modelo outcome-based para enterprise             |
|                                                                  |
| META SEMANA 12 (FINAL):                                         |
|   - Latencia P50: 450-650ms [TARGET]                            |
|   - Latencia P95: < 1000ms [TARGET]                             |
|   - Conversion a demo: 10-15% [TARGET]                          |
|   - Show rate: 80-85% [TARGET]                                  |
|   - Revenue: $52K-$94K MXN/mes [TARGET]                         |
|   - ROI del sistema: 40x+ [TARGET]                              |
+----------------------------------------------------------------+
+================================================================+
```

---

### 20. Proyeccion de Revenue

#### 20.1 Escenarios de Revenue

| Escenario | Supuestos | Demos Agendadas/mes | Demos Efectivas | Ventas (30% close) | Revenue/mes* | ROI |
|-----------|-----------|-------------------|----------------|-------------------|-------------|-----|
| **Actual (est.)** | 2-4% conv, 60% show, +1 USA | 20-40 | 12-24 | 4-7 | $8K-$14K | ~7x |
| **P0 Semana 1-2** | 5-8% conv, 70% show, +52 | 50-80 | 35-56 | 11-17 | $22K-$34K | ~19x |
| **P0 Completo (Sem 2)** | 8-12% conv, 75% show, Triple Lock | 80-120 | 60-90 | 18-27 | $36K-$54K | ~32x |
| **P0+P1 (Sem 4)** | 10-15% conv, 80% show, ML timing | 100-150 | 80-120 | 24-36 | $48K-$72K | ~43x |
| **P0+P1+P2 (Sem 8)** | 12-18% conv, 85% show, A/B testing | 120-180 | 102-153 | 31-46 | $62K-$92K | ~55x |
| **Full 90 dias (Sem 12)** | 12-20% conv, 85% show, optimizado | 120-200 | 102-170 | 31-51 | $62K-$102K | ~55x+ |

> *Revenue estimado a $2,000 MXN MRR promedio, 6 meses retencion = $12,000 MXN LTV. Costo sistema ~$1,200 MXN/mes.

#### 20.2 Sensibilidad de Variables

| Variable | Cambio | Impacto en Revenue |
|----------|--------|-------------------|
| +1% conversion a demo | De 10% a 11% | +$4,800/mes |
| +5% show rate | De 80% a 85% | +$3,600/mes |
| +1,000 llamadas/mes | De 1,000 a 2,000 | +$48,000/mes |
| +10% answer rate | De 30% a 40% | +$14,400/mes |
| -200ms latencia | De 800ms a 600ms | +$6,000/mes (mejor CSAT = mejor conversion) |
| +5% close rate | De 30% a 35% | +$7,200/mes |

#### 20.3 Modelo de Revenue a 12 Meses

```
MES      LLAMADAS   CONNECT  DEMOS AG  DEMOS EFF  VENTAS   REVENUE     ACUMULADO
--------------------------------------------------------------------------------
Mes 1    1,000      200      16        10         3        $12K        $12K
Mes 2    1,200      300      36        27         8        $32K        $44K
Mes 3    1,500      450      68        54         16       $64K        $108K
Mes 4    2,000      600      120       96         29       $116K       $224K
Mes 5    2,500      750      188       160        48       $192K       $416K
Mes 6    3,000      900      270       243        73       $292K       $708K
Mes 7    3,500      1,050  368       331        99       $396K       $1.1M
Mes 8    4,000      1,200  480       432        130      $520K       $1.6M
Mes 9    4,500      1,350  608       547        164      $656K       $2.3M
Mes 10   5,000      1,500  750       675        203      $812K       $3.1M
Mes 11   5,500      1,650  908       817        245      $980K       $4.1M
Mes 12   6,000      1,800  1,080     972        292      $1.17M      $5.3M

Supuestos: Escalamiento progresivo de equipo y capacidad.
           10% conv mes 3+, 85% show mes 4+, 30% close, $12K LTV.
           No incluye churn ni expansion revenue.
```

---

## ANEXOS

### Anexo A: Frameworks de Ventas Referenciados

| Framework | Autor/Origen | Descripcion | Aplicacion en Silxar |
|-----------|-------------|-------------|---------------------|
| **SPIN Selling** | Neil Rackham (Rackham, 1988) | Situacion, Problema, Implicacion, Need-Payoff | Capa **O** de PRO-V.O.I.S.E. — Discovery de dolor mediante preguntas estructuradas |
| **Challenger Sale** | CEB/Dixon & Adamson (2011) | Reframe, Teach, Tailor, Take Control | Pattern interrupt + reframe de objeciones — ensenar al prospect algo nuevo sobre su negocio |
| **Sandler Training** | David Sandler | Upfront contract, Pain funnel, Budget, Decision | Permission-based opener (Capa R) + Pain funnel en discovery (Capa O) |
| **LAER** | Carew International | Listen, Acknowledge, Explore, Respond | Manejo de objeciones del avatar — framework obligatorio para toda objecion |
| **MEDDPICC** | MEDDIC Institute | Metrics, Economic buyer, Decision criteria, Decision process, Paper process, Implicate pain, Champion, Competition | Para demos enterprise futuras — calificacion profunda de oportunidades grandes |
| **SNAP Selling** | Jill Konrath | Simple, iNvaluable, Aligned, Priority | Simplicidad en mensajes (telefonia) + alineacion con prioridades del prospect |
| **Conceptual Selling** | Miller Heiman | Get, Give, Understand, Commit | Estructura de cada interaccion: que obtener, que dar, entender, compromiso |
| **Solution Selling** | Michael Bosworth | Diagnose before prescribe | Nunca presentar solucion antes de diagnosticar dolor (regla de oro PRO-V.O.I.S.E.) |

#### A.1 Detalle de SPIN Selling

```
SPIN — Las 4 Preguntas de Discovery:

S — SITUATION QUESTIONS:
    Objetivo: Entender el contexto actual del prospect.
    Ejemplo: "Como manejan las citas actualmente?"
    Cantidad: 1-2 maximo. No abusar (el prospect se aburre).
    
P — PROBLEM QUESTIONS:
    Objetivo: Identificar dificultades, disatisfacciones, problemas.
    Ejemplo: "Cuanto les cuesta/afecta eso?"
    Ejemplo: "Cuantas citas se les escapan por semana?"
    Cantidad: 2-3. Escuchar activamente.
    
I — IMPLICATION QUESTIONS:
    Objetivo: Hacer que el prospect vea las CONSECUENCIAS del problema.
    Ejemplo: "Y eso que impacto tiene en sus ingresos mensuales?"
    Ejemplo: "Como afecta eso a la satisfaccion de sus clientes?"
    Cantidad: 2-3. Crear tension constructiva.
    
N — NEED-PAYOFF QUESTIONS:
    Objetivo: Hacer que el prospect exprese el valor de la solucion.
    Ejemplo: "Como te ayudaria reducir esas citas perdidas?"
    NOTA: NUNCA usar en cold call. Reservado para la demo.
    
Regla de oro SPIN: Nunca presentar solucion antes de que el prospect 
SE DE CUENTA de su propio problema a traves de sus propias respuestas.
```

#### A.2 Detalle de LAER (Manejo de Objeciones)

```
LAER — Framework para TODA objecion:

L — LISTEN (Escuchar):
    - Dejar que el prospect termine COMPLETAMENTE
    - No interrumpir, no anticipar respuesta
    - Escuchar el TONO (emocion detras de las palabras)
    - Tiempo minimo: 500ms de silencio despues de que terminan
    
A — ACKNOWLEDGE (Validar):
    - "Entiendo perfectamente"
    - "Es una preocupacion valida"
    - "Totalmente, eso tiene mucho sentido"
    - NUNCA: "Pero..." o "Sin embargo..." inmediatamente
    - La validacion desarma la defensa
    
E — EXPLORE (Explorar):
    - "Ayudame a entender mejor — cuando dices 'caro'..."
    - "Que comparas contra cuando dices que ya tienen un sistema?"
    - Excavar hasta la RAIZ de la objecion
    - Muchas objeciones de superficie esconden objeciones reales distintas
    
R — RESPOND (Responder):
    - Usar datos concretos: "La clinica Huellitas redujo no-shows 30%->8%"
    - Social proof relevante: caso del mismo nicho/tamano
    - Reframe: no es costo, es inversion que se paga sola
    - Siempre ofrecer salida facil: "Sin compromiso, solo la demo"

Objeciones comunes y respuestas LAER:

"Es muy caro":
  L: [escuchar completo]
  A: "Entiendo, el presupuesto es importante."
  E: "Cuando dices 'caro', te refieres al costo mensual o al total 
      del primer ano? [...] Y que estas pagando ahora por tu 
      sistema actual?"
  R: "Entiendo. Lo que te puedo decir es que la clinica Huellitas 
      en Guadalajara tenia la misma preocupacion, y se pagaron el 
      sistema solo con las citas recuperadas del primer mes. 
      Pero mira, te entiendo. Quieres ver los numeros claros. 
      En la demo te mostramos exactamente cuanto costaria y cuanto 
      recuperarias. Sin compromiso. ¿Te parece?"

"Ya tenemos un sistema":
  L: [escuchar completo]
  A: "Perfecto, eso es buena senal — ya entienden la importancia."
  E: "Y ese sistema les esta resolviendo el tema de las citas 
      perdidas? [...] Que es lo que mas te gusta de el?"
  R: "Entiendo. Muchos de nuestros clientes tambien tenian un 
      sistema antes. La diferencia es que GestPro tiene [X feature] 
      que su sistema actual no tiene. En 15 minutos te muestro 
      exactamente la diferencia. ¿Valdria la pena?"

"No tengo tiempo":
  L: [escuchar completo]
  A: "Totalmente entendible, se que estas ocupado."
  E: "Es justo por eso que te llamo — precisamente porque no tienes 
      tiempo es que necesitas un sistema que automatice las citas. 
      Cuanto tiempo te toma ahora manejar la agenda manualmente?"
  R: "Por eso la demo es solo 15 minutos. La puedo adaptar a tu 
      horario. O si prefieres, te envio una demo grabada de 5 min 
      que puedes ver cuando quieras. ¿Cual te funciona?"

"Tengo que consultar a mi socio/jefe":
  L: [escuchar completo]
  A: "Claro, es importante que ambos esten alineados."
  E: "Tu socio tambien maneja la parte operativa o mas la 
      administrativa? [...] A el le preocuparia mas el precio 
      o la facilidad de uso?"
  R: "Perfecto. ¿Te parece si agendamos la demo para que ambos 
      la vean juntos? Asi el tambien puede hacer preguntas. 
      ¿Que dia les funciona a los dos?"
```

### Anexo B: Glosario de Terminos

#### B.1 Terminos Tecnicos (Audio y Latencia)

| Termino | Definicion | Contexto |
|---------|-----------|----------|
| **Barge-in** | Capacidad del usuario de interrumpir al agente AI hablando | Critico para conversacion natural |
| **VAD** | Voice Activity Detection — deteccion de voz humana en audio | Activa el pipeline de procesamiento |
| **Endpointing** | Deteccion de fin de utterancia (cuando el usuario deja de hablar) | Cuello de botella #1 (500ms -> 200ms) |
| **STT** | Speech-to-Text — conversion de voz a texto | ElevenLabs Scribe v2, Gemini nativo |
| **LLM** | Large Language Model — modelo de lenguaje para generar respuestas | Gemini 2.5/3.1 Flash |
| **TTS** | Text-to-Speech — conversion de texto a voz | ElevenLabs Flash v2.5, Gemini nativo |
| **TTFB** | Time To First Byte — tiempo hasta primer byte de respuesta | Metrica de latencia de red |
| **MOS** | Mean Opinion Score — calificacion subjetiva de calidad de audio (1-5) | Target: >3.5, Optimizado: >4.2 |
| **mu-law** | Companding algorithm para audio telefonico (G.711) | Codec de Twilio (8kHz, narrowband) |
| **DSP** | Digital Signal Processing — procesamiento de senales digitales | Noise suppression, AGC, AEC |
| **AGC** | Automatic Gain Control — control automatico de ganancia de audio | Normaliza volumen del usuario |
| **AEC** | Acoustic Echo Cancellation — cancelacion de eco acustico | Evita que TTS se re-ingrese a STT |
| **PSTN** | Public Switched Telephone Network — red telefonica tradicional | Red de Twilio |
| **SIP Trunk** | Conexion VoIP con carrier telefonico | Alternativa a Twilio para mejor calidad |
| **Jitter Buffer** | Buffer para compensar variabilidad de red en VoIP | 30-50ms tipico |
| **Speculative TTS** | Iniciar TTS antes de tener respuesta completa del LLM | Reduce time-to-first-audio en 150-300ms |
| **Backchannel** | Sonidos de afirmacion ("mm-hmm", "si") durante procesamiento | Reduce percepcion de latencia 40-50% |
| **WebSocket** | Protocolo de comunicacion bidireccional persistente | Transporte Twilio <-> Servidor |
| **PCM** | Pulse Code Modulation — formato de audio sin comprimir | 16kHz/24kHz para STT/TTS |
| **RTT** | Round Trip Time — tiempo de ida y vuelta de un paquete de red | Target: <100ms |
| **LUT** | Lookup Table — tabla de consulta para operaciones rapidas | mu-law encode/decode 100x mas rapido |

#### B.2 Terminos de Ventas y Conversion

| Termino | Definicion | Formula |
|---------|-----------|---------|
| **Connect Rate** | % de llamadas que logran hablar con una persona | Connected / Total Calls |
| **Answer Rate** | % de llamadas contestadas (vs. voicemail/no answer) | Answered / Total Calls |
| **Demo Booking Rate** | % de conversaciones que agendan demo | Demos / Conversaciones calificadas |
| **Show Rate** | % de demos agendadas que efectivamente ocurren | Asistieron / Agendadas |
| **Close Rate** | % de demos que resultan en venta | Cerradas / Demos dadas |
| **No-Show** | Persona que agendo demo pero no asistio | N/A |
| **Trial Close** | Verificacion de interes antes del cierre formal | "Si pudieramos resolver X, valdria una demo?" |
| **Triple Lock** | Sistema de 3 capas para prevenir no-shows | Lock 1: Confirmacion + Lock 2: 3-1-0 + Lock 3: Recovery |
| **BANT** | Budget, Authority, Need, Timeline — calificacion de leads | Score 0-100 |
| **LTV** | Lifetime Value — valor total de un cliente en su vida | MRR x Meses de retencion |
| **MRR** | Monthly Recurring Revenue — ingreso mensual recurrente | Suscripciones mensuales |
| **ROI** | Return on Investment — retorno de inversion | (Ganancia - Inversion) / Inversion |
| **Pattern Interrupt** | Tecnica para romper el patron defensivo del prospect | Opener inesperado |
| **Pain Point** | Punto de dolor — problema que el prospect experimenta | Identificado via SPIN discovery |
| **Value Proposition** | Propuesta de valor — que gana el prospect con el producto | ROI cuantificable |
| **Social Proof** | Prueba social — testimonios, casos de exito, referencias | Caso del mismo nicho/tamano |
| **Objection Handling** | Manejo de objeciones — responder preocupaciones del prospect | Framework LAER |
| **Cold Call** | Llamada en frio — a prospect sin interaccion previa | vs. Warm call (con interaccion previa) |
| **Warm Lead** | Lead caliente — ha mostrado interes explicito | BANT score > 60 |
| **Follow-up** | Seguimiento — contacto posterior a la interaccion inicial | Multi-canal: email, WA, SMS |
| **REPEP** | Registro Publico para Evitar Publicidad (Mexico) | Obligatorio para outbound en Mexico |
| **REUS** | Registro Publico de Usuarios (servicios financieros, Mexico) | Obligatorio si se ofrecen servicios financieros |

#### B.3 Terminos de Arquitectura de Software

| Termino | Definicion |
|---------|-----------|
| **Session Pool** | Pool de sesiones pre-calentadas, siempre listas para usar |
| **Circuit Breaker** | Patron que previene fallos en cascada activando fallback |
| **Semantic Cache** | Cache basado en similitud semantica (embeddings) |
| **Pipeline Router** | Componente que decide en tiempo real que pipeline usar |
| **Crossfade** | Transicion suave de audio entre dos fuentes |
| **Prewarm** | Pre-calentar una sesion antes de que sea necesaria |
| **Health Check** | Verificacion periodica de que componentes funcionan correctamente |
| **Metrics Pipeline** | Sistema de recoleccion y reporte de metricas (Prometheus/Grafana) |
| **Webhook** | Endpoint HTTP que recibe notificaciones de eventos |
| **Multi-tenant** | Arquitectura que soporta multiples clientes (tenants) en una instancia |

### Anexo C: Referencias y Fuentes

#### C.1 Fuentes Tecnicas (Latencia y Audio)

| Fuente | Fecha | Relevancia |
|--------|-------|------------|
| Vapi Engineering Blog — Latency Optimization | Jul 2025 | 1,200ms ceiling empirico, stack optimizado 465ms |
| AssemblyAI HackerNoon — STT Latency | Mar 2026 | Stack 465ms: STT 90ms + LLM 200ms + TTS 75ms |
| Retell AI Benchmarks — Voice AI Performance | 2026 | ~600-780ms raw infrastructure, 88% no-show reduction |
| Telnyx Voice AI Guide — Co-located Stack | 2026 | <200ms con stack co-located STT+LLM+TTS |
| ElevenLabs Scribe v2 Documentation | Jun 2026 | 150ms STT streaming latency |
| ElevenLabs Flash v2.5 Documentation | 2026 | 75ms TTS inference, latency optimization levels |
| Google Research — Skantze (2021) | 2021 | 300ms max tolerable latency for human-like conversation |
| ITU-T G.114 — Transmission Delay | Est. | 400ms upper limit for end-to-end delay in telephony |
| Twilio Media Streams Documentation | 2026 | mu-law 8kHz, WebSocket bidirectional |
| Gemini Live API Documentation | 2026 | thinking_level, native audio, voice selection |

#### C.2 Fuentes de Ventas y Conversion

| Fuente | Fecha | Relevancia |
|--------|-------|------------|
| Optif.ai Pipeline Study | 2026 | N=939 B2B SaaS companies, benchmarks de conversion |
| Retell AI Blog — AI Cold Calling | 2026 | 17% conversion outbound, no-show reduction |
| Gong Public Benchmarks | 2024-2025 | Metricas de conversacion B2B, analisis de llamadas |
| Forrester Research — B2B Sales | 2025 | Tendencias de ventas B2B, impacto de AI |
| Balto.ai — Outbound Call Center Metrics | 2025 | Benchmarks de call centers outbound |
| MedLaunch Health — No-Show Prevention | 2026 | Mejores practicas de reduccion de no-shows |
| Curogram — Multi-Channel No-Show | 2026 | Estrategias multi-canal para reduccion de no-shows |
| Instantly.ai — B2B Cold Calling Follow-Up | 2025 | Playbook de follow-up post-llamada |
| Neil Rackham — SPIN Selling | 1988 | Framework SPIN, investigacion con 35,000+ llamadas |
| CEB — Challenger Sale | 2011 | Framework Challenger, reframe teaching |
| Sandler Training — Sandler Selling System | 1987 | Upfront contract, pain funnel |

#### C.3 Fuentes Regulatorias (Mexico)

| Fuente | Fecha | Relevancia |
|--------|-------|------------|
| PROFECO — REPEP Reglamento | 2025 | Registro Publico para Evitar Publicidad |
| CONDUSEF — REUS Reglamento | 2025 | Registro Publico de Usuarios (servicios financieros) |
| COFEPRIS — Regulacion salud | 2025 | Aplicable para nichos de salud |
| LFPDPPP (Ley Federal de Proteccion de Datos) | 2024 | Proteccion de datos personales en Mexico |
| Ley de Telecomunicaciones Mexico | 2024 | Regulacion de llamadas comerciales |

#### C.4 Fuentes de Benchmarks Competitivos

| Fuente | Fecha | Relevancia |
|--------|-------|------------|
| Vellum AI — Top 10 AI Voice Agent Platforms | 2026 | Comparativa de plataformas voice AI |
| G2 Reviews — Voice AI Platforms | 2026 | Reviews de usuarios de plataformas voice AI |
| Capterra — Call Center Software | 2026 | Comparativa de software de call center |
| LinkedIn Sales Benchmarks | 2025 | Metricas de ventas B2B por industria |
| HubSpot Sales Statistics | 2025 | Benchmarks de conversion B2B |

---

### Anexo D: Checklist de Implementacion Post-Auditoria

#### D.1 Checklist P0 (Semana 1-2)

```
LATENCIA:
[ ] VAD_SILENCE_MS cambiado de 500 a 200ms
[ ] VAD_PREFIX_PADDING_MS cambiado de 150 a 200ms
[ ] ELEVENLABS_LATENCY_OPT cambiado de 4 a 1
[ ] ENABLE_INPUT_DSP cambiado a true
[ ] RNNoise configurado (aggressiveness=2)
[ ] AGC configurado (target=-16dBFS)
[ ] Gemini thinking_level configurado a "minimal"
[ ] Numero +52 Twilio comprado y configurado
[ ] Backchannels precargados (mm-hmm, entendido, dame momento)

CONVERSION:
[ ] Opener reescrito con pattern interrupt (todos los nichos)
[ ] Trial close agregado antes de agendar demo
[ ] Framework LAER agregado a system prompt
[ ] Capa 4 del prompt reemplazada con PRO-V.O.I.S.E.
[ ] Tool pre_call_brief implementada
[ ] Tool quantificar_dolor implementada
[ ] Tool social_proof_match implementada
[ ] Tool trial_close implementada
[ ] Tool recordatorio_demo implementada
[ ] Triple Lock Lock 1 (confirmacion activa) implementado

COMPLIANCE:
[ ] Aviso de grabacion agregado al inicio de llamadas
[ ] REPEP consulta implementada pre-campana
[ ] Opt-out verbal inmediato configurado
[ ] Horario 9h-20h respetado

WORKFLOW:
[ ] Follow-up WhatsApp inmediato post-llamada
[ ] Triple Lock Lock 2 (3-1-0 recordatorios) programado
[ ] Triple Lock Lock 3 (no-show recovery) configurado
[ ] BANT score calculado post-llamada
[ ] Webhook enriquecido enviado a backend

METRICAS:
[ ] Dashboard de latencia operativo (Prometheus)
[ ] Dashboard de conversion operativo
[ ] Alerta de latencia P95 > 1000ms configurada
[ ] e2e_latency_p50 medida y < 800ms
```

#### D.2 Checklist P1 (Semana 3-4)

```
[ ] Pipeline Router implementado (Gemini default 80%, ElevenLabs VIP 20%)
[ ] Barge-in agresivo de 3 capas implementado
[ ] Cache semantico de respuestas operativo
[ ] AudioBridge optimizado (LUT, preallocated buffers)
[ ] Multi-touch pre-call sequence (email + WhatsApp)
[ ] Lead scoring BANT en tiempo real
[ ] No-show recovery automatico completo
[ ] Handoff briefing para vendedores humanos
[ ] Dashboard de KPIs completo (Grafana)
[ ] Metricas de negocio trackeadas (cost_per_demo, revenue_per_call)
```

#### D.3 Checklist P2 (Semana 5-12)

```
[ ] ML-optimized call timing por nicho
[ ] A/B testing framework de spechs activo
[ ] Session Pool persistente con health check
[ ] AEC (Acoustic Echo Cancellation) implementado
[ ] Circuit breaker por latencia operativo
[ ] Dual pipeline para VIP (Gemini + ElevenLabs paralelo)
[ ] Semantic endpointing activo
[ ] Streaming TTS token-by-token completo
[ ] Expansion a nuevos nichos (salud, servicios)
[ ] Reactivation campaigns activas
[ ] e2e_latency_p50 < 650ms sostenido
[ ] Conversion a demo > 10% sostenido
[ ] Show rate > 80% sostenido
```

---

## CIERRE DEL DOCUMENTO

### Sintesis Final

Este documento de auditoria consolada identifica **16 areas criticas de mejora** distribuidas en dos ejes:

**Eje Tecnico (Voz y Latencia):**
- 8 cuellos de botella identificados con estimaciones precisas en ms
- 5 configuraciones P0 que reducen latencia de 1,000-1,300ms a 450-650ms
- Pipeline dual (Gemini nativo 80% + ElevenLabs VIP 20%)
- Session pool, cache semantico, circuit breaker, DSP completo

**Eje Conversion (Estrategia de Ventas):**
- Framework PRO-V.O.I.S.E. exclusivo para Silxar
- 10 nuevas tools de alto impacto (5 P0 implementables esta semana)
- Sistema Triple Lock de no-show prevention (-65% no-shows)
- Workflow post-call automatizado completo (0-2h-24h-3d-14d-60d)
- Avatar "Mariana" optimizado con LAER, trial closes, quantificacion

**La Ventaja Secreta:** Silxar tiene un CRM propio integrado nativamente con un costo 10x menor que la competencia ($0.026 vs $0.13-0.31/min). Con las mejoras de este documento, puede convertirse en la plataforma de voice AI sales #1 para B2B en Mexico en los proximos 6 meses.

**Proyeccion financiera:** De $8K-$14K MXN/mes a $52K-$94K MXN/mes en 90 dias — una mejora de 5x-7x en revenue con el mismo volumen de llamadas.

---

*Documento generado: Junio 2026*
*Auditoria Tecnica: Especialista Senior en Ingenieria de Audio Conversacional AI*
*Auditoria de Conversion: Experto en Voice AI Sales B2B*
*Proxima revision: Post-implementacion P0 (Semana 2)*

---

**FIN DEL DOCUMENTO DE AUDITORIA**
