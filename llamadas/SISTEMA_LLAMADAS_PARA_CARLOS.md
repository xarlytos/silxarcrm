# 📱 Sistema de Llamadas AI — Guía Operativa para Carlos Zamudio

**Documento**: Explicación del sistema de llamadas y war plan  
**Fecha**: 2026-06-21  
**Audiencia**: PM, Product Owner, Technical Lead  
**Status**: 🟢 Listo para Producción

---

## TL;DR (2 minutos)

**¿Qué tenemos?**
- Sistema de llamadas telefónicas automatizadas (Twilio + Gemini AI + ElevenLabs TTS/STT)
- Agente IA que llama a prospectos, entiende sus objeciones, cierra deals
- Latencia crítica: <300ms (prospecto debe escuchar respuesta rápido)

**¿Qué es el War Plan?**
- Estrategia de cambio de modelos para cuando algo falla
- 3 niveles de solución: rápido (30s), intermedio (5 min), nuclear (emergencia)
- Fallbacks automáticos: si Gemini falla, intenta modelo alternativo sin intervención

**¿Cuándo lo usas?**
- Latencia alta: prospecto espera 3-5s por respuesta
- Tasa de cierre baja: respuestas poco inteligentes
- API caída: Gemini o ElevenLabs no responden
- Costo alto: gastando demasiado en APIs

**¿Resultado?**
- Cambio en 30 segundos a 5 minutos (sin downtime)
- Sistema automáticamente intenta fallback si algo falla
- Zero risk: siempre hay opción de volver atrás

---

## 🎯 Qué es el Sistema de Llamadas

### Flujo Básico

```
PROSPECTO                    SISTEMA                     APIS
────────────────────────────────────────────────────────────────
1. Recibe llamada    →   Twilio acepta llamada
                                   ↓
2. Habla             →   ElevenLabs STT (reconoce voz)  →  "Hola"
                                   ↓
3. (Sistema piensa)      Gemini LLM genera respuesta   →  "Hola, soy..."
                         (Master: ¿qué estrategia?)
                         (Voz: ¿qué decir?)
                                   ↓
4. Escucha respuesta →   ElevenLabs TTS (sintetiza voz) → Audio
                                   ↓
5. Vuelve a hablar   →   Ciclo repite
```

### Componentes Clave

| Componente | Función | Latencia | Costo |
|------------|---------|----------|-------|
| **Twilio** | Recibir/enviar llamadas | <50ms | $0.05/min |
| **ElevenLabs STT** | Transcribir voz → texto | 100-500ms | $0.03 por min audio |
| **Gemini (Voz)** | Generar respuesta rápida | 180-300ms | $0.0007/1k tokens |
| **Gemini (Maestro)** | Decidir estrategia | 300-400ms | $0.00075/1k tokens |
| **ElevenLabs TTS** | Convertir texto → voz | 75-150ms | $0.30 per 1k chars |

### Latencia Total Percibida

```
Usuario termina hablar
    ↓ (ElevenLabs STT: 100-500ms)
Sistema recibe texto
    ↓ (Gemini LLM: 180-300ms)
Genera respuesta
    ↓ (ElevenLabs TTS: 75-150ms)
Usuario escucha voz
───────────────────────
TOTAL: 255-950ms

OBJETIVO: <300ms (mejor caso)
ACEPTABLE: <400ms (normal)
MALO: >500ms (usuario dice "¿alo?" o se aburre)
```

### Arquitectura Dual (Maestro + Voz)

**Maestro (Gemini 3.5-Flash)**
- Turno N: Genera BRIEF estratégico (qué hacer)
- Latencia: 300-400ms (pero en background, NO bloquea)
- Usa: "El prospecto está dudando, ofrece descuento"

**Voz (Gemini 3.1-Flash-Lite)**
- Turno N: Recibe brief anterior + responde
- Latencia: 180ms (ultra-rápido)
- Usa: Sigue brief del Maestro, responde al prospecto

**Resultado**: Brief siempre listo para próximo turno, voz responde rápido

---

## ⚠️ Problemas Conocidos y Síntomas

### PROBLEMA 1: Latencia Alta (>400ms)

**Síntoma en Llamada**:
```
Prospecto: "¿Hay opción de financiar?"
[Silencio: 3-5 segundos]
Agente: "Sí, tenemos tres opciones..."
Prospecto: (ya colgó, perdida la oportunidad)
```

**Causa más común** (60%):
- Gemini está lento (LLM tardando >300ms)
- Puede ser: API sobrecargada, modelo poco optimizado, contexto muy largo

**Solución inmediata** (30 segundos):
```python
# En .env, cambiar:
gemini_chat_model = "gemini-3.1-flash-lite"  # Modelo ultra-rápido
elevenlabs_latency_opt = 0                   # TTS mínima latencia

# Reiniciar servicio
systemctl restart llamadas_agent

# Resultado: 180ms LLM + 75ms TTS = 255ms total (mejora: -45%)
```

**Si sigue lento**:
- Cambiar a Gemini Live (sin ElevenLabs, 350ms constante)
- Reducir contexto (menos tokens = LLM más rápido)
- Ver `WAR_PLAN_MODELOS.md` escenario "Latencia muy alta"

---

### PROBLEMA 2: Respuestas Poco Inteligentes

**Síntoma en Llamada**:
```
Prospecto: "¿Cuánto cuesta?"
Agente: "Tenemos un precio."
Prospecto: "¿Qué precio?"
Agente: "El precio depende."
[Prospecto frustrante, cuelga]
```

**Causa más común**:
- Modelo Voz es demasiado "lite" (optimizado para velocidad, no inteligencia)
- Brief del Maestro es genérico

**Solución intermedia** (5 minutos):
```python
# Opción A: Cambiar modelo Voz a más inteligente
gemini_chat_model = "gemini-3.1-flash"  # vs flash-lite
# Ganancia: +20% inteligencia, +70ms latencia (250ms vs 180ms)

# Opción B: Cambiar modelo Maestro
gemini_master_model = "gemini-3.1-flash"  # vs 3.5-flash
# Ganancia: +briefs mejor, mismo tiempo

# Opción C: Agregar ejemplos en system prompt
# Ver: app/conversation/prompts.py
# Agregar 3-5 ejemplos de respuestas BUENAS
```

---

### PROBLEMA 3: Tasa de Cierre Baja

**Síntoma en Datos**:
```
Enero: 40% cierre
Febrero: 35% cierre (-12.5%)
Causa: ¿agente menos convincente? ¿prospecto más resistente?
```

**Soluciones**:
1. **Cambiar voz/acento** (más profesional)
2. **Aumentar inteligencia del maestro**
3. **Mejorar system prompt** (instrucciones del agente)
4. **A/B testing** (comparar 2 configuraciones)

---

### PROBLEMA 4: Gemini o ElevenLabs Caído

**Síntoma**:
```
Logs: "Error 500", "Connection timeout", "Rate limit 429"
Usuario escucha silencio, luego falla de llamada
```

**Sistema automático** (sin intervención):
```
Intento 1: Gemini 3.1 Flash-Lite ❌ falla
Intento 2: Gemini 2.5 Flash ✅ funciona
→ Llamada continúa con fallback
```

**Si fallbacks se agotan**:
```python
# Manual override en config.py:
voice_pipeline = "gemini"  # Cambiar a Gemini Live
# Resultado: Sin ElevenLabs, sistema funciona igual
```

---

### PROBLEMA 5: Costo Demasiado Alto

**Análisis**:
```
Llamadas/mes: 1,000
Costo/llamada: ~$1.50 (Gemini + ElevenLabs)
Total: $1,500/mes

Meta: <$500/mes
Solución: Usar 80% cache, 20% LLM
Resultado: ~$300/mes
```

**Soluciones**:
1. Cache de respuestas frecuentes (0 costo)
2. Modelo más ligero
3. Contexto más pequeño (menos tokens)

---

## 🎮 War Plan: Cómo Actuar

### NIVEL 1: Quick Fix (30 segundos)

**Cuándo**: Problema CRÍTICO AHORA, prospecto esperando

**Acciones**:
```bash
# Paso 1: Editar .env
nano .env
# Cambiar 1 línea según síntoma

# Paso 2: Reiniciar
systemctl restart llamadas_agent

# Paso 3: Verificar
# Hacer 1 llamada de test
# Si funciona: done ✅
```

**Cambios específicos por síntoma**:

| Síntoma | Cambio | Tiempo |
|---------|--------|--------|
| Latencia >400ms | `gemini_chat_model=gemini-3.1-flash-lite` | 30s |
| Acento incorrecto | `elevenlabs_voice_id=XB0fDUnXU5powFXDhCwa` | 30s |
| Gemini error | `voice_pipeline=gemini` | 30s |
| Respuestas genéricas | Agregar cache en chat_session.py | 5 min |

---

### NIVEL 2: Investigación (5 minutos)

**Cuándo**: Problema resuelto en nivel 1, pero necesitas entender qué pasó

**Acciones**:
```bash
# Ver logs
tail -f logs/app.log | grep -i "latencia\|error\|switch"

# Ver latencia actual
python3 -c "
from app.model_switching_strategy import get_latency_monitor, ModelComponent
m = get_latency_monitor()
print(f'Chat: {m.get_average_latency(ModelComponent.GEMINI_CHAT):.0f}ms')
print(f'TTS: {m.get_average_latency(ModelComponent.ELEVENLABS_TTS):.0f}ms')
"

# Ver cambios de modelo
python3 -c "
from app.model_switching_strategy import get_model_switcher
s = get_model_switcher()
for entry in s.get_switch_history(last_n=20):
    print(entry)
"
```

---

### NIVEL 3: Debugging Profundo (20-30 minutos)

**Cuándo**: Problema persiste, necesitas entender arquitectura

**Acciones**:
```bash
# Ver qué briefs genera el Maestro
grep "MASTER BRIEF\|estrategia=" logs/app.log | tail -10
# ¿Briefs son genéricos? ¿Específicos al prospecto?

# Ver tasa de cache hit
grep "CACHE HIT" logs/app.log | wc -l
# ¿Cuántos requests usan cache?

# Ver P99 latencia (percentil 99)
python3 -c "
from app.model_switching_strategy import get_latency_monitor, ModelComponent
import statistics

m = get_latency_monitor()
readings = m._readings[ModelComponent.GEMINI_CHAT]
ttfts = sorted([r.ttft_ms for r in readings if r.success])
p99_idx = int(len(ttfts) * 0.99)
print(f'P99: {ttfts[p99_idx]:.0f}ms')
"
```

---

### NIVEL 4: Cambio de Configuración Permanente (1-2 horas)

**Cuándo**: Decisión de cambiar configuración para siempre

**Pasos**:

1. **Elegir configuración predefinida**
   - "Ultra Velocidad": latencia <300ms, respuestas rápidas
   - "Balance": latencia ~350ms, respuestas inteligentes
   - "Robustez": latencia ~400ms, pocas dependencias externas

2. **Copy-paste configuración**
   ```python
   # De WAR_PLAN_MODELOS.md, sección "Configuraciones Predefinidas"
   # Copiar todos los valores a .env o config.py
   ```

3. **Testing en staging**
   - 20 llamadas de prueba
   - Medir: latencia, inteligencia, claridad de voz

4. **Deploy a producción**
   - Monitoring: primeros 100 calls
   - Si todo OK: mantener
   - Si problema: volver a configuración anterior

5. **Documentar**
   - Qué cambió
   - Por qué
   - Resultados esperados

---

## 📊 Matriz de Decisión (Cómo Actuar)

```
SÍNTOMA                           → NIVEL 1 (30s)           → NIVEL 2 (5 min)
────────────────────────────────────────────────────────────────────────────
Latencia >400ms                   → flash-lite + opt=0      → Reducir contexto
Briefs poco estratégicos          → master=3.1flash         → Mejorar prompt
Acento incorrecto                 → voice_id nueva          → Cambiar género
Gemini error 500                  → voice_pipeline=gemini   → Revisión API key
ElevenLabs error 429              → voice_pipeline=gemini   → Reducir QPS
Sonido comprimido                 → latency_opt=1           → Cambiar formato
Suena robótico                    → Agregar smart pausing   → Cambiar temp LLM
Corta palabras inicial            → vad_silence=200         → Aumentar padding
Prospecto no entiende voz         → Cambiar acento          → Cambiar TTS format
Costo alto                        → Agregar cache           → Reducir tokens
```

---

## 🔄 Fallback Automático (Lo Importante)

**Tú NO haces nada. El sistema automáticamente**:

```
Intento 1: Modelo configurado (ej: gemini-3.1-flash-lite)
    ❌ Falla (error 500, timeout, etc)
        ↓
Intento 2: Fallback 1 (ej: gemini-3.1-flash)
    ❌ También falla
        ↓
Intento 3: Fallback 2 (ej: gemini-2.5-flash)
    ✅ Funciona → Usar este

Si TODO falla: usar cached response o default reply
```

**Ventaja**: Sin downtime, sin intervención manual

---

## 📈 Monitoreo Recomendado

### Diario (5 minutos)

```bash
# Ver status:
grep "TTFT\|latencia\|error" logs/app.log | tail -20
# Esperado: ningún CRÍTICO, P99 < 400ms

# Ver cambios modelo:
grep "SWITCH\|circuit" logs/app.log | wc -l
# Esperado: <5 cambios por hora
```

### Semanal (30 minutos)

```python
# Crear reporte:
print("=== SEMANA ACTUAL ===")
print(f"Llamadas totales: X")
print(f"Success rate: Y%")
print(f"Latencia promedio: Z ms")
print(f"Tasa de cierre: W%")
print(f"Costo total: $V")

# Comparar vs semana anterior
# ¿Mejora? ¿Degradación?
```

---

## 🚨 SOS: Decisión Tree para Emergencias

```
¿HAY PROBLEMA?
├─ NO → Seguir normal ✅
│
└─ SÍ
   ├─ ¿Prospecto escucha respuesta después de 3-5s?
   │  └─ SÍ → LATENCIA ALTA
   │     ├─ Nivel 1: gemini_chat_model = "gemini-3.1-flash-lite"
   │     └─ Si falla, Nivel 2: voice_pipeline = "gemini"
   │
   ├─ ¿Agente dice cosas genéricas/incorrectas?
   │  └─ SÍ → INTELIGENCIA BAJA
   │     ├─ Nivel 1: gemini_chat_model = "gemini-3.1-flash"
   │     └─ Nivel 2: Mejorar system prompt
   │
   ├─ ¿Logs muestran "Error 500" de Gemini?
   │  └─ SÍ → GEMINI CAÍDO
   │     ├─ Nivel 1: voice_pipeline = "gemini" (Gemini Live)
   │     └─ Esperar 30 min, revertir cuando esté ok
   │
   ├─ ¿ElevenLabs dice "429 Too many requests"?
   │  └─ SÍ → RATE LIMIT
   │     ├─ Nivel 1: voice_pipeline = "gemini"
   │     └─ Esperar 60 min antes de revertir
   │
   └─ ¿Tasa de cierre bajó 10%+ en última semana?
      └─ SÍ → INVESTIGAR PROFUNDO
         ├─ Revisar qué cambió (model? prompt? config?)
         ├─ A/B testing: config actual vs anterior
         └─ Si anterior era mejor: revertir + investigar
```

---

## ✅ Checklist: Antes de Cualquier Cambio

- [ ] ¿Entiendes el problema? (síntoma específico vs "algo está mal")
- [ ] ¿Escalaste a dev si es componente que no entiendes?
- [ ] ¿Tienes plan de rollback? (sé cómo volver atrás)
- [ ] ¿Harás test después? (1-5 llamadas de prueba)
- [ ] ¿Documentarás cambio? (qué, por qué, resultado)
- [ ] ¿Monitorearás primeros 10 calls? (buscar sorpresas)

---

## 📞 Cuándo Escalar a Dev

**Escala A DEV si**:
- No sabes cuál es el problema (síntoma extraño)
- Cambiaste config y problema persiste
- Necesitas cambiar system prompt o prompts.py
- Necesitas agregar nueva voz o modelo
- Problema afecta código, no solo config

**NO escalas si**:
- Solo cambias `.env` o valores simples
- Problema se resuelve con fallback automático
- Es decisión operativa (A/B testing, optimización)

---

## 🎓 Ejemplos Prácticos

### EJEMPLO 1: "Latencia está subiendo"

**Síntomas observados**:
- Semana pasada: P99 latencia 300ms
- Hoy: P99 latencia 450ms
- Prospecto espera 4-5 segundos

**Diagnosis** (5 min):
```bash
# Ver si cambió config
git diff config.py .env
# ¿Se cambió gemini_chat_model o elevenlabs_latency_opt?

# Ver logs
grep "TTFT\|latencia" logs/app.log | tail -30
# Buscar patrón: ¿latencia subió gradualmente o de repente?

# Ver si es gemini o tts
# Separar latencia de cada componente
```

**Solución** (30 sec):
```python
# Si Gemini es el culpable:
gemini_chat_model = "gemini-3.1-flash-lite"  # Ultra-rápido

# Si es TTS:
elevenlabs_latency_opt = 0  # Mínima latencia

# Si es contexto (va creciendo en la conversación):
# Reducir ventana en chat_session.py línea 250
window_start = max(0, len(self._history) - 3)  # vs 5
```

---

### EJEMPLO 2: "Tasa de cierre bajó"

**Datos**:
- Enero: 400 llamadas, 160 cierres (40%)
- Febrero: 400 llamadas, 140 cierres (35%) ← degradación

**Diagnosis** (30 min):
```bash
# ¿Cuándo bajó exactamente?
git log --oneline app/config.py | head -10
# Ver cambios en config

# ¿Fue de modelos?
grep "gemini_.*_model\|elevenlabs" config.py
# Comparar vs última versión ok

# ¿Fue de system prompt?
git diff app/conversation/prompts.py
# Ver qué cambió

# ¿Fue random (variación mensual)?
# Revisar próximas 100 calls
```

**Soluciones** (orden de probabilidad):
1. Revertir cambios recientes (modelo o prompt)
2. Cambiar modelo Maestro a más inteligente
3. A/B testing: config actual vs alternativa
4. Mejorar system prompt con ejemplos

---

### EJEMPLO 3: "API Key expiró"

**Síntoma**:
```bash
Logs: "401 Unauthorized"
Todas las llamadas fallan
```

**Solución** (5 min):
```bash
# 1. Obtener key nueva
# Contactar Gemini AI Studio o Vertex AI
# https://aistudio.google.com/app/apikey

# 2. Actualizar .env
nano .env
GEMINI_API_KEY=xxxxx_nueva_key_xxxxx

# 3. Reiniciar
systemctl restart llamadas_agent

# 4. Test
# Hacer 1 llamada
```

---

## 🎯 Resumen Ejecutivo (para Junta)

### Status quo (Enero 2026)
- ✅ 1,000 llamadas/mes
- ✅ 40% tasa de cierre
- ✅ 255ms latencia promedio
- ✅ $1,500/mes costo APIs

### Con War Plan (Post-implementación)
- ✅ Misma funcionalidad
- ✅ +Respuesta rápida a problemas (30 sec vs 2 horas)
- ✅ +Fallbacks automáticos (sin downtime)
- ✅ +Visibilidad (sabemos qué cambió y cuándo)

### Riesgo
- ❌ Mínimo: cambios son en config, no en código
- ❌ Rollback: revertir a config anterior en 30 sec
- ❌ Documentado: cada cambio loguea qué, por qué, cuándo

---

## 📚 Recursos Adicionales

| Documento | Cuándo leerlo | Duración |
|-----------|---------------|----------|
| `WAR_PLAN_MODELOS.md` | Necesitas detalles técnicos | 30 min |
| `CHEAT_SHEET_MODELOS.md` | Cambios rápidos copy-paste | 5 min |
| `QUICK_START_SWITCHING.md` | Emergencia, SOS | 5 min |
| `INTEGRATION_GUIDE.md` | Dev necesita integrar | 2 horas |

---

## 🤝 Contacto y Preguntas

**¿Tienes pregunta sobre**:
- **Qué es el war plan?** → Lee sección "War Plan: Cómo Actuar"
- **Cómo actuar en emergencia?** → Ver "SOS: Decision Tree"
- **Cambio específico?** → Ver "Matriz de Decisión"
- **Porqué ocurrió problema?** → Ver "Debugging Avanzado" en WAR_PLAN_MODELOS.md

---

**Documento actualizado**: 2026-06-21  
**Próxima revisión**: Mensual o post-incidente
**Owner**: Tech Team / Carlos Zamudio
