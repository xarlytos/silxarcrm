# ⚡ CHEAT SHEET: Cambios Rápidos de Modelos

## 🔥 Cambios de 1 línea

### Cambiar modelo de voz (TTFT)

```python
# En .env o config.py:
gemini_chat_model = "gemini-3.1-flash-lite"  # ← AQUÍ (ultra-rápido, 180ms)
gemini_chat_model = "gemini-3.1-flash"       # ← O AQUÍ (más inteligente, 250ms)
gemini_chat_model = "gemini-2.5-flash"       # ← O AQUÍ (muy estable, 280ms)
```

### Cambiar modelo estratega (Maestro)

```python
gemini_master_model = "gemini-3.5-flash"     # ← ACTUAL (320ms, excelente)
gemini_master_model = "gemini-3.1-flash"     # ← Fallback 1 (250ms, menos inteligente)
gemini_master_model = "gemini-2.5-flash"     # ← Fallback 2 (280ms, muy estable)
```

### Cambiar voz (timbre)

```python
elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"  # Antoni (castellano, masculino) ✅
elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"  # Charlotte (castellano, femenino)
elevenlabs_voice_id = "0s34q83tAFAXleKVBr3p"  # Diego (mexicano, masculino)
elevenlabs_voice_id = "GZa0yHWAFAs7zAh0xLlt"  # Isabella (latino, femenino)
```

### Cambiar latencia de ElevenLabs

```python
elevenlabs_latency_opt = 0  # MÍNIMA (~75ms TTFA), ideal telefonía ✅
elevenlabs_latency_opt = 1  # Balance (~100ms TTFA), si hay artifacts
elevenlabs_latency_opt = 2  # Más calidad (~150ms), NO para telefonía
elevenlabs_latency_opt = 3  # Aún más calidad (~200ms), NO usar
elevenlabs_latency_opt = 4  # Máxima calidad (~400ms), NUNCA en producción
```

### Cambiar pipeline completo

```python
voice_pipeline = "elevenlabs"  # ← ACTUAL (híbrido STT+TTS, mejor control) ✅
voice_pipeline = "gemini"      # ← FALLBACK (Gemini Live, sin ElevenLabs, 350ms)
```

### Cambiar VAD (detección de fin de habla)

```python
vad_silence_ms = 150  # ← ACTUAL (detección agresiva, latencia mínima) ✅
vad_silence_ms = 200  # Permite pausas naturales dentro de frases
vad_silence_ms = 250  # Muy tolerante, espera mucho a que hable
```

---

## 📊 Tabla Rápida: Qué cambiar según síntoma

| Síntoma | Cambiar | Valor | Latencia Esperada |
|---------|---------|-------|-------------------|
| **Muy lento (>400ms)** | `gemini_chat_model` | `"gemini-3.1-flash-lite"` | 180ms |
| Briefs malos | `gemini_master_model` | `"gemini-3.1-flash"` | 250ms |
| Acento incorrecto | `elevenlabs_voice_id` | Ver tabla de voces | 75ms |
| Calidad pobre (artifacts) | `elevenlabs_latency_opt` | `1` | 100ms |
| Corta palabras | `vad_silence_ms` | `200` | +50ms |
| Gemini caído | `voice_pipeline` | `"gemini"` | 350ms |
| Cache insuficiente | Agregar patrones | Ver `CACHED_RESPONSES` | 0ms |

---

## 🎯 Combinaciones Recomendadas

### ⚡ VELOCIDAD MÁXIMA
```python
voice_pipeline = "elevenlabs"
gemini_chat_model = "gemini-3.1-flash-lite"
gemini_master_model = "gemini-3.5-flash"
elevenlabs_latency_opt = 0
elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"
vad_silence_ms = 150
```
**Latencia total**: ~255ms (180ms LLM + 75ms TTS)

### ⚖️ BALANCE (ACTUAL)
```python
voice_pipeline = "elevenlabs"
gemini_chat_model = "gemini-3.1-flash-lite"
gemini_master_model = "gemini-3.5-flash"
elevenlabs_latency_opt = 1
elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"
vad_silence_ms = 150
```
**Latencia total**: ~280ms (180ms LLM + 100ms TTS)

### 🧠 INTELIGENCIA MÁXIMA
```python
voice_pipeline = "elevenlabs"
gemini_chat_model = "gemini-3.1-flash"
gemini_master_model = "gemini-3.1-flash"
elevenlabs_latency_opt = 1
elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"  # Charlotte (profesional)
vad_silence_ms = 200  # Permite pausas naturales
```
**Latencia total**: ~300ms (250ms LLM + 100ms TTS)

### 🆘 EMERGENCIA (SIN DEPENDENCIAS)
```python
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"
gemini_voice = "Leda"
vad_silence_ms = 150
```
**Latencia total**: ~350ms (Gemini Live nativo)

---

## 🔧 Debug Rápido

### Ver latencia actual (en código)
```python
from app.model_switching_strategy import get_latency_monitor, ModelComponent
monitor = get_latency_monitor()
chat_ms = monitor.get_average_latency(ModelComponent.GEMINI_CHAT)
tts_ms = monitor.get_average_latency(ModelComponent.ELEVENLABS_TTS)
print(f"Total TTFA: {chat_ms + tts_ms}ms")
```

### Agregar voz nueva (fácil)
```python
# En voices_registry.py:
from app.voices_registry import VoiceInfo, VoiceGender, VoiceProvider, ELEVENLABS_VOICES_ES_ES

ELEVENLABS_VOICES_ES_ES.append(VoiceInfo(
    id="nueva_id_de_elevenlabs",
    name="NuevaNombre",
    provider=VoiceProvider.ELEVENLABS,
    language="es",
    region="es-ES",
    gender=VoiceGender.MASCULINO,
    age_group="adulto",
    accent="castellano",
    professional=True,
    ttfa_ms=75,
    available=True,
    notes="Nueva voz agregada",
))

# Luego en config.py:
elevenlabs_voice_id = "nueva_id_de_elevenlabs"
```

### Agregar respuesta cacheada (0ms)
```python
# En chat_session.py, en CACHED_RESPONSES:
CACHED_RESPONSES = {
    # ... respuestas existentes ...
    "otro patrón común": "Respuesta que retorna en 0ms"
}
```

---

## 📋 Checklist Post-Cambio

- [ ] ¿Reiniciaste el servicio?
- [ ] ¿Revisaste logs? (`grep -i "error\|switch" logs/`)
- [ ] ¿Hiciste una llamada de prueba?
- [ ] ¿Latencia < 300ms?
- [ ] ¿Responde bien a objeciones?
- [ ] ¿No corta palabras?
- [ ] ¿Audio claro, sin ruido?

---

## 🚨 Fallback Automático (NO HAGAS NADA)

```
Intento 1: gemini-3.1-flash-lite (configurado) ❌
          ↓
Intento 2: gemini-3.1-flash (fallback 1) ❌
          ↓
Intento 3: gemini-2.5-flash (fallback 2) ✅ Usa este

Si TODO falla → Cache + fallback_response default
```

---

## 🆘 SOS de 30 segundos

Si la latencia es insoportable:

**Opción A (Rápida):**
```python
gemini_chat_model = "gemini-3.1-flash-lite"  # Ultra-rápido
elevenlabs_latency_opt = 0
```

**Opción B (Nuclear):**
```python
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"
```

Reinicia y listo.

---

**Pro tip**: Todos los cambios de modelo se logguean automáticamente. Ver histórico:
```python
from app.model_switching_strategy import get_model_switcher
switcher = get_model_switcher()
for line in switcher.get_switch_history(last_n=20):
    print(line)
```

Última actualización: 2026-06-21
