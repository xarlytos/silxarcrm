# Documentacion Tecnica - Agente de Voz AI Modular (Sistema LEGO)

> **Version:** 2.0
> **Fecha:** Junio 2026
> **Stack:** Python 3.11 / FastAPI / ElevenLabs Flash v2.5 + Gemini Chat / Twilio
> **Autor:** Equipo de Ingenieria - Silxar CRM

---

## Tabla de Contenidos

1. [Resumen Ejecutivo Tecnico](#1-resumen-ejecutivo-tecnico)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Sistema Modular LEGO](#3-sistema-modular-lego)
4. [Los Dos Problemas Principales](#4-los-dos-problemas-principales)
5. [Adaptaciones por Software](#5-adaptaciones-por-software)
6. [Pipeline de Audio y Latencia](#6-pipeline-de-audio-y-latencia)
7. [Maquina de Estados Comercial](#7-maquina-de-estados-comercial)
8. [Sistema de Tools](#8-sistema-de-tools)
9. [Post-Call Workflow](#9-post-call-workflow)
10. [Pendiente Tecnico](#10-pendiente-tecnico)

---

## 1. Resumen Ejecutivo Tecnico

Este documento describe el **sistema de agente de voz AI modular** disenado para operar como una plataforma multi-software. El motor subyacente (pipeline de audio, state engine, classifier) es generico y reutilizable. Cada software (SmartDental, Peluguau, Groomly, futuros) conecta su propio **"kit de personalizacion"** (AgentConfig) que define: personaje, voz, scripts, casos de exito, precios, moneda, templates de WhatsApp, y compliance.

El sistema opera en un pipeline de audio en tiempo real con latencia de **~435ms** - nivel "indistinguible de humano".

**Stack tecnico:**
- **FastAPI** como servidor HTTP/WebSocket
- **ElevenLabs Flash v2.5** como motor de voz (STT Scribe v2 + TTS Flash v2.5, ~75ms TTFA)
- **Gemini Chat API** como LLM conversacional (naturalizador, no decisor)
- **Twilio** para telefonia (Media Streams, llamadas salientes, WhatsApp)
- **AudioBridge** para conversion mu-law 8kHz <-> PCM 16kHz
- **PostgreSQL** para persistencia de leads, calls, VoiceAgentConfig
- **Redis** para estado de conversaciones en caliente

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura (Simplificado)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 0: MASTER LLM - Gemini 3.5 Flash (~300ms)                             │
│  Corre: cada 2-3 turnos + eventos criticos                                  │
│  Input: historial completo (ultimos 10 turnos) + estado + clasificacion     │
│  Output: BRIEF (JSON) -> objetivo, estrategia, puntos clave, prohibiciones  │
│  NO habla con el usuario. Solo escribe guiones para el Voz.                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      v (brief JSON almacenado en memoria)
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 1: SUPERVISOR ESTRATEGICO (lightweight)                                │
│  Solo pre-call + excepciones (HOT LEAD / OPT OUT / TRANSFER)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      v
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 2: MINI CLASSIFIER (hibrido) - Gemini 2.5 Flash                       │
│  Solo cuando hay cambio / objecion / cada 3 turnos                          │
│  Output: intencion + tags + confidence + emocion + objecion                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      v
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 3: STATE ENGINE PROBABILISTICO + CALL GOAL                            │
│  Stage + next_stages_probs + confidence + tags (NO lineal)                  │
│  Hysteresis: minimo 2 turnos antes de transicionar                          │
│  CallGoal: progress + risk_of_loss + freno temprano                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      v
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 4: VOZ - Gemini 3.1 Flash-Lite (~180ms, ~380-400 T/s)                 │
│  Recibe: BRIEF del Maestro + ultimo turno del usuario                       │
│  Output: texto humano naturalizado (streaming, token-por-token)             │
│  NO decide estrategia. Solo interpreta el brief del Maestro en palabras.    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      v
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 5: MOTOR DE VOZ - ElevenLabs Flash v2.5                               │
│  STT: ElevenLabs Scribe v2 Realtime (PCM 16k in -> texto, ~120ms)            │
│  TTS: ElevenLabs Flash v2.5 (texto streaming -> mu-law 8kHz out, ~75ms)     │
│  Latencia Voz + TTS: ~255ms (Flash-Lite ~180ms + Flash v2.5 ~75ms)          │
│  Calidad: MOS ~4.2 (HD voice, acento configurable por software)             │
│  Voz: configurable por software ("Antoni" es-ES, voz mexicana, etc.)        │
│  Twilio Media Streams (WebSocket bidireccional, mu-law 8kHz)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Filosofia Arquitectural

> **El LLM es NATURALIZADOR, no DECISOR.**

La estrategia comercial la define el **State Engine** (codigo puro, <1ms). El LLM solo convierte esa estrategia en lenguaje humano natural. Esto elimina la variabilidad de "cada LLM vende diferente" y garantiza que TODAS las llamadas sigan el mismo framework de ventas.

### 2.3 Novedad: Sistema Modular LEGO

El sistema ahora separa el **motor generico** de los **"kits de personalizacion"** por software:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MOTOR GENERICO (sin cambios)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ State Engine │  │  Classifier  │  │ Audio Bridge │  │   Pipeline   │   │
│  │  (stages)    │  │  (intents)   │  │ (mu-law/PCM) │  │  (latency)   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ^
                                      │ consume
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KITS DE PERSONALIZACION (modulares)                    │
│                                                                             │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │
│   │  smartdental │   │   peluguau   │   │   groomly    │   + futuros...   │
│   │  (Carlos,    │   │  (Laura,     │   │  (Ana,       │                  │
│   │   dental ES) │   │   pet MX)    │   │   hair ES)   │                  │
│   └──────────────┘   └──────────────┘   └──────────────┘                  │
│                                                                             │
│   Cada kit define: nombre, voz, acento, scripts, casos, precios,            │
│   moneda, WhatsApp templates, disclosure, compliance...                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Ventajas:**
- Un solo motor, multiples personalizaciones
- Agregar un nuevo software = crear un archivo .py (15 min)
- Los tests existentes siguen pasando (regresion garantizada)
- Editable desde dashboard (DB) o desde codigo (archivos)

---

## 3. Sistema Modular LEGO

### 3.1 Arquitectura de Modulos

```
llamadas/app/modules/
  __init__.py      # Exporta load_agent_config(), AgentConfig
  types.py         # Dataclass AgentConfig (30+ campos)
  loader.py        # HTTP loader (backend) + cache + fallback local
  base.py          # Config generica fallback
  smartdental.py   # Kit: Carlos, dental, EUR, es-ES
  peluguau.py      # Kit: Laura, pet grooming, MXN, es-MX
  groomly.py       # Kit: Ana, hair salon, EUR, es-ES
```

### 3.2 AgentConfig (el "kit LEGO")

Dataclass con todos los campos personalizables por software:

```python
@dataclass
class AgentConfig:
    # Identidad del Agente
    agent_name: str              # "Carlos", "Laura", "Ana"
    agent_gender: str            # "masculino" | "femenino"
    agent_accent: str            # "es-ES", "es-MX"
    agent_tone: str              # "profesional_cercano", "cálida"
    agent_experience_years: int  # 3, 4, 5...
    elevenlabs_voice_id: str     # "ErXwobaYiN019PkySvjV" (Antoni)

    # Identidad del Producto
    company_name: str            # "SmartDental", "Peluguau"
    product_name: str            # "SmartDental Pro"
    product_description: str     # "Software de gestion para..."
    target_vertical: str         # "clinicas dentales"
    currency: str                # "EUR", "MXN"
    currency_symbol: str         # "EUR", "$"
    market_country: str          # "es", "mx"
    price_monthly: int           # 59, 299, 49

    # Scripts de Conversacion (JSON)
    scripts: dict                # pattern_interrupt, problema, solucion, cierre

    # Casos de Exito (JSON array)
    success_cases: list[dict]    # [{empresa, ciudad, resultado, metrica, testimonial}]

    # Dolores por Nicho (JSON)
    pain_points: dict            # {dolor_principal, ejemplos[], keywords[]}

    # Comparativas vs Competidores (JSON)
    competitor_comparisons: dict # {calendly: {diferencias[], caso_exito}, ...}

    # Free Value / Auditoria
    free_value_offer: str
    auditoria_base_url: str      # "https://auditoria.smartdental.es"

    # Gatekeeper / Recepcionista
    gatekeeper_script: str
    gatekeeper_max_turns: int    # 2

    # WhatsApp / Follow-up
    whatsapp_sender_name: str    # "Mariana", "Sofia", "Elena"
    whatsapp_templates: dict     # {info, confirmacion_demo, despedida, auditoria_web}

    # Compliance
    disclosure_text: str
    call_hour_start: int         # 9
    call_hour_end: int           # 20
    call_days_allowed: str       # "1,2,3,4,5,6"

    # CNAM / Caller ID
    twilio_cnam_name: str        # "SmartDental" (max 15 chars)
```

### 3.3 Carga de Config (Loader)

```python
# En cada llamada/simulacion:
config = await load_agent_config(software_id)

# Orden de preferencia:
# 1. Cache en memoria (TTL 5 min)
# 2. Backend HTTP (GET /api/voice-agent/config/:softwareId)
# 3. Modulo local Python (fallback offline)
# 4. Config base generica (ultimo recurso)
```

### 3.4 Backend: VoiceAgentConfig (Prisma)

Tabla nueva en la base de datos que guarda la config de cada software:

```prisma
model VoiceAgentConfig {
  id                  String   @id @default(cuid())
  softwareId          String   @unique
  software            Software @relation(fields: [softwareId], references: [id])

  agentName           String
  agentAccent         String   @default("es-ES")
  companyName         String
  productName         String
  targetVertical      String
  currency            String   @default("EUR")
  currencySymbol      String   @default("EUR")
  marketCountry       String   @default("es")
  priceMonthly        Int

  scripts             Json
  successCases        Json
  painPoints          Json
  competitorComparisons Json

  freeValueOffer      String
  auditoriaBaseUrl    String?
  gatekeeperScript    String?
  whatsappSenderName  String   @default("Mariana")
  whatsappTemplates   Json
  disclosureText      String

  callHourStart       Int      @default(9)
  callHourEnd         Int      @default(20)
  twilioCnamName      String?

  activo              Boolean  @default(true)
}
```

Endpoints:
- `GET /api/voice-agent/config/:softwareId` - usado por agente Python
- `PUT /api/voice-agent/admin/config/:softwareId` - edicion desde dashboard
- `POST /api/voice-agent/admin/generate/:softwareId` - auto-generar desde Software
- `POST /api/voice-agent/admin/clone` - clonar config de un software a otro
- `POST /api/voice-agent/admin/seed` - seed para todos los softwares existentes

### 3.5 Como Agregar un Nuevo Software (ej: VetPro)

1. **Crear modulo Python:** `app/modules/vetpro.py`
```python
from app.modules.types import AgentConfig

def get_config() -> AgentConfig:
    return AgentConfig(
        agent_name="Miguel",
        agent_accent="es-MX",
        company_name="VetPro",
        target_vertical="veterinarias",
        currency="MXN",
        currency_symbol="$",
        market_country="mx",
        price_monthly=499,
        scripts={...},
        success_cases=[...],
        pain_points={...},
    )
```

2. **Anadir al loader:** En `loader.py`, anadir `"vetpro": "app.modules.vetpro"` al `module_map`

3. **(Opcional) Crear en DB:** `POST /api/voice-agent/admin/generate/vetpro`

Listo. El agente ahora habla como "Miguel de VetPro" vendiendo a veterinarias mexicanas.

---

## 4. Los Dos Problemas Principales

### Problema #1: Funcional / De Ventas - "Free Value First" + Gatekeepers

**Descripcion:**
La primera llamada NO tiene como objetivo vender. El objetivo es entregar valor gratuito que el prospecto pueda usar inmediatamente, capturar el email, lidiar con gatekeepers (secretarias, recepcionistas), y agendar una demo.

**El "kit LEGO" resuelve esto asi:**
- Cada software define su `free_value_offer` (analisis gratuito personalizado)
- Cada software define su `gatekeeper_script` (script especifico para recepcionistas)
- Cada software define sus `pain_points` (dolores especificos del nicho)
- Cada software define sus `success_cases` (casos de exito del mismo sector)

**Gatekeepers:**
- SmartDental (Carlos): "Perfecto, le envio el analisis por WhatsApp - asi el doctor lo ve en el movil..."
- Peluguau (Laura): "Perfecto, no te preocupes. Le envio el analisis por WhatsApp - asi el dueno lo ve cuando tenga un momento..."

### Problema #2: Tecnico - Velocidad de Contestar (Latencia)

**Sin cambios.** La arquitectura dual (Maestro + Voz) sigue siendo el motor generico.
La latencia sigue siendo ~350-450ms. La unica diferencia es que el prompt se construye dinamicamente desde `AgentConfig` en lugar de ser hardcodeado.

**Componentes de latencia (sin cambios):**

| Componente | Latencia | Notas |
|------------|----------|-------|
| ElevenLabs STT (Scribe v2) | ~120-150ms | Streaming, VAD integrado |
| Gemini 3.1 Flash-Lite (Voz) | ~180ms | ~380-400 T/s, brief del Maestro |
| ElevenLabs TTS (Flash v2.5) | ~75ms | Ultra-low latency, voz configurable |
| **TOTAL end-to-end** | **~350-450ms** | **Nivel humano** |

---

## 5. Adaptaciones por Software

### 5.1 SmartDental (Espana - Dental)

```python
agent_name = "Carlos"
agent_accent = "es-ES"
company_name = "SmartDental"
target_vertical = "clinicas dentales"
currency = "EUR"
currency_symbol = "EUR"
market_country = "es"
price_monthly = 59
elevenlabs_voice_id = "ErXwobaYiN019PkySvjV"  # Antoni - espanol castellano
```

**Pattern Interrupt:**
> "Doctor? Se que esta ocupado, le prometo que solo le robo 30 segundos. Estoy haciendo un estudio con clinicas dentales en Madrid y encontre un dato que me preocupa: el 42% de pacientes que hacen una limpieza no vuelven en los 6 meses siguientes..."

**Dolor principal:** "pacientes que no regresan a su limpieza/control"

### 5.2 Peluguau (Mexico - Peluquerias Caninas)

```python
agent_name = "Laura"
agent_accent = "es-MX"
agent_tone = "calida_cercana"
company_name = "Peluguau"
target_vertical = "peluquerias caninas"
currency = "MXN"
currency_symbol = "$/pesos"
market_country = "mx"
price_monthly = 299
```

**Pattern Interrupt:**
> "Hola! Se que andas en chinga en la peluqueria. Te prometo que solo te quito 2 minutitos. Me fije que en Guadalajara muchas peluquerias caninas pierden hasta 20% de citas por cancelaciones de ultimo momento. A ti tambien te pasa?"

**Dolor principal:** "huecos por cancelaciones en temporada alta"

### 5.3 Groomly (Espana - Peluquerias Humanas)

```python
agent_name = "Ana"
agent_accent = "es-ES"
agent_tone = "elegante_profesional"
company_name = "Groomly"
target_vertical = "peluquerias y salones de belleza"
currency = "EUR"
currency_symbol = "EUR"
market_country = "es"
price_monthly = 49
```

**Pattern Interrupt:**
> "Hola? Llamo porque algo que veo mucho en peluquerias de Valencia es que captan una clienta, le dan un servicio excelente... y luego esa clienta desaparece. No porque no quiera volver, sino porque nadie le recuerda que existe. Eso le pasa en su salon?"

**Dolor principal:** "clientas que no regresan y citas canceladas sin avisar"

---

## 6. Pipeline de Audio y Latencia

**Sin cambios respecto a v1.0.** El motor de audio es generico y no depende del software.

```
[Prospecto habla] -> [Telefono] -> [Red movil/fija] -> [Twilio PSTN]
                                                                  |
                                                                  v (mu-law 8kHz)
                                                        [Twilio Media Streams]
                                                                  |
                                                                  v (PCM 16kHz)
                                              [AudioBridge: mu-law -> PCM decode]
                                                                  |
                                                                  v (texto)
                                              [Gemini Chat API - Naturalizador]
                                                                  |
                                                                  v (texto streaming)
                                              [ElevenLabs Flash v2.5 TTS]
                                                                  |
                                                                  v (mu-law 8kHz)
                                              [Twilio Media Streams]
                                                                  |
                                                                  v
                                                                  [Telefono]
```

---

## 7. Maquina de Estados Comercial

**Sin cambios.** El State Engine es generico y funciona para cualquier vertical.

```
┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────────┐
│  saludo  │--->│   discovery  │--->│  value_offer    │--->│  closing   │
│          │    │  (dolor)     │    │  (free value)   │    │  (demo)    │
└──────────┘    └──────────────┘    └─────────────────┘    └────────────┘
```

---

## 8. Sistema de Tools

### 8.1 Tools Actuales (12 tools)

| Tool | Funcion | Cuando se usa |
|------|---------|---------------|
| `consultar_crm` | Carga historial del lead | Inicio de llamada |
| `pre_call_brief` | Genera brief inteligente del lead | Pre-call |
| `buscar_caso_de_exito` | Busca caso relevante | Stage solution_aware |
| `social_proof_match` | Matching preciso de caso | Cuando hay dolor confirmado |
| `calcular_roi` | Calcula ROI de citas recuperadas | Stage quantification |
| `quantificar_dolor` | Calcula costo del problema | Stage quantification |
| `comparar_con_competidor` | Diferenciacion vs competidor | Si mencionan software actual |
| `trial_close` | Verifica interes antes de cerrar | Pre-closing |
| `agendar_demo` | Agenda demo en Cal.com | Stage closing |
| `recordatorio_demo` | Activa Triple Lock | Post-agendar |
| `enviar_whatsapp` | Envia WhatsApp | Post-call / value_offer |
| `transferir_humano` | Transfiere a vendedor humano | Hot lead o solicitud |
| `generar_auditoria_web` | Genera URL unica de auditoria | Stage value_offer |

### 8.2 Las Tools Ahora Son Dinamicas

Cada tool que genera texto para el usuario ahora consume `ctx.agent_config`:

- `quantificar_dolor`: Usa `config.currency_symbol` y `config.company_name`
- `recordatorio_demo`: Usa `config.whatsapp_sender_name` y `config.company_name`
- `generar_auditoria_web`: Usa `config.auditoria_base_url` y `config.target_vertical`
- `social_proof_match`: Usa `config.market_country` y `config.success_cases`
- `trial_close`: Usa `config.currency_symbol`
- `pre_call_brief`: Usa `config.pain_points` y `config.free_value_offer`

---

## 9. Post-Call Workflow

**Sin cambios en la logica.** Los follow-ups ahora usan templates dinamicos desde `AgentConfig`.

```
Llamada termina
    |
    |--> Analisis de sentimiento (heuristico, zero-LLM-cost)
    |--> BANT Score (Budget, Authority, Need, Timeline: 0-100)
    |--> Action Items (que hacer con este lead)
    |--> Enviar WhatsApp de follow-up (templates desde config)
    |--> Si agendo demo -> Triple Lock (3d email + 1d WhatsApp/SMS + 1h WhatsApp)
    |--> Si agendo demo -> No-show recovery (T+10min, T+15min, T+1h, T+3d)
    |--> Actualizar lead en CRM
    |--> Webhook enriquecido al backend
```

---

## 10. Pendiente Tecnico

### 10.1 Mejoras del Sistema Modular

- [ ] Cache distribuido (Redis) para VoiceAgentConfig en lugar de memoria local
- [ ] WebSocket push desde backend para invalidar cache cuando se edita config
- [ ] A/B testing: free value vs venta directa por software
- [ ] Dashboard UI para editar VoiceAgentConfig sin tocar codigo
- [ ] Clonacion de config entre softwares desde UI

### 10.2 Mejoras Post-Lanzamiento (Nice-to-Have)

- [ ] Co-localizar servidor en Europa (Frankfurt) -> -50-150ms latencia
- [ ] Streaming TTS token-by-token -> -150-300ms percibido
- [ ] Backchannels precargados ("mm-hmm", "entiendo") -> mejor fluidez
- [ ] Cache semantico de respuestas frecuentes -> -300-500ms en 30% de turnos
- [ ] Clonacion de voz (voz real de vendedor del software)
- [ ] Dashboard de funnel en tiempo real por software

### 10.3 Metricas a Monitorear (por software)

| Metrica | Target | Como se mide |
|---------|--------|--------------|
| Latencia end-to-end | <650ms | `metrics.py` - timestamp ultimo audio usuario -> primer audio agente |
| Tasa de contestacion | >30% | Twilio status callbacks (`answered` / `initiated`) |
| Duracion media llamada | >2 min | `ctx.elapsed_s()` al finalizar |
| Emails capturados | >20% | Contar outcomes con email guardado |
| Demos agendadas | >8% | Contar `outcome_demo_agendada` |
| Show rate (demo) | >70% | Comparar agendadas vs asistidas |
| Conversion a cliente | >15% | CRM - leads `CLIENTE` / leads con demo |

---

*Documento generado el 2026-06-03. Para actualizar, modificar el codigo fuente y regenerar.*
