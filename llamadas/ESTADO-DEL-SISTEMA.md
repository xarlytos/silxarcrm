# Estado del Sistema — Agente de Ventas por Voz (Gemini Live + Twilio)

**Fecha:** 2026-05-28
**Mercado:** México · **Stack:** Python 3.11+ / FastAPI · **Voz:** nativa de Gemini

---

## 1. Resumen ejecutivo

El agente está **funcional y probado contra la API real de Gemini**. La cadena
técnica crítica (voz en tiempo real en español → tools → RAG → telefonía) está
operativa. Lo único que falta para llamadas telefónicas reales es **conectar una
cuenta Twilio** con número mexicano; el lado de IA ya está validado end-to-end.

> **Objetivo único del agente: agendar demos.** NO cierra ventas, no negocia precio
> ni activa pruebas en la llamada — eso se deja para la demo. La métrica de
> conversión clave es `demo_agendada`. (Se removió la tool de descuentos/negociación.)

- ✅ **28/28 tests** pasan · 17/17 módulos importan · compila limpio
- ✅ Live API verificada: devuelve voz en español *"Hola, soy Mariana. ¿En qué puedo ayudarte?"*
- ✅ Puente de audio Gemini ↔ Twilio probado (PCM 24kHz → frames µ-law de 160 bytes)
- ✅ RAG semántico probado (embeddings reales `gemini-embedding-001`)
- ⏳ Pendiente: credenciales Twilio + una llamada real para medir latencia con audio físico

---

## 2. Modelos verificados (corregidos vs. los docs originales)

| Rol | Modelo | Estado |
|-----|--------|--------|
| **Voz principal** | `gemini-3.1-flash-live-preview` | ✅ Verificado funcionando (preview) |
| **Fallback voz** | `gemini-2.5-flash-native-audio-latest` | ✅ Verificado (corregido: el ID de Vertex `gemini-live-2.5-...` NO sirve con API key de AI Studio) |
| **Embeddings RAG** | `gemini-embedding-001` | ✅ Verificado (3072 dims) |

> ⚠️ `gemini-3.5-flash` (citado en los docs originales) **no existe** como modelo de voz. Ya corregido en el código.

---

## 3. Latencia

### Medición real (con tu API key, entrada de texto → primer audio)

| Métrica | Valor |
|---------|-------|
| Tiempo al primer audio (mín / prom / máx) | **565 / 596 / 635 ms** |

Lo que se percibe como "qué tan rápido responde" es el **tiempo al primer audio**
(~0.6s), no el turno completo — el audio fluye en streaming mientras Mariana habla.

### Latencia end-to-end estimada en una llamada telefónica real

```
 Usuario deja de hablar
   + VAD endpointing (afinado a 500ms)          ~500 ms
   + red teléfono→Twilio→servidor→Gemini          ~50–150 ms
   + inferencia Gemini (1er audio, medido)        ~600 ms
   + servidor→Twilio→teléfono                      ~50–100 ms
 ─────────────────────────────────────────────
 Latencia percibida ≈ 1.0 – 1.3 s   (competitivo, nivel Retell/Vapi)
```

La **interrupción (barge-in)** es casi instantánea — que es lo que más se nota como "humano".

> **Primera respuesta ~300ms más rápida:** el handshake de conexión a Gemini Live
> mide **~312ms** (medido); con el **pre-calentamiento durante el timbre** ese costo
> sale del camino crítico, así que la *primera* respuesta de la llamada ya no lo paga.

### Afinado de VAD ya aplicado (sin perder calidad de voz)

Configurable en `.env` (`config.py`):
- `vad_silence_ms = 500` — silencio que espera para dar por terminado tu turno (↓ = responde antes)
- `vad_prefix_padding_ms = 150`
- `vad_start_sensitivity / vad_end_sensitivity = HIGH`

Bajar `vad_silence_ms` a ~300ms recorta otros ~200ms, con el riesgo de cortar al
prospecto si hace pausas largas. **500ms es el punto dulce recomendado.**

### Optimizaciones de latencia ya aplicadas
- ✅ **VAD afinado** (silencio de fin de turno a 500ms) → responde antes sin tocar la voz
- ✅ **Pre-carga del prospecto en el prompt**: el lookup de CRM se hace al construir la sesión, no como tool a mitad de frase → evita un round-trip durante la conversación (`media_stream._build_session`)
- ✅ **Pre-calentamiento de la sesión Live durante el timbre**: el handshake (~312ms medido) ocurre mientras Twilio monta el Media Stream → fuera del camino crítico de la primera respuesta (`media_stream.prewarm_session`, disparado desde `/voice`)

### Palancas restantes (no aplicadas aún)
- Co-locar el servidor cerca de Gemini (us-central) → −50–150ms de red

---

## 4. Precio

### Costo por minuto (precios verificados Gemini Live API)

| Concepto | Costo/min |
|----------|-----------|
| **IA — Gemini Live** (audio in $3/1M + out $12/1M) | **~$0.012/min** *(≈ $0 durante el preview actual)* |
| **Telefonía — Twilio MX, fijo** | ~$0.014/min |
| **Telefonía — Twilio MX, móvil** | ~$0.05/min ⚠️ |
| Embeddings RAG (`gemini-embedding-001`) | despreciable (centavos/mes) |
| **TOTAL (a fijo)** | **~$0.026/min** |
| **TOTAL (a móvil)** | **~$0.062/min** |

> ⚠️ **Ojo con México:** llamar a **móviles** mexicanos cuesta ~3–4x más que a fijos
> en Twilio. El costo de IA es bajísimo; **el driver de costo es la telefonía móvil**, no Gemini.

### Escenarios mensuales

**Escenario A — 500 llamadas × 5 min = 2,500 min/mes**

| Configuración | Costo/mes |
|---------------|-----------|
| Solo IA | ~$30 |
| IA + Twilio fijo | **~$65** |
| IA + Twilio móvil | ~$155 |
| + servidor (VPS) | +$20 |

**Escenario B — 5,000 intentos/mes (15% contestan = 750, 3 min prom = 2,250 min)**

| Configuración | Costo/mes |
|---------------|-----------|
| Solo IA | ~$27 |
| IA + Twilio fijo + no contestadas + VPS | **~$78** |

### Comparativa vs. alternativas no-code (mismo volumen, Escenario B)

| Opción | Costo/mes aprox. |
|--------|------------------|
| **Este sistema (DIY)** | **~$78** |
| Retell AI ($0.07/min) | ~$158 |
| Bland AI ($0.14/min) | ~$315 |
| SDR humano (1 persona) | ~$3,000+ |

> Durante el **preview gratuito** de la Live API, el costo de IA es ~$0, así que hoy
> pagas básicamente solo telefonía + servidor. Presupuesta el costo de IA para cuando salga de preview.

---

## 5. Qué está implementado

| Componente | Estado | Archivo |
|------------|--------|---------|
| Puente de audio µ-law↔PCM (16k/24k, frames 20ms, barge-in) | ✅ | `app/audio/bridge.py` |
| Sesión Gemini Live (audio, VAD afinado, tools, reconexión/fallback, callbacks adjuntables) | ✅ | `app/gemini/live_session.py` |
| Pre-calentamiento de sesión + pre-carga de prospecto (latencia) | ✅ | `app/telephony/media_stream.py` |
| 7 function-tools (CRM, RAG, ROI, competidor, agenda, WhatsApp, transfer) | ✅ | `app/gemini/tools.py` |
| RAG semántico con embeddings + fallback | ✅ | `app/knowledge/rag.py` |
| Contexto 4 capas + máquina de estados de venta | ✅ | `app/conversation/state.py` |
| System prompt anti-ruptura + scripts por nicho + prosodia | ✅ | `app/conversation/prompts.py` |
| Detección de emociones + caos (heurística, sin latencia extra) | ✅ | `app/conversation/signals.py` |
| Compliance MX (aviso IA, horario legal, opt-out/REUS) | ✅ | `app/compliance/mx.py` |
| Telefonía Twilio (salientes + AMD, TwiML, WhatsApp, transfer) | ✅ | `app/telephony/twilio_client.py` |
| Orquestador WebSocket + alertas + métricas cableadas | ✅ | `app/telephony/media_stream.py` |
| Servidor FastAPI (`/voice`, `/media`, `/outbound`, `/status`) | ✅ | `app/main.py` |
| Métricas (latencia + tasas de embudo) + alertas Slack | ✅ | `app/observability/` |
| Noise gate + AGC (opt-in, off por defecto) | ✅ | `app/audio/dsp.py` |

### Decisiones conscientes (no implementadas, con razón)
- **Diarización** y **echo cancellation explícito**: dependencias nativas pesadas, bajo ROI en llamadas 1:1; Gemini native-audio ya maneja el eco.
- **ElevenLabs**: omitido a propósito — la voz nativa de Gemini es más rápida y barata.
- **DSP de entrada (AGC/noise gate)**: implementado pero **off por defecto** (`enable_input_dsp`), porque alterar el audio puede degradar la comprensión nativa de Gemini. Activar solo si hay mucho ruido.

---

## 6. Pendiente para producción

1. **Conectar Twilio**: cuenta + número MX (E.164) en `.env` → habilita llamadas reales.
2. **Medir latencia real** con audio físico (Fase 1: una llamada de prueba con ngrok).
3. **Persistir RAG en pgvector** (Supabase): hoy funciona en memoria; `reindex_to_pgvector` ya genera y sube los embeddings cuando hay credenciales.
4. **CRM real** (Supabase): tablas `prospects` / `call_logs` (hoy degrada a modo offline).
5. **Compliance**: scrubbing REUS y revisión legal antes de escalar volumen.
6. **Rotar las API keys** compartidas en el chat.

---

## 7. Cómo correr y verificar

```bash
pip install -r requirements.txt
copy .env.example .env          # rellenar GEMINI_API_KEY (y Twilio para llamadas reales)
pytest -q                       # 28 tests (audio, tools, signals, metrics, rag, vad, prewarm)
uvicorn app.main:app --reload   # levantar servidor
ngrok http 8000                 # exponer; poner el dominio en PUBLIC_HOST del .env
python -m scripts.test_call +52155XXXXXXXX   # llamada de prueba a tu teléfono
```

**Healthcheck + métricas en vivo:** `GET /status` (modelo, voz, latencia, tasas de conversión).
