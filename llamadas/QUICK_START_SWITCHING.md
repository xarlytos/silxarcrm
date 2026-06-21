# ⚡ QUICK START: 5 Minutos para Cambiar Modelos

## 🚀 Tarea: "Latencia demasiado alta, necesito cambiar modelo AHORA"

### Paso 1: Identificar el problema (30 segundos)

```bash
# Ver últimos errores
tail -f logs/app.log | grep -i "latencia\|timeout\|error" | head -20

# O en Python:
from app.model_switching_strategy import get_latency_monitor, ModelComponent
monitor = get_latency_monitor()
print(f"Chat TTFT: {monitor.get_average_latency(ModelComponent.GEMINI_CHAT)}ms")
print(f"TTS TTFA: {monitor.get_average_latency(ModelComponent.ELEVENLABS_TTS)}ms")
```

### Paso 2: Elegir solución rápida (1 minuto)

#### Opción A: Modelo más rápido
Si TTFT de Chat > 300ms:
```python
# En .env o config.py:
gemini_chat_model = "gemini-3.1-flash-lite"  # Ultra-rápido (180ms)
elevenlabs_latency_opt = 0  # TTS mínima latencia (75ms)

# Resultado esperado: ~255ms total (180+75)
```

#### Opción B: Sin ElevenLabs (nuclear)
Si ambos componentes están lentos o caídos:
```python
# En .env o config.py:
voice_pipeline = "gemini"
gemini_live_model = "gemini-3.1-flash-live-preview"

# Resultado esperado: ~350ms (sin STT/TTS overhead)
```

#### Opción C: Solo cambiar voz/acento
Si el problema es acento incorrecto, no latencia:
```python
# En .env o config.py:
elevenlabs_voice_id = "XB0fDUnXU5powFXDhCwa"  # Charlotte (femenino)
# O:
elevenlabs_voice_id = "0s34q83tAFAXleKVBr3p"  # Diego (mexicano)
```

### Paso 3: Reiniciar (1 minuto)

```bash
# Opción 1: Si es systemd
sudo systemctl restart llamadas_agent

# Opción 2: Si es Docker
docker restart llamadas_agent

# Opción 3: Si es proceso Python
pkill -f "python.*llamadas" && python app/main.py
```

### Paso 4: Verificar (1 minuto)

```bash
# Hacer una llamada de prueba
# O revisar logs:
tail -f logs/app.log | grep -i "TTFT\|latencia\|switch" | head -5

# Esperado: NO ver mensajes de ALTO/CRÍTICO
# Esperado: Ver latencias < 300ms
```

### Paso 5: Celebrar ✅

Done en ~5 minutos.

---

## 📋 Cambios Rápidos (copy-paste)

### Ultra-rápido (mejor para telefonía B2B)
```python
# .env
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
GEMINI_MASTER_MODEL=gemini-3.5-flash
ELEVENLABS_VOICE_ID=ErXwobaYiN019PkySvjV
ELEVENLABS_LATENCY_OPT=0
VAD_SILENCE_MS=150
```

### Balance (ultra-rápido + un poco más inteligente)
```python
# .env
GEMINI_CHAT_MODEL=gemini-3.1-flash
GEMINI_MASTER_MODEL=gemini-3.5-flash
ELEVENLABS_VOICE_ID=ErXwobaYiN019PkySvjV
ELEVENLABS_LATENCY_OPT=1
VAD_SILENCE_MS=150
```

### Sin dependencias externas (emergencia)
```python
# .env
VOICE_PIPELINE=gemini
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_VOICE=Leda
```

### Voz femenina profesional
```python
# .env
ELEVENLABS_VOICE_ID=XB0fDUnXU5powFXDhCwa  # Charlotte
```

### Voz mexicana
```python
# .env
ELEVENLABS_VOICE_ID=0s34q83tAFAXleKVBr3p  # Diego
```

---

## 🆘 "Probé cambio y sigue lento"

### Checklist rápido

- [ ] ¿Reiniciaste el servicio?
  ```bash
  ps aux | grep llamadas  # Ver si PID cambió
  ```

- [ ] ¿El nuevo modelo está realmente configurado?
  ```bash
  grep "GEMINI_CHAT_MODEL" .env
  echo $GEMINI_CHAT_MODEL  # Ver valor real
  ```

- [ ] ¿Hay fallback activado? (peor latencia)
  ```bash
  tail -f logs/app.log | grep "CIRCUIT BREAKER\|fallback"
  ```

- [ ] ¿Es problema de red/API key?
  ```bash
  curl -H "Authorization: Bearer $GEMINI_API_KEY" \
    https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY
  # Si 401 → API key inválida
  # Si timeout → problema de red
  ```

- [ ] ¿Gemini tiene rate limit?
  ```bash
  grep "429\|rate limit\|quota" logs/app.log | tail -5
  ```

### Si nada funciona: Nuclear Option
```python
# .env
VOICE_PIPELINE=gemini
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_VOICE=Leda
```

Si esto tampoco funciona → problema de API keys, no de modelos.

---

## 📊 Testing en 2 minutos

Hacer una llamada de prueba:

```python
# Script de test rápido
import asyncio
from app.config import settings
from app.gemini.chat_session import GeminiChatSession

async def test():
    session = GeminiChatSession(
        ctx=None,
        system_prompt="Eres un vendedor de software dental profesional.",
    )
    
    # Probar latencia
    import time
    start = time.time()
    await session.send_message("Hola, ¿cuál es el precio?")
    ttft = (time.time() - start) * 1000
    
    print(f"TTFT: {ttft}ms (esperado <300ms)")
    print(f"Modelo: {settings.gemini_chat_model}")

asyncio.run(test())
```

**Esperado**:
- ✅ TTFT < 300ms
- ✅ Respuesta clara en español
- ✅ Sin errores de API key
- ✅ No corta palabras

---

## 🔄 "Ya cambié, ahora necesito revertir"

Si el nuevo modelo es peor:

```bash
# Opción 1: Revertir a valor anterior
# .env
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite  # Valor anterior

# Opción 2: Revisar qué estaba antes
git diff .env  # Ver cambios
git checkout .env  # Revertir completamente
```

---

## 📈 Mejora Esperada

| Cambio | TTFT Antes | TTFT Después | Mejora |
|--------|-----------|-------------|--------|
| Flash-lite + latency=0 | 350ms | 255ms | -95ms (27%) |
| Flash → Flash-lite | 300ms | 180ms | -120ms (40%) |
| Cambiar a Gemini Live | 300ms | 350ms | +50ms (pero más estable) |

---

## 🎯 Matriz de Decisión Rápida

```
SÍNTOMA                           → CAMBIO
─────────────────────────────────────────────────────────────
"Demasiado lento"                 → GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
"Corta palabras al inicio"        → VAD_SILENCE_MS=200
"Sonido comprimido/artifacts"     → ELEVENLABS_LATENCY_OPT=1
"Acento incorrecto"               → ELEVENLABS_VOICE_ID=[otra]
"Gemini frecuentemente caído"      → VOICE_PIPELINE=gemini
"No entiende contexto"            → GEMINI_MASTER_MODEL=gemini-3.1-flash
"Muy formal/poco natural"         → Usar cache + humanización
```

---

## ✅ Checklist: Antes de ir a Producción

- [ ] Probaste cambio en dev local
- [ ] Latencia < 300ms
- [ ] Hiciste 5+ llamadas de test
- [ ] Sin errores en logs
- [ ] Objeciones responde bien
- [ ] Escalada a humano funciona
- [ ] Audio claro sin cortes

**Si todo ✓**: Deploy con confianza en 1 minuto.

---

## 🚨 Último Recurso: "TODO está roto"

```python
# Configuración ultrasegura (fallback máximo)
# .env
VOICE_PIPELINE=gemini
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_VOICE=Leda
VAD_SILENCE_MS=150

# Reiniciar
systemctl restart llamadas_agent

# Esperar 30s
sleep 30

# Probar
# Hacer llamada de test
```

Si esto sigue sin funcionar → Problema de API keys, no de modelos. Revisar:
- [ ] GEMINI_API_KEY válida
- [ ] ELEVENLABS_API_KEY válida (si usa ElevenLabs)
- [ ] Rate limits de Gemini
- [ ] Conexión a internet

---

## 📞 Soporte Rápido

| Problema | Solución |
|----------|----------|
| "Qué modelo debo usar?" | Lee `CHEAT_SHEET_MODELOS.md` |
| "Cómo integro esto?" | Lee `INTEGRATION_GUIDE.md` |
| "Necesito entender todo" | Lee `WAR_PLAN_MODELOS.md` |
| "Necesito lista de voces" | Mira `voices_registry.py` |
| "Necesito lista de modelos" | Mira `models_registry.py` |

---

**Recuerda**: ¡Siempre hay fallback automático! No puedes romper nada solo cambiando config.py.

Última actualización: 2026-06-21
