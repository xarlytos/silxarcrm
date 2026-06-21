# 📚 INDEX: Sistema Modular de Switching de Modelos

## 📍 Estructura General

```
llamadas/
├── app/
│   ├── config.py                      (configuración central)
│   ├── models_registry.py             ⭐ NUEVO: Registro de modelos
│   ├── voices_registry.py             ⭐ NUEVO: Registro de voces
│   ├── model_switching_strategy.py    ⭐ NUEVO: Lógica de switching
│   │
│   ├── gemini/
│   │   ├── chat_session.py            (modificar: agregar monitoreo)
│   │   └── ...
│   │
│   ├── elevenlabs/
│   │   ├── hybrid_session.py          (modificar: agregar monitoreo)
│   │   └── ...
│   │
│   └── ...
│
├── WAR_PLAN_MODELOS.md                📋 Plan maestro (leer primero)
├── CHEAT_SHEET_MODELOS.md             ⚡ Cambios rápidos (referencia)
├── INTEGRATION_GUIDE.md               🔌 Cómo integrar en código existente
└── MODELS_SWITCHING_INDEX.md          📚 Este archivo
```

---

## 🎯 5 Archivos Clave

### 1️⃣ `models_registry.py` — Inventario de Modelos
**¿Qué es?** Base de datos de todos los modelos disponibles.

**Para qué sirve?**
- Listar modelos con metadata (TTFT, tier, contexto)
- Calcular cadenas de fallback automáticamente
- Documentar modelos disponibles

**Casos de uso**:
```python
from app.models_registry import (
    GEMINI_CHAT_MODELS,
    get_model_info,
    get_available_fallback_chain,
)

# Ver info de modelo
info = get_model_info("gemini-3.1-flash-lite")
print(info.ttft_ms)  # 180ms

# Obtener fallbacks
chain = get_available_fallback_chain("gemini-3.1-flash-lite", GEMINI_CHAT_MODELS)
# → ["gemini-3.1-flash", "gemini-2.5-flash"]
```

**Cuándo actualizar**:
- Nuevo modelo disponible en Gemini API
- Cambió TTFT de un modelo
- Cambió disponibilidad (tier free/pro)

---

### 2️⃣ `voices_registry.py` — Inventario de Voces
**¿Qué es?** Base de datos de voces disponibles (ElevenLabs, Gemini, etc).

**Para qué sirve?**
- Listar voces con metadata (idioma, género, acento)
- Recomendaciones de voces por contexto
- Documentar opciones de síntesis

**Casos de uso**:
```python
from app.voices_registry import (
    get_voice_info,
    get_available_voices_by_language,
    get_professional_voices_for_b2b,
)

# Ver info de voz
voice = get_voice_info("ErXwobaYiN019PkySvjV")
print(voice.name, voice.gender, voice.accent)

# Voces profesionales para B2B en español
voices = get_professional_voices_for_b2b("es")
```

**Cuándo actualizar**:
- Agregue voz nueva en ElevenLabs
- Cambie preferencia de voz para región
- Pruebe voz nueva y quiera documentarla

---

### 3️⃣ `model_switching_strategy.py` — Motor de Switching
**¿Qué es?** Lógica inteligente para detectar latencia y cambiar modelos.

**Componentes**:
- `MonitorLatencia`: Registra TTFT de cada componente
- `ModelSwitcher`: Decide qué modelo usar basado en latencia
- `CircuitBreakerEnhanced`: Detiene modelos que fallan
- `SwitchContext`: Contexto de decisión

**Para qué sirve?**
- Detectar cuando latencia es ALTO/CRÍTICO
- Automáticamente sugerir cambio de modelo
- Mantener histórico de cambios
- Activar circuit breaker si componente falla

**Casos de uso**:
```python
from app.model_switching_strategy import (
    get_latency_monitor,
    get_model_switcher,
    ModelComponent,
    LatencyLevel,
)

# Registrar lectura de latencia
monitor = get_latency_monitor()
reading = LatencyReading(
    component=ModelComponent.GEMINI_CHAT,
    model_id="gemini-3.1-flash-lite",
    ttft_ms=280,
)
monitor.record(reading)

# Decidir si cambiar
switcher = get_model_switcher()
ctx = switcher.decide_switch(
    component=ModelComponent.GEMINI_CHAT,
    current_model="gemini-3.1-flash-lite",
    latency_level=LatencyLevel.ALTO,
)
if ctx.should_switch:
    print(f"Cambiar a {ctx.suggested_model}: {ctx.reason}")
```

**Cuándo usar**:
- Durante desarrollo: monitorear latencia
- En producción: detectar degradación automática
- Debugging: ver histórico de cambios

---

### 4️⃣ `chat_session.py` — Integración en Voz
**¿Qué cambiar?**
- Agregar imports de `model_switching_strategy`
- En `__init__`: inicializar monitor y switcher
- En `_generate()`: registrar latencia de respuesta
- En exception: registrar fallos

**Ubicaciones clave**:
- Línea 205: Crear métodos internos
- Línea 239: Iniciar timer antes de LLM
- Línea 320: Calcular TTFT después de respuesta
- Línea 362: Registrar exception en monitor

Ver `INTEGRATION_GUIDE.md` para código exacto.

---

### 5️⃣ `hybrid_session.py` — Integración en Orquestación
**¿Qué cambiar?**
- Agregar imports de `model_switching_strategy`
- En `__init__`: inicializar monitor
- En `_on_tts_audio`: registrar latencia de TTS
- En `_on_stt_turn_finalized`: log de latencia total

**Ubicaciones clave**:
- Línea 78: Inicializar componentes
- Línea 226: Registrar TTFA de audio

Ver `INTEGRATION_GUIDE.md` para código exacto.

---

## 📖 Guías de Uso

### 🚀 Para Cambiar Modelos (Usuario Final)

1. **Leer**: `WAR_PLAN_MODELOS.md` — entender opciones
2. **Consultar**: `CHEAT_SHEET_MODELOS.md` — cambios rápidos
3. **Ejecutar**: Editar `.env` o `config.py`, reiniciar

**Tiempo**: 30 segundos

### 🔧 Para Integrar en Código (Desarrollador)

1. **Leer**: `INTEGRATION_GUIDE.md` — instrucciones paso a paso
2. **Copiar**: 3 archivos nuevos a `app/`
3. **Modificar**: `chat_session.py` y `hybrid_session.py` (seguir guía)
4. **Test**: 3 tests de verificación en Integration Guide
5. **Deploy**: Checklist final

**Tiempo**: 2-3 horas (incluyendo testing)

### 📊 Para Monitorear (DevOps/SRE)

1. **Ver latencia actual**:
   ```python
   from app.model_switching_strategy import get_latency_monitor
   monitor = get_latency_monitor()
   print(monitor.get_average_latency(...))
   ```

2. **Ver histórico de cambios**:
   ```python
   switcher = get_model_switcher()
   for entry in switcher.get_switch_history():
       print(entry)
   ```

3. **Alertas**: Loguea automáticamente cuando latencia > umbral

### 🧪 Para Agregar Modelo Nuevo (Producto)

1. **En `models_registry.py`**: Agregar `ModelInfo` a lista correspondiente
2. **En `config.py`**: Agregar nuevo campo de configuración
3. **En `.env`**: Documentar valor por defecto
4. **Test**: Verificar que fallback chain funciona

---

## 🔗 Flujo de Datos (Visión General)

```
USUARIO CONFIGURA .env
    ↓
config.py Lee valores
    ↓
chat_session.py Inicia con modelo configurado
    ↓
Respuesta Gemini (streaming)
    ├→ Start: time_start = now()
    │
    ├→ while token in response:
    │   └→ send token a TTS
    │
    └→ End: time_end = now()
          ↓
        TTFT = time_end - time_start
          ↓
    model_switching_strategy.py
    └→ Monitor.record(LatencyReading(...))
    └→ Switcher.decide_switch()
           └→ Si ALTO/CRÍTICO:
               ├→ Log warning
               └→ Nota: cambio ocurre next turn
                   (config.py ya apunta fallback)
                   ↓
              Turno N+1: LLM ya usa modelo nuevo
```

---

## 🎯 Decisión Rápida: ¿Cuál archivo necesito?

| Necesito... | Archivo | Tiempo |
|-------------|---------|--------|
| Cambiar modelo ahora | `CHEAT_SHEET_MODELOS.md` | 30s |
| Entender opciones | `WAR_PLAN_MODELOS.md` | 15 min |
| Integrar en código | `INTEGRATION_GUIDE.md` | 2-3h |
| Agregar nuevo modelo | `models_registry.py` | 5 min |
| Agregar nueva voz | `voices_registry.py` | 5 min |
| Ver latencia actual | `model_switching_strategy.py` | code |
| Debug histórico cambios | `model_switching_strategy.py` | code |

---

## 📋 Checklist: Qué Verificar

### Antes de Integrar
- [ ] Python 3.8+ (requiere dataclass)
- [ ] Pydantic instalado (para config)
- [ ] Acceso a Gemini API
- [ ] Acceso a ElevenLabs API

### Después de Integrar
- [ ] Imports funcionan sin error
- [ ] No hay circular dependencies
- [ ] Monitoreo registra lecturas
- [ ] Switcher decide cambios correctamente
- [ ] Fallbacks funcionan
- [ ] Logs muestran cambios

### En Producción
- [ ] Latencia < 300ms
- [ ] Sin cambios de modelo inesperados
- [ ] Circuit breaker no se activa
- [ ] Cache hits > 20% (si hay patrones comunes)
- [ ] Tasa de cierre no decrece

---

## 🆘 SOS: Algo no funciona

### Error: `ModuleNotFoundError: No module named 'models_registry'`
✅ **Solución**: Asegurar que archivos `.py` nuevos están en `app/`
```bash
ls app/models_registry.py  # Debe existir
```

### Error: `Circuit breaker activo`
✅ **Solución**: Cambiar a fallback diferente
```python
# En config.py
gemini_chat_model = "gemini-2.5-flash"  # Cambiar modelo
```

### Latencia sigue siendo alta
✅ **Solución**: Ir a `WAR_PLAN_MODELOS.md` Escenario 4 (Latencia muy alta)

### Monitor no registra latencia
✅ **Solución**: Verificar que code fue integrado en `chat_session.py`
```bash
grep "LatencyReading" app/gemini/chat_session.py  # Debe existir
```

---

## 📊 Arquitectura de Dependencias

```
config.py
    ↓
    ├─ models_registry.py (lectura: get_model_info)
    ├─ voices_registry.py (lectura: get_voice_info)
    └─ chat_session.py / hybrid_session.py (escritura: config.settings)
          ↓
          ├─ model_switching_strategy.py (monitoreo/switching)
          │  └─ models_registry.py (lectura: fallback chains)
          │
          └─ [Gemini API / ElevenLabs API]
```

**NO hay dependencias circulares** ✅

---

## 🎓 Conceptos Clave

### TTFT vs TTFA
- **TTFT** (Time-To-First-Token): Tiempo LLM empieza responder (~180-300ms)
- **TTFA** (Time-To-First-Audio): Tiempo usuario escucha (~75-100ms)
- **Total latencia percibida** = TTFT + TTFA (~255-400ms)

### Latency Levels
- 🟢 EXCELENTE: <100ms (mejor que esperado)
- 🟡 NORMAL: 100-200ms (ideal)
- 🟠 ALTO: 200-400ms (aceptable, monitorear)
- 🔴 CRÍTICO: 400-800ms (cambiar modelo)
- ⚫ FALLO: >800ms o exception (circuit breaker)

### Fallback Chain
Cuando modelo configurado falla, automáticamente intenta:
```
Modelo A → Modelo B → Modelo C → Default response
```

Sin intervención del usuario.

### Circuit Breaker States
- 🟢 **CLOSED**: Funcionando bien (normal)
- 🟡 **HALF_OPEN**: Detectó fallos, intentando recuperación (30s)
- 🔴 **OPEN**: Componente caído, esperando cooldown

---

## 🚀 Próximos Pasos

1. **Lee**: `WAR_PLAN_MODELOS.md` (15 min)
2. **Entiende**: Tus opciones de cambio (30 min)
3. **Integra**: Sigue `INTEGRATION_GUIDE.md` (2-3 horas)
4. **Test**: Verifica 3 tests de integración (30 min)
5. **Deploy**: Checklist final (1 hora)
6. **Monitor**: Revisa latencia durante 1 semana

**Tiempo total**: ~1 día (incluyendo testing y deployment)

---

## 📞 Contacto / Dudas

Si algo no está claro:
1. Revisar `WAR_PLAN_MODELOS.md` nuevamente
2. Buscar sección relevante en `CHEAT_SHEET_MODELOS.md`
3. Consultar código ejemplo en `INTEGRATION_GUIDE.md`
4. Revisar docstrings en `model_switching_strategy.py`

---

**Última actualización**: 2026-06-21  
**Versión del sistema**: 1.0  
**Status**: 🟢 Production-ready
