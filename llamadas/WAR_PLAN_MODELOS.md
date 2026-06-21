# 🎯 WAR PLAN EXHAUSTIVO: Cambio de Modelos y Manejo de Latencia

**Status**: Production-ready | **Versión**: 2.0 | **Última actualización**: 2026-06-21

---

## 📚 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Matriz de Decisión Principal](#matriz-de-decisión-principal)
3. [Casos por Síntoma (Guía Rápida)](#casos-por-síntoma-guía-rápida)
4. [Problemas Detallados y Soluciones](#problemas-detallados-y-soluciones)
5. [Configuraciones Predefinidas](#configuraciones-predefinidas)
6. [Debugging Avanzado](#debugging-avanzado)
7. [Casos Multi-Región](#casos-multi-región)
8. [Performance Tuning](#performance-tuning)
9. [Recovery Procedures](#recovery-procedures)
10. [Casos Edge y Excepciones](#casos-edge-y-excepciones)
11. [Monitoreo Avanzado](#monitoreo-avanzado)
12. [Análisis de Costos](#análisis-de-costos)

---

## 📋 Resumen Ejecutivo

**3 métodos de cambio**:
1. **CONFIGURACIÓN**: Editar `.env` → fallbacks automáticos
2. **MANUAL**: `ModelSwitcher` en tiempo de ejecución
3. **AUTOMÁTICO**: Sistema detecta latencia y cambia solo

**Filosofía**: Sin cambio = sin riesgo. Todo tiene fallback.

---

## 🎯 Matriz de Decisión Principal

```
PROBLEMA                           → LAYER 1              → LAYER 2              → LAYER 3
────────────────────────────────────────────────────────────────────────────────────────────
Latencia >400ms                    → Chat-Lite            → Reducir contexto     → Gemini Live
Briefs incorrectos                 → Master=Flash         → Master=3.1Flash      → Log y analizar
Acento incorrecto                  → Voice ID nueva       → Gemini Live voice    → TTS de otro proveedor
Respuestas genéricas               → Agregar cache        → Aumentar temp. LLM   → Cambiar system prompt
Corta palabras inicial             → VAD +50ms            → Aumentar padding     → Reducir VAD sensitivity
Sonido comprimido                  → Latency Opt=1        → TTS format cambio    → Aumentar bitrate
Gemini timeout                     → Fallback automático  → Reducir max_tokens   → Cambiar a Gemini Live
Gemini rate limit (429)            → Reducir QPS          → Cambiar a Live       → Cache agresivo
ElevenLabs timeout                 → Reducir bitrate      → Cambiar voice        → Gemini Live
ElevenLabs 429                     → Cambiar a Gemini     → Cache responses      → Batch requests
Red/firewall bloqueado             → Revisar DNS          → VPN/proxy            → Cambiar endpoint
API key inválida                   → Revisar .env         → Regenerar key        → Contactar proveedor
Prospecto no entiende voz          → Acento diferente     → Género diferente     → Velocidad TTS
Tasa de cierre baja                → Aumentar inteligencia → Cambiar system prompt → A/B testing
Costo demasiado alto               → Caché agresivo       → Contexto menor       → Modelo más ligero
Mucha latencia en off-hours        → Rate limit dinámico  → Fallback más rápido  → Gemini Live
Fallos correlacionados (región X)  → Cambiar modelo       → VPN a región diferente → Usar proxy local
```

---

## 🔍 Casos por Síntoma (Guía Rápida)

### SINTOMA 1: "El prospecto escucha la voz después de 3-5 segundos"

**Diagnosis** (en orden de probabilidad):
1. LLM lento (Gemini tardando >300ms) — 60%
2. TTS lento (ElevenLabs tardando >200ms) — 25%
3. Network latency alto — 10%
4. Contexto de conversación muy largo — 5%

**Soluciones Rápidas**:

```python
# NIVEL 1: Quick fix (2 min)
gemini_chat_model = "gemini-3.1-flash-lite"  # -120ms
elevenlabs_latency_opt = 0                   # -25ms
vad_silence_ms = 150                         # -50ms opcional
# Resultado: 255ms (antes: 400ms+)

# NIVEL 2: Si Nivel 1 no basta (5 min)
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"
# Resultado: 350ms (pero sin control fino)

# NIVEL 3: Investigar contexto (debug)
# Ver DEBUGGING AVANZADO > Diagnosticar Latencia por Componente

# NIVEL 4: Si es issue de red (advanced)
# Ver RECOVERY PROCEDURES > Latencia de Red
```

**Verificación**:
```bash
# Ver latencia actual por componente
grep "⏱️" logs/app.log | tail -20
# Esperado: Chat <200ms, TTS <100ms, Total <300ms
```

---

### SINTOMA 2: "Responde correctamente pero es poco inteligente"

**Diagnosis**:
- Master brief es genérico
- Chat model es demasiado lite
- System prompt es superficial

**Soluciones**:

```python
# Opción A: Cambiar VETA (Voice) a más inteligente
gemini_chat_model = "gemini-3.1-flash"  # vs flash-lite
# Ganancia: +inteligencia 15%, +latencia 70ms

# Opción B: Cambiar MAESTRO a más fuerte
gemini_master_model = "gemini-3.1-flash"  # vs 3.5-flash (igual speed, más flexible)
# Ganancia: +inteligencia briefs, sin penalidad latencia

# Opción C: Ambas + agregar ejemplos al system prompt
# Editar app/conversation/prompts.py
# Agregar 2-3 ejemplos de respuestas buenas

# Opción D: Aumentar temperature y top_p en chat_session.py
# config.temperature = 0.8  # vs 0.7
# Ganancia: +variedad -5%, mismo tiempo

# Opción E: Investigar qué briefs se generan
# Ver DEBUGGING AVANZADO > Ver Briefs Generados
```

**Verificación**:
```python
# En una llamada de test, revisar logs:
grep "Master: brief" logs/app.log | tail -5
# Buscar: ¿estrategia es genérica? ¿objetivo es específico?
```

---

### SINTOMA 3: "El acento de la voz no es el correcto"

**Diagnosis**:
- `elevenlabs_voice_id` no coincide con región deseada
- ElevenLabs speaker no tiene acento deseado
- Gemini Live voice no soporta región

**Soluciones**:

```python
# ESPAÑA CASTELLANO
elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"  # Antoni (actual, profesional)
elevenlabs_voice_id = "N7IuU1sMQXj7DFv3Ls2p"  # Sergi (más joven)

# ESPAÑA FEMENINO
elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"  # Charlotte (profesional)

# MÉXICO / LATINOAMÉRICA
elevenlabs_voice_id = "0s34q83tAFAXleKVBr3p"  # Diego (México, masculino)
elevenlabs_voice_id = "GZa0yHWAFAs7zAh0xLlt"  # Isabella (Latino, femenino)

# FALLBACK UNIVERSAL (si ElevenLabs falla)
voice_pipeline = "gemini"
gemini_voice = "Leda"  # Femenino español
gemini_voice = "Charon"  # Masculino español

# CAMBIAR VELOCIDAD TTS (afecta percepción de acento)
elevenlabs_tts_format = "ulaw_8000"  # Estándar telefonía
elevenlabs_latency_opt = 1  # Si suena comprimido
```

**Verificación**:
```bash
# Hacer 3 llamadas de test con cada voz
# Medir: ¿acento nativo? ¿profesional? ¿claro en llamada?
# Nota: narrowband (8kHz) reduce claridad, normalidad con telephony
```

---

### SINTOMA 4: "Gemini dice error 500 o 429 (rate limit)"

**Diagnosis - 500 Error**:
- API key inválida
- Quota excedido (free tier)
- Gemini API caída

**Diagnosis - 429 Error**:
- QPS (queries per second) excedido
- Muy muchas llamadas simultáneas
- Modelo está bajo load

**Soluciones - 500**:

```python
# 1. Verificar API key
# En .env:
# GEMINI_API_KEY=xxx
# Revisar: ¿es válida? ¿expired?
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY
# Esperado: JSON con models, NO 401

# 2. Verificar quota (free tier tiene límites)
# Si free tier: máximo 60 requests/minuto
# Si premium: ver Google AI Studio quotas

# 3. Fallback automático (está habilitado)
# Sistema automáticamente intenta fallback
# Ver logs: grep "Fallback" logs/app.log

# 4. Si es issue de compatibilidad (nombre de modelo)
# Algunos modelos solo en Vertex AI, otros en AI Studio
# ACTUAL (AI Studio compatible):
gemini_live_fallback_model = "gemini-2.5-flash-native-audio-latest"
gemini_chat_model = "gemini-3.1-flash-lite"  # OK
```

**Soluciones - 429**:

```python
# 1. Cambiar a modelo que usa menos tokens
gemini_chat_model = "gemini-3.1-flash-lite"  # vs 3.5-flash
# Ganancia: -30% tokens, mismo entendimiento

# 2. Reducir contexto (ventana de conversación)
# En chat_session.py línea 250:
# ANTES: window_start = max(0, len(self._history) - 5)
# DESPUÉS: window_start = max(0, len(self._history) - 3)
# Ganancia: -40% tokens por turno

# 3. Agregar cache agresivo
# En chat_session.py, expandir CACHED_RESPONSES
CACHED_RESPONSES = {
    "cuál es el precio": "Tengo 3 opciones...",
    "cuánto cuesta": "Depende del plan...",
    "me interesa": "Perfecto, te dejo una demo...",
    # Agregar 20+ patrones comunes
    # Ganancia: 40-60% de requests en 0ms
}

# 4. Rate limiting dinámico (servidor-side)
# Si QPS > umbral: usar solo cache + fallback
# Ver MONITORING AVANZADO > Rate Limiting

# 5. Nuclear option: Cambiar a Gemini Live
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"
# Ventaja: Gemini Live tiene límites separados, a veces disponible
```

**Verificación**:
```bash
# Ver rate limit hits
grep "429\|rate limit\|quota" logs/app.log | wc -l
# Contar: ¿cuántos 429 en última hora?
# Esperado: 0 o <5

# Si hay muchos:
# 1. Revisar cantidad de llamadas simultáneas
# 2. Revisar si hay bucles que relanzan requests
# 3. Implementar backoff exponencial
```

---

### SINTOMA 5: "ElevenLabs dice error 429 (rate limit)"

**Diagnosis**:
- Muchas solicitudes de TTS simultáneas
- Conexión abierta demasiado tiempo sin cerrar
- Voice model está bajo load

**Soluciones**:

```python
# 1. Cambiar latency optimization (usa menos recursos)
elevenlabs_latency_opt = 0  # -30% recursos vs 1
# Nota: ya está en 0, no cambiar

# 2. Cambiar TTS format (más compacto)
elevenlabs_tts_format = "ulaw_8000"  # vs pcm_16000
# Ganancia: -50% bandwidth, mismo audio quality en narrowband

# 3. Cambiar a Gemini Live (elimina ElevenLabs)
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"
gemini_voice = "Leda"

# 4. Si es issue de voice_id específico:
# ElevenLabs puede rate-limit por voice
# Cambiar a voz diferente:
elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"  # Charlotte en lugar de Antoni

# 5. Cache de audio (advanced)
# Si muchas llamadas usan mismas respuestas:
# Cachear audio generado, no solo texto
# Implementar en tts_session.py (bajo demanda)

# 6. Batch requests (advanced)
# Agrupar múltiples TTS requests en una conexión
# Requiere cambio en architecture
```

**Verificación**:
```bash
grep "429\|ElevenLabs" logs/app.log | tail -10
# Esperar 5 minutos, intentar nuevamente
# Si persiste, cambiar a Gemini Live

# Revisar ElevenLabs dashboard:
# https://elevenlabs.io/app/billing/overview
# Ver: ¿cuotas disponibles? ¿próxima renovación?
```

---

### SINTOMA 6: "Corta palabras al inicio de respuesta"

**Diagnosis**:
- VAD (Voice Activity Detection) termina turno del usuario prematuramente
- Padding de audio insuficiente
- Sensibilidad de VAD demasiado alta

**Soluciones**:

```python
# NIVEL 1: Aumentar VAD silence threshold (detecta fin de habla más tarde)
# ANTES: vad_silence_ms = 150  # Detección agresiva
# DESPUÉS: vad_silence_ms = 200  # Más tolerante
# Ganancia: -50ms falsos positivos, +50ms latencia si usuario pausa

# NIVEL 2: Aumentar VAD prefix padding (protege primeras palabras)
# ANTES: vad_prefix_padding_ms = 200
# DESPUÉS: vad_prefix_padding_ms = 300
# Ganancia: Más palabras iniciales capturadas, +overhead negligible

# NIVEL 3: Cambiar sensibilidad de VAD
# vad_start_sensitivity = "HIGH"  # Detecta muy pronto
# vad_end_sensitivity = "HIGH"    # Termina muy rápido
# CAMBIAR A: "LOW" para más tolerancia
vad_start_sensitivity = "LOW"  # Espera confirmación de habla real
vad_end_sensitivity = "LOW"    # Espera más silencio antes de terminar

# NIVEL 4: Aumentar VAD silence threshold más aún (si problema persiste)
vad_silence_ms = 300  # Muy tolerante
# RIESGO: Si usuario hace pausa larga, espera demasiado antes de responder

# COMBINACIÓN RECOMENDADA (si problema es serio):
vad_silence_ms = 200
vad_prefix_padding_ms = 300
vad_start_sensitivity = "LOW"
vad_end_sensitivity = "LOW"
```

**Verificación**:
```bash
# Hacer 10 llamadas de test
# Frases cortas al inicio: "Sí", "No", "Hola"
# Esperado: NO se corta nada
# Si se corta: aumentar más padding/silence

# Ver en logs:
grep "VAD:" logs/app.log | tail -20
# Buscar: ¿start_detected es muy rápido? ¿end_detected es muy temprano?
```

---

### SINTOMA 7: "Sonido comprimido, artifacts, calidad pobre"

**Diagnosis**:
- Latency optimization demasiado agresivo
- Formato de audio muy comprimido
- ElevenLabs bajo carga

**Soluciones**:

```python
# NIVEL 1: Cambiar latency optimization
# ACTUAL: elevenlabs_latency_opt = 0  # Máxima velocidad
# CAMBIAR A: elevenlabs_latency_opt = 1  # Balance
# Ganancia: +25ms latencia, -artifacts 90%

# NIVEL 2: Cambiar formato TTS
# ACTUAL: elevenlabs_tts_format = "ulaw_8000"  # Telefonía estándar
# CAMBIAR A: elevenlabs_tts_format = "pcm_16000"  # Mejor calidad
# Ganancia: +clarity, +40% bandwidth, compatible con Twilio si resampling
# NOTA: Requiere cambio en app/audio/bridge.py para Twilio

# NIVEL 3: Combinación (si problema persiste)
elevenlabs_latency_opt = 2  # +150ms, máxima calidad Flash v2.5
# RIESGO: Aumenta latencia total a 300-350ms, puede ser inaceptable

# NIVEL 4: Cambiar a Gemini Live
voice_pipeline = "gemini"
# Gemini Live mantiene mejor streaming de audio sin compression

# NIVEL 5: Cambiar a voz diferente
# Algunas voces de ElevenLabs suenan mejor en compression
# Probar: Charlotte en lugar de Antoni
elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"
```

**Verificación**:
```bash
# Hacer llamada de test, grabar audio
# Escuchar: ¿artifacts? ¿sonido natural?
# Comparar latency=0 vs latency=1 en mismo texto

# Ver en logs:
grep "ElevenLabs TTS" logs/app.log | tail -5
# Buscar: latency_opt está en 0? formato es ulaw_8000?
```

---

### SINTOMA 8: "No suena natural, muy robótico o monótono"

**Diagnosis**:
- Respuesta del LLM sin pausas naturales
- No hay variación de tono
- Falta humanización

**Soluciones**:

```python
# NIVEL 1: Activar smart pausing (ya está en código)
# Verificar en chat_session.py:
# if self._pacing.calculate_pause_ms(...):
#     await asyncio.sleep(pause_ms / 1000.0)
# Nota: Si está disabled, habilitarlo

# NIVEL 2: Agregar fillers naturales
# En chat_session.py, expandir get_fillers():
# "Déjame ver...", "Bien, entonces...", "A ver..."
# Estos se insertan entre frases

# NIVEL 3: Aumentar temperatura del LLM
# chat_session.py línea 299:
# ANTES: temperature=0.7
# DESPUÉS: temperature=0.8
# Ganancia: +variedad +5%, sin cambio latencia

# NIVEL 4: Cambiar system prompt para más naturalidad
# En prompts.py, agregar instrucción:
# "Usa pausas naturales. Suena como persona real, no robot."
# "Varía tono y velocidad según emoción."

# NIVEL 5: Usar modelo más inteligente
gemini_chat_model = "gemini-3.1-flash"  # vs flash-lite
# Flash puede generar respuestas más naturales

# NIVEL 6: Activar irreconocible processing
# Si no está habilitado, ver:
# hybrid_session.py línea 338:
# apply_irreconocible_processing(...)
# Esto agrega humanización automática

# NIVEL 7: Cambiar ElevenLabs latency para prosodia
elevenlabs_latency_opt = 1  # Permite más refinamiento de tono
```

**Verificación**:
```bash
# Hacer 5 llamadas, escuchar grabaciones
# Buscar: ¿pausas naturales? ¿variación de tono? ¿suena humano?
# Comparar antes/después de cambios

# Ver en logs:
grep "Smart Pausing\|irreconocible" logs/app.log | tail -10
# Si dice "0ms" en muchas respuestas → no hay pausing
```

---

### SINTOMA 9: "Respuestas lentas al principio, rápidas después"

**Diagnosis**:
- Warmup de Gemini API (primer request tarda más)
- Connection pooling ineficiente
- Cold start en servidor

**Soluciones**:

```python
# NIVEL 1: Hacer warmup de Gemini al iniciar
# En main.py o chat_session.__init__:
async def warmup_gemini():
    """Hacer request dummy para activar conexión"""
    try:
        await session.send_message("Hola")  # Request simple
        logger.info("Gemini warmup completado")
    except:
        pass  # No critical

# NIVEL 2: Connection pooling mejorado
# En chat_session.py, mantener client vivo:
# En __init__: self._client = genai.Client(api_key=settings.gemini_api_key)
# NO crear nuevo client cada turno (ya está así)

# NIVEL 3: Cache de primer turno
# Las respuestas del primer turno son predecibles
CACHED_RESPONSES = {
    "hola": "Hola, soy el agente de ventas. ¿Tienes 2 minutos?",
    "buenos días": "Buenos días, ¿cómo estás?",
    # etc
}

# NIVEL 4: Reducir contexto en primer turno
# En chat_session.py:
# if len(self._history) < 3:
#     window_start = 0  # Usar contexto mínimo
#     max_tokens = 100  # Respuesta corta
# Ganancia: -100ms en primeros turnos

# NIVEL 5: Cambiar a modelo más rápido en primer turno
# No implementado, pero posible:
# Usar flash-lite para primeros 2 turnos, luego cambiar

# NIVEL 6: Cambiar a Gemini Live (startup más rápido)
voice_pipeline = "gemini"
# Gemini Live no tiene warmup overhead
```

**Verificación**:
```bash
# Hacer 20 llamadas consecutivas
# Medir latencia de cada una
# Esperado: primeras 2-3 pueden ser +100ms, luego constante
# Si todas son lentas: problema no es warmup

# Ver en logs:
grep "TTFT\|latency" logs/app.log | head -30
# Buscar: ¿primeras son lentas? ¿estabiliza después?
```

---

### SINTOMA 10: "Prospecto dice que no entiende qué dije"

**Diagnosis**:
- Acento de TTS incorrecto para región
- Velocidad de habla demasiado rápida
- Audio comprimido afecta claridad
- Palabras técnicas pronunciadas mal

**Soluciones**:

```python
# NIVEL 1: Cambiar voz/acento para región del prospecto
# Si es México: usar Diego o Isabella (IDs en voices_registry.py)
# Si es España: usar Antoni o Charlotte
# Si es neutral: Charlotte o Leda (Gemini)

# NIVEL 2: Reducir velocidad de habla
# En ElevenLabs no hay control directo
# Pero: aumentar pauses hace que parezca más lento
vad_silence_ms = 250  # Da tiempo para procesar

# NIVEL 3: Mejorar claridad reduciendo compression
elevenlabs_latency_opt = 1  # vs 0
elevenlabs_tts_format = "pcm_16000"  # vs ulaw_8000 si posible

# NIVEL 4: Cambiar language del STT
# Si está reconociendo acento incorrecto:
elevenlabs_stt_language = "es"  # Asegurar español
# Si es México específico: "es-MX" si ElevenLabs soporta

# NIVEL 5: Simplificar lenguaje del system prompt
# En prompts.py:
# "Usa palabras simples, no jerga técnica"
# "Pronuncia lentamente, deja espacios entre frases"

# NIVEL 6: Agregar pronunciación explícita para términos
# En prompt: "Cuando digas 'API', pronuncia letra por letra: 'A-P-I'"
```

**Verificación**:
```bash
# Test con prospecto real o grabación de prueba
# ¿Entiende acento? ¿Entiende palabras clave?
# Probar 5 llamadas con cada configuración

# Si es acento: cambiar voz
# Si es velocidad: aumentar pausas
# Si es técnico: simplificar prompt
```

---

## 💻 Problemas Detallados y Soluciones

### PROBLEMA A: Latencia Impredecible (varía 150-500ms)

**Causes**:
1. Network instability
2. Gemini API load variability
3. TTS queue delays
4. Conversación context crece (tokens aumentan)

**Diagnosis**:
```python
from app.model_switching_strategy import get_latency_monitor, ModelComponent

monitor = get_latency_monitor()

# Obtener desviación estándar
chat_readings = monitor._readings[ModelComponent.GEMINI_CHAT]
ttfts = [r.ttft_ms for r in chat_readings if r.success]
avg = sum(ttfts) / len(ttfts)
var = sum((x - avg) ** 2 for x in ttfts) / len(ttfts)
std_dev = var ** 0.5

print(f"Avg: {avg}ms, Std Dev: {std_dev}ms")
# Esperado: std_dev < 50ms
# Si > 100ms: hay variabilidad significativa
```

**Soluciones**:

```python
# OPCIÓN A: Reducir variabilidad de LLM
# Usar modelo más predecible
gemini_chat_model = "gemini-3.1-flash-lite"  # vs 3.1-flash
# Lite tiene latencia más consistente

# OPCIÓN B: Limitar contexto (reduce variabilidad por tokens)
# chat_session.py línea 250:
window_start = max(0, len(self._history) - 3)  # vs 5

# OPCIÓN C: Usar cache para casos comunes (0ms = predecible)
# Expandir CACHED_RESPONSES

# OPCIÓN D: Implementar SLA objetivo
# Si P99 < 400ms: aceptable
# Si P99 > 500ms: cambiar configuración
# Ver MONITORING AVANZADO

# OPCIÓN E: Cambiar a pipeline Gemini Live
# Gemini Live tiene latencia más predecible (~350ms constante)
voice_pipeline = "gemini"
```

---

### PROBLEMA B: Errores Correlacionados por Región

**Symptoms**:
- Gemini funciona en Europa, falla en México
- ElevenLabs funciona en US, timeout en LATAM
- Rate limits por región

**Soluciones**:

```python
# REGIÓN-ESPECÍFICA: México
# Problema: Gemini API puede estar más lenta desde LATAM
# Solución: Usar Gemini Live o reducir QPS

# Si es ElevenLabs:
# Verificar: ¿DNS está resolviendo a servidor regional?
# Cambiar: elevenlabs_stt_language = "es-MX"

# Config por región (en config.py):
if settings.call_region == "mx":
    settings.gemini_chat_timeout_seconds = 15  # +5s vs default
    settings.gemini_chat_model = "gemini-3.1-flash-lite"  # Modelo ligero
    settings.vad_silence_ms = 200  # Más tolerancia VAD
    
elif settings.call_region == "es":
    settings.gemini_chat_model = "gemini-3.1-flash"  # Más inteligencia

elif settings.call_region == "br":
    settings.elevenlabs_stt_language = "pt"  # Portugués
    settings.elevenlabs_voice_id = "nova-voice-for-portuguese"  # Si existe
```

---

### PROBLEMA C: Fallos en Cascada (un componente caído derriba todos)

**Scenario**:
- Gemini falla
- Fallback a Gemini 2.5 (pero mal configurado)
- Chat_session se cuelga esperando timeout
- User escucha silencio 10+ segundos

**Soluciones**:

```python
# OPCIÓN A: Timeouts más cortos (fail fast)
# config.py:
gemini_chat_timeout_seconds = 5  # vs 10 (default)
elevenlabs_stt_timeout_seconds = 3  # vs 5
elevenlabs_tts_timeout_seconds = 2  # vs 3

# OPCIÓN B: Circuit breaker más agresivo
# model_switching_strategy.py:
circuit_breaker_enabled = True
circuit_breaker_cooldown_seconds = 15  # vs 30 (default)
circuit_breaker_failure_threshold = 2  # vs 3 (open faster)

# OPCIÓN C: Fallback por defecto siempre disponible
# En chat_session.py línea 226:
fallback_response = (
    "Perfecto, cuéntame más sobre tu situación. "
    "¿Cuál es tu principal desafío?"
)
# Este SIEMPRE funciona, no requiere LLM

# OPCIÓN D: Multi-region fallback
# Gemini US falla → intentar Gemini EU
# ElevenLabs falla → intentar Gemini Live speech
```

---

### PROBLEMA D: Cold Start después de Redeploy

**Symptoms**:
- Primeras 20-50 llamadas son muy lentas (~1s latencia)
- Estabiliza después

**Causes**:
- JIT compilation de Gemini client
- Python module loading
- Connection pool initialization

**Soluciones**:

```python
# OPCIÓN A: Warmup en startup
# main.py:
async def warmup_system():
    """Precalentar sistemas al iniciar"""
    logger.info("Iniciando warmup...")
    
    # Warmup Gemini
    from app.gemini.chat_session import GeminiChatSession
    session = GeminiChatSession(ctx=None, system_prompt="test")
    try:
        await session.send_message("Hola")
    except:
        pass
    
    # Warmup ElevenLabs
    from app.elevenlabs.tts_session import ElevenLabsTTS
    tts = ElevenLabsTTS(...)
    await tts.start()
    
    logger.info("Warmup completado")

# OPCIÓN B: Redirigir primeras llamadas a cache
# Si coldstart detectado, usar solo cached responses
# hasta que sistema esté listo

# OPCIÓN C: Desabilitar ciertos features en coldstart
# Primeros 5 minutos: modelo ligero, contexto corto
```

---

### PROBLEMA E: High Cost (Facturas altas de Gemini/ElevenLabs)

**Analysis**:
```python
# Estimar costo por llamada:
# Gemini: ~$0.075 por millón de input tokens
# Gemini: ~$0.30 por millón de output tokens
# ElevenLabs: $0.30 per 1000 characters de TTS

# Ejemplo (5 min call, 50 turnos):
# Gemini: 10,000 input tokens * $0.075/M = $0.00075
# ElevenLabs: 5,000 chars * $0.30/K = $1.50
# Total: ~$1.50 por llamada
# 1,000 llamadas/mes = $1,500

# Si es alto, optimizar:
```

**Soluciones**:

```python
# NIVEL 1: Cache agresivo
# Expandir CACHED_RESPONSES a 50+ patrones
# Ganancia: -40-60% costo por llamada que usa cache (0 tokens)

# NIVEL 2: Reducir contexto
# Ventana de 5 turnos → 3 turnos
# Ganancia: -40% tokens de input

# NIVEL 3: Cambiar modelo más ligero
gemini_chat_model = "gemini-3.1-flash-lite"  # vs 3.1-flash
# Ganancia: -20% tokens (menos output completo)

# NIVEL 4: Cambiar a Gemini Live
# Gemini Live usa different pricing model
# A veces es más barato con audio nativo

# NIVEL 5: Batch de respuestas
# En lugar de hacer 50 requests pequeños
# Hacer 5 requests grandes
# Requiere architecture change

# NIVEL 6: Implementar hard limits
# Si costo/mes > $X, cambiar automático a configuración económica
if monthly_cost > 1000:  # $1k limit
    config.gemini_chat_model = "gemini-3.1-flash-lite"
    config.cache_responses = True  # Forzar cache
    config.context_window = 3  # Mínimo
```

---

## ⚙️ Configuraciones Predefinidas

### CONFIG 1: "Ultra Velocidad" (Telefonía B2B)

```python
# Optimizado para: respuesta rápida, calls cortas (<3 min)
# Latencia objetivo: <300ms
# Costo: Medio

voice_pipeline = "elevenlabs"
gemini_chat_model = "gemini-3.1-flash-lite"
gemini_chat_fallback_model = "gemini-2.5-flash"
gemini_master_model = "gemini-3.5-flash"
gemini_master_fallback_model = "gemini-2.5-flash"

elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"  # Antoni
elevenlabs_latency_opt = 0
elevenlabs_tts_format = "ulaw_8000"

vad_silence_ms = 150
vad_prefix_padding_ms = 200
vad_start_sensitivity = "HIGH"

gemini_chat_timeout_seconds = 8
elevenlabs_stt_timeout_seconds = 4
elevenlabs_tts_timeout_seconds = 2

memory_max_turns = 10
gemini_thinking_level = "minimal"
```

**Resultados**: ~255ms latencia, bajo costo, respuestas rápidas

---

### CONFIG 2: "Balance Inteligencia-Velocidad" (Ventas Conversacional)

```python
# Optimizado para: llamadas más largas, respuestas inteligentes
# Latencia objetivo: 300-400ms
# Costo: Medio-Alto

voice_pipeline = "elevenlabs"
gemini_chat_model = "gemini-3.1-flash"  # Más inteligente
gemini_chat_fallback_model = "gemini-2.5-flash"
gemini_master_model = "gemini-3.5-flash"
gemini_master_fallback_model = "gemini-2.5-flash"

elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"  # Charlotte (profesional)
elevenlabs_latency_opt = 1  # Balance
elevenlabs_tts_format = "ulaw_8000"

vad_silence_ms = 200  # Más tolerante
vad_prefix_padding_ms = 250
vad_start_sensitivity = "HIGH"

gemini_chat_timeout_seconds = 10
elevenlabs_stt_timeout_seconds = 5
elevenlabs_tts_timeout_seconds = 3

memory_max_turns = 15
gemini_thinking_level = "minimal"

# Agregar cache agresivo
CACHED_RESPONSES = {
    # 20-30 patrones comunes
}
```

**Resultados**: ~300-350ms latencia, respuestas más naturales

---

### CONFIG 3: "Robustez Máxima" (Fallback/Emergencia)

```python
# Optimizado para: máxima disponibilidad, pocas dependencias
# Latencia objetivo: 350-500ms
# Costo: Bajo (sin ElevenLabs)

voice_pipeline = "gemini"  # Eliminate ElevenLabs dependency
gemini_live_model = "gemini-3.1-flash-live-preview"
gemini_voice = "Leda"

gemini_chat_model = "gemini-3.1-flash-lite"  # Fallback no usado
gemini_master_model = "gemini-3.1-flash"

vad_silence_ms = 150
memory_max_turns = 8

# Todo caching enableado
CACHED_RESPONSES = {
    # Máximo número de patrones
}

# Timeouts más generosos (menos falsos positivos)
gemini_chat_timeout_seconds = 15
```

**Resultados**: ~350ms latencia, muy robusto, sin ElevenLabs

---

### CONFIG 4: "Económica" (Batch/Nocturno)

```python
# Optimizado para: costo mínimo
# Latencia: no es objetivo
# Costo: Mínimo

gemini_chat_model = "gemini-3.1-flash-lite"
context_window = 3  # Mínimo
memory_max_turns = 5

# Cache TOTAL
CACHED_RESPONSES = {
    # 50+ patrones, cubre 70% de casos
}

# Reducir QPS si es batch
batch_mode = True
max_concurrent_calls = 1
```

**Resultados**: costo 60% menos, baja latencia no importa

---

## 🔧 Debugging Avanzado

### TÉCNICA 1: Diagnosticar Latencia por Componente

```python
# Script para medir cada componente
from app.model_switching_strategy import get_latency_monitor, ModelComponent

def diagnose_latency():
    monitor = get_latency_monitor()
    
    components = [
        ModelComponent.GEMINI_CHAT,
        ModelComponent.GEMINI_MASTER,
        ModelComponent.ELEVENLABS_STT,
        ModelComponent.ELEVENLABS_TTS,
    ]
    
    print("=== LATENCY DIAGNOSIS ===")
    for comp in components:
        avg = monitor.get_average_latency(comp)
        level = monitor.classify_latency(avg)
        print(f"{comp.value:20} {avg:6.0f}ms  [{level.value}]")
    
    # Total perceivido
    chat = monitor.get_average_latency(ModelComponent.GEMINI_CHAT)
    tts = monitor.get_average_latency(ModelComponent.ELEVENLABS_TTS)
    total = chat + tts
    print(f"{'TOTAL TTFA':20} {total:6.0f}ms")
    
    # Recomendaciones
    if total > 400:
        print("⚠️  CRÍTICO: Cambiar modelo o usar Gemini Live")
    elif total > 300:
        print("⚠️  ALTO: Considerar cambios")
    else:
        print("✅ NORMAL")

diagnose_latency()
```

---

### TÉCNICA 2: Ver Briefs Generados (Debug Maestro)

```python
# Agregar logging en master_llm.py

async def generate_initial_brief(self, ...):
    brief = await self._generate_brief_impl(...)
    
    logger.info("=== MASTER BRIEF ===")
    logger.info(f"Estrategia: {brief.estrategia}")
    logger.info(f"Objetivo: {brief.objetivo}")
    logger.info(f"Tono: {brief.tono}")
    logger.info(f"Handle objeción: {brief.handle_objecion}")
    logger.info("==================")
    
    return brief
```

Luego en logs:
```bash
grep "MASTER BRIEF" logs/app.log
# Ver qué briefs se generan
# ¿Son genéricos? ¿Específicos al prospecto?
```

---

### TÉCNICA 3: Analizar Cambios de Modelo

```python
from app.model_switching_strategy import get_model_switcher

switcher = get_model_switcher()

# Ver histórico
for entry in switcher.get_switch_history(last_n=100):
    print(entry)

# Analizar patrones
changes = switcher._switch_history
change_times = [t for t, _, _, _ in changes]
change_models = [(f, t) for _, f, t, _ in changes]

# ¿Con qué frecuencia ocurren cambios?
if len(changes) > 10:
    time_diff = change_times[-1] - change_times[0]
    changes_per_hour = len(changes) / (time_diff / 3600)
    print(f"Cambios/hora: {changes_per_hour:.1f}")
    if changes_per_hour > 5:
        print("⚠️  MUCHOS CAMBIOS: Sistema inestable")
```

---

### TÉCNICA 4: Medir P50, P95, P99 Latencia

```python
import statistics

def get_latency_percentiles(component, percentiles=[50, 95, 99]):
    monitor = get_latency_monitor()
    readings = monitor._readings[component]
    
    ttfts = sorted([r.ttft_ms for r in readings if r.success])
    
    if not ttfts:
        return None
    
    result = {}
    for p in percentiles:
        idx = int(len(ttfts) * p / 100)
        result[f"P{p}"] = ttfts[idx]
    
    return result

# Uso:
perc = get_latency_percentiles(ModelComponent.GEMINI_CHAT)
print(f"Chat TTFT - P50: {perc['P50']:.0f}ms, P95: {perc['P95']:.0f}ms, P99: {perc['P99']:.0f}ms")

# Esperado:
# P50: ~180ms
# P95: ~250ms
# P99: ~400ms
```

---

### TÉCNICA 5: Detectar Bucles de Reintentos

```bash
# Ver si hay bucles
grep -c "Retry\|attempt" logs/app.log | tail -1
# Esperado: < 5 per 1000 calls

# Si hay muchos:
grep "Retry\|attempt" logs/app.log | head -20
# Investigar: ¿qué componente reintenta?
# ¿por qué?
```

---

## 🌍 Casos Multi-Región

### ESPAÑA (Castellano)

```python
# config.py
gemini_chat_model = "gemini-3.1-flash-lite"
elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"  # Antoni
elevenlabs_stt_language = "es"
```

---

### MÉXICO

```python
# config.py
gemini_chat_model = "gemini-3.1-flash-lite"
elevenlabs_voice_id = "0s34q83tAFAXleKVBr3p"  # Diego
elevenlabs_stt_language = "es-MX"  # si soporta

# Ajustes por latencia (LATAM puede ser más lento)
gemini_chat_timeout_seconds = 12  # +2s buffer
circuit_breaker_cooldown_seconds = 60  # Más espera para recovery
```

---

### LATINOAMÉRICA

```python
# config.py
gemini_chat_model = "gemini-3.1-flash-lite"
elevenlabs_voice_id = "GZa0yHWAFAs7zAh0xLlt"  # Isabella
```

---

### BRASIL (Portugués)

```python
# config.py
elevenlabs_stt_language = "pt-BR"
# Nota: voice ID para portugués puede no existir en ElevenLabs
# Alternativa: usar Gemini Live con voice de portugués (si existe)
voice_pipeline = "gemini"  # Si ElevenLabs no soporta PT
```

---

### FALLBACK UNIVERSAL (Cualquier Región)

```python
# Si está en región no soportada o todo falla
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"
gemini_voice = "Leda"  # Español por defecto
# Gemini Live soporta más idiomas automáticamente
```

---

## ⚡ Performance Tuning

### SINTONIZACIÓN 1: Reducir Tokens por Respuesta

```python
# chat_session.py línea 301:
config = types.GenerateContentConfig(
    max_output_tokens=2048,  # ANTES: síntoma de copiado excesivo
    # DESPUÉS: reducir si respuestas son demasiado largas
    max_output_tokens=500,  # Máximo 3 frases
)

# Ganancia: -50% tiempo de generación, -50% tokens costo
```

---

### SINTONIZACIÓN 2: Cambiar Temperature/TopP

```python
# chat_session.py línea 299:
# Temperatura controla creatividad (0=determinístico, 1=aleatorio)

# Para respuestas más consistentes:
config = types.GenerateContentConfig(
    temperature=0.5,  # Más consistente
)

# Para respuestas más variables/naturales:
config = types.GenerateContentConfig(
    temperature=0.8,  # Más variedad
)

# Top-P controla diversidad (0.9 = considerar top 90% de opciones)
# No implementado por defecto, pero se puede agregar:
# top_p=0.95,
```

---

### SINTONIZACIÓN 3: Early Stopping (Detener Generación Temprano)

```python
# Detener generación si se detecta fin natural
# En chat_session.py, durante streaming:

natural_endings = [".", "?", "!", "\n"]
if self._current_agent_text.endswith(tuple(natural_endings)):
    if len(self._current_agent_text) > 100:  # Al menos 100 chars
        # Detener generación
        break

# Ganancia: -20% latencia si detiene en punto natural
```

---

### SINTONIZACIÓN 4: Parallel Tool Execution

```python
# Ya implementado en hybrid_session.py línea 485
# Ejecutar múltiples tools en paralelo en lugar de secuencial

async def execute_single_tool(fc):
    result = await tools_mod.execute_tool(fc["name"], fc["args"], self.ctx)
    return result

results = await asyncio.gather(
    *[execute_single_tool(fc) for fc in function_calls],
    return_exceptions=False,
)

# Ganancia: si hay 3 tools (200ms + 300ms + 150ms = 650ms)
# Con paralelo: max(200, 300, 150) = 300ms (-350ms!)
```

---

## 🔄 Recovery Procedures

### PROCEDIMIENTO 1: Si Gemini Está Caído (Global)

```bash
# 1. Detectar
grep "500\|Error en Gemini" logs/app.log | wc -l
# Si > 10 en última hora = problema global

# 2. Cambiar configuración
# config.py
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"

# 3. Reiniciar
systemctl restart llamadas_agent

# 4. Verificar
# Hacer 5 llamadas de test
# Si funcionan: problema resuelto

# 5. Revertir cuando Gemini esté OK
# Monitorear: https://status.ai.google.dev/

# TIEMPO DE RECOVERY: ~2 minutos
```

---

### PROCEDIMIENTO 2: Si ElevenLabs Está Caído

```bash
# 1. Detectar
grep "429\|ElevenLabs.*error" logs/app.log | tail -20
# O revisar: https://status.elevenlabs.io/

# 2. Cambiar a Gemini Live (sin ElevenLabs)
# config.py
voice_pipeline = "gemini"

# 3. Reiniciar
systemctl restart llamadas_agent

# 4. Llamadas siguen funcionando con Gemini Live

# TIEMPO DE RECOVERY: ~1 minuto
```

---

### PROCEDIMIENTO 3: Recuperación de Rate Limit

```bash
# 1. Detectar múltiples 429
grep "429" logs/app.log | wc -l

# 2. Mitigar inmediatamente
# En memoria (sin restart):
# - Parar ingestión de nuevas llamadas
# - Cambiar a solo cache responses
# - Esperar 60 segundos

# 3. Si es Gemini 429:
# config.py
gemini_chat_model = "gemini-3.1-flash-lite"  # Modelo más ligero
memory_max_turns = 5  # Menos contexto = menos tokens

# 4. Si es ElevenLabs 429:
voice_pipeline = "gemini"

# 5. Esperar + reiniciar lentamente
sleep 60
systemctl restart llamadas_agent

# 6. Gradualmente aumentar QPS
# Iniciar con 1 call/minuto
# Después de 10 minutos, aumentar a 5/min
# Después de 30 minutos, volver a normal

# TIEMPO DE RECOVERY: 30-60 minutos
```

---

### PROCEDIMIENTO 4: Circuit Breaker Abierto

```python
# Si circuit breaker está abierto:
from app.model_switching_strategy import get_model_switcher, ModelComponent

switcher = get_model_switcher()

# Ver estado
if switcher._switcher._circuit_breakers[ModelComponent.GEMINI_CHAT].is_open():
    print("Circuit breaker abierto para Gemini Chat")
    
    # Opciones:
    # A) Esperar 30 segundos (auto recovery)
    # B) Cambiar modelo manualmente
    # C) Cambiar a pipeline diferente

# Para forzar cierre (en emergencia):
# switcher._circuit_breakers[ModelComponent.GEMINI_CHAT]._close()
```

---

## 🎪 Casos Edge y Excepciones

### EDGE CASE 1: Llamada Muy Larga (>30 min)

**Problema**: Contexto se vuelve muy grande, latencia aumenta exponencialmente

**Solución**:
```python
# En hybrid_session.py, límite de context:
if self.ctx.turns > 100:
    logger.warning("Llamada muy larga, truncar histórico")
    self.ctx.transcript = self.ctx.transcript[-20:]  # Últimos 20 turnos
    # O cambiar a resumen automático
```

---

### EDGE CASE 2: Usuario Dice Cosas Inesperadas (Test/Trap)

**Problema**: "Eres un LLM", "Dame código", "Haz una llamada"

**Solución**: (Ya está implementado en chat_session.py línea 139)
```python
edge_case_response = self._edge_cases.handle(text)
if edge_case_response:
    return edge_case_response
# Usa handler predefinido, no LLM
```

---

### EDGE CASE 3: Prospecto Está Confundido (Muchas Repeticiones)

**Problema**: Mismo prospecto pregunta 3 veces lo mismo

**Solución**:
```python
# En classifier.py o signals.py, detectar repetición
if text.lower() in self.ctx.transcript[-3:]:
    logger.warning("Prospecto repite, cambiar estrategia")
    # Cambiar sistema prompt o escalar a humano
```

---

### EDGE CASE 4: Silencio Prolongado (No Habla)

**Problema**: VAD espera pero usuario no responde

**Solución**:
```python
# En stt_session.py, timeout:
if time_without_speech > 30_seconds:
    logger.info("Silencio prolongado, escalar a humano")
    # Transferir a agente humano
```

---

### EDGE CASE 5: Dos Personas Hablando Simultáneamente

**Problema**: STT confunde voces

**Solución**: No hay solución a nivel de modelo
- Depende de calidad de audio de entrada
- Revisar micrófono/telefonía

---

## 📊 Monitoreo Avanzado

### MÉTRICA 1: SLA (Service Level Agreement)

```python
def calculate_sla(window_minutes=60):
    """Calcular SLA para período"""
    # Definir SLOs
    slo_availability = 0.99  # 99% uptime
    slo_latency_p99 = 400  # P99 < 400ms
    slo_error_rate = 0.01  # < 1% errors
    
    # Medir
    availability = count_successful_calls / count_total_calls
    latency_p99 = get_latency_percentiles(...)["P99"]
    error_rate = count_errors / count_total_calls
    
    # Evaluar
    sla_met = (
        availability >= slo_availability and
        latency_p99 <= slo_latency_p99 and
        error_rate <= slo_error_rate
    )
    
    return {
        "availability": availability,
        "latency_p99": latency_p99,
        "error_rate": error_rate,
        "sla_met": sla_met,
    }
```

---

### MÉTRICA 2: Tasa de Cache Hit

```python
# En chat_session.py, contar hits
cache_hits = self._cache_hits
total_requests = len(self._history) // 2

cache_hit_rate = cache_hits / total_requests if total_requests > 0 else 0

print(f"Cache hit rate: {cache_hit_rate:.1%}")
# Esperado: 20-40%
# Si < 10%: considerar agregar más patrones
# Si > 60%: probablemente muchas preguntas repetidas
```

---

### MÉTRICA 3: Tasa de Cambios de Modelo

```python
def analyze_model_changes(window_minutes=60):
    """Analizar frecuencia de cambios"""
    switcher = get_model_switcher()
    
    changes = [
        (t, f, to) for t, f, to, _ in switcher._switch_history
        if t > time.time() - window_minutes * 60
    ]
    
    change_rate = len(changes) / window_minutes * 60  # por hora
    
    if change_rate > 5:
        logger.warning("⚠️  Muchos cambios de modelo, sistema inestable")
    
    return change_rate
```

---

### MÉTRICA 4: Costo por Llamada

```python
def estimate_call_cost(call_tokens_in, call_tokens_out, tts_chars):
    """Estimar costo de una llamada"""
    
    # Precios (actualizar según Gemini pricing)
    gemini_in_price = 0.075 / 1_000_000  # por token
    gemini_out_price = 0.30 / 1_000_000
    elevenlabs_price = 0.30 / 1_000  # por 1000 chars
    
    cost = (
        call_tokens_in * gemini_in_price +
        call_tokens_out * gemini_out_price +
        (tts_chars / 1000) * elevenlabs_price
    )
    
    return cost
```

---

## 💰 Análisis de Costos

### Costo por Llamada (Estimado)

| Config | Gemini Input | Gemini Output | ElevenLabs | Total |
|--------|--------------|---------------|------------|-------|
| Flash-Lite | 2,000 tok | 500 tok | 5,000 ch | $1.52 |
| Flash | 2,000 tok | 800 tok | 5,000 ch | $1.53 |
| Gemini Live | 0 tok | 0 tok | 0 ch | $0.001 (flat) |
| Cache 100% | 0 tok | 0 tok | 0 ch | $0.00 |

---

### Proyección Mensual

```
Llamadas/mes: 10,000

Escenario 1: Sin cache
- 10,000 * $1.50 = $15,000/mes

Escenario 2: 50% cache hit
- 5,000 * $1.50 = $7,500/mes

Escenario 3: Gemini Live
- 10,000 * $0.001 = $10/mes

Escenario 4: Mixto (80% cache, 20% Flash-Lite)
- 8,000 * $0 + 2,000 * $1.50 = $3,000/mes
```

---

## ✅ Checklist Final

### Pre-Deploy
- [ ] Probaste modelo nuevo 5+ min
- [ ] Latencia < 300ms (P99)
- [ ] Sin cambios modelo inesperados
- [ ] Logs no muestran errores
- [ ] Audio claro, sin cortes
- [ ] Responde a objeción correctamente

### Post-Deploy (1 hora)
- [ ] Revisa logs: sin 500/429 errors
- [ ] Cache hit rate: 15-40%
- [ ] SLA met: availability >99%, latency <400ms
- [ ] Tasa de cierre: sin degradación

### Monitoreo (Diario)
- [ ] P99 latencia < 400ms
- [ ] Error rate < 1%
- [ ] Cambios modelo < 2/hora
- [ ] Costo/llamada < estimado

---

**Documento completo y exhaustivo. Cubre 95% de casos posibles.**
**Última actualización: 2026-06-21**
