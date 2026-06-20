# Sistema de Llamadas AI: Guía Técnica para Carlos Zamudio

> **Versión:** 2.0  
> **Fecha:** Junio 2026  
> **Objetivo:** Explicar cómo funciona el agente de voz AI para vendedores que necesitan entender la tecnología detrás

---

## 📞 ¿Qué es este sistema?

Es un **robot vendedor inteligente** que:
- 📲 Llama a clientes potenciales (leads) automáticamente
- 🗣️ Mantiene conversaciones naturales en español
- 📊 Toma decisiones de venta (cuándo cerrar, cuándo esperar)
- 🎯 Agenda demos automáticamente
- 📝 Registra todo lo que pasó en la llamada

**El teléfono sigue siendo el canal con más conversiones en B2B. El problema es que hacer 50 llamadas frías al día agota. Esto lo automatiza.**

---

## 🏗️ Arquitectura: Las Dos IAs

El sistema funciona con **DOS inteligencias artificiales trabajando juntas**:

### 1️⃣ IA #1: "El Estratega" (La inteligente)
**Componente:** State Engine + Mini Classifier  
**Rol:** Define QUÉ vender y CUÁNDO cerrar  
**Velocidad:** ~1ms (código puro, sin internet)

```
┌─────────────────────────────────────────────────────────┐
│        "EL ESTRATEGA" — Toma decisiones comerciales     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Escucha lo que dice el prospecto                   │
│  2. Clasifica: ¿está interesado? ¿tiene dolor?        │
│  3. Decide el próximo paso:                             │
│     - Si tiene dolor → "cuéntame más sobre..."        │
│     - Si pide precio → "primero probamos juntos..."   │
│     - Si quiere agendar → "¿mañana a las 3?"         │
│                                                         │
│  El Estratega NO habla. Solo da instrucciones.        │
└─────────────────────────────────────────────────────────┘
```

**Ejemplo práctico:**
```
PROSPECTO: "Está bien, pero es caro"
           ↓
ESTRATEGA: (clasifica como "objeción_precio")
          (calcula riesgo_de_pérdida = 70%)
          (decide: "juega el caso de éxito antes de cerrar")
           ↓
Da instrucción al conversador: "Cuéntale sobre XYZ que ahorró 40%"
```

### 2️⃣ IA #2: "El Conversador" (La rápida)
**Componente:** Gemini Flash (modelo pequeño y veloz)  
**Rol:** Convierte las decisiones en palabras naturales  
**Velocidad:** ~180-200ms

```
┌─────────────────────────────────────────────────────────┐
│        "EL CONVERSADOR" — Habla naturalmente            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Recibe instrucción del Estratega                   │
│  2. Genera respuesta humana:                            │
│     Instrucción: "cuéntale caso de éxito"             │
│     Respuesta:   "Mira, una vet en Guadalajara        │
│                   parecida a la tuya, con 20 mascotas │
│                   por semana, antes hacía 3 llamadas   │
│                   de recordatorio... ahora con nosotros│
│                   automatiza todo y sus clientes       │
│                   regresan solos"                      │
│  3. Envía texto a la voz (TTS)                        │
│                                                         │
│  El Conversador NO decide. Solo interpreta.           │
└─────────────────────────────────────────────────────────┘
```

### ¿Por qué dos IAs?

| Aspecto | Estratega | Conversador |
|---------|-----------|-------------|
| **Tarea** | Tomar decisiones comerciales | Hablar de forma natural |
| **Velocidad** | Ultra-rápido (<1ms) | Rápido (~200ms) |
| **Costo** | Gratis (código puro) | Barato (modelo pequeño) |
| **Cambios** | Editable desde código | Editable también |
| **Variabilidad** | Cero (predecible) | Naturalidad humana |

**Ventaja:** Todas las llamadas siguen la MISMA estrategia de ventas, pero cada una suena natural y diferente.

---

## ⚡ Las Velocidades (Lo que siente el cliente)

### Diagrama del flujo (un turno completo)

```
[Prospecto habla]
       ↓
    150ms ← Escucha (ElevenLabs STT)
       ↓
     <1ms ← Estratega entiende y decide
       ↓
    200ms ← Conversador genera respuesta
       ↓
     75ms ← Convierte a voz (TTS)
       ↓
[Prospecto escucha respuesta]

TOTAL: 350-425ms
```

**¿Qué significa eso?**
- **Humano normal:** 600-1000ms de pausa (parece que está pensando)
- **Este sistema:** 350-425ms (es indistinguible de humano)

### Comparativa real

```
LLAMADA HUMANA:
Agente A: "Hola, buenos días..."
[Lead contesta]
[Pausa de ~500ms mientras el agente lee su información]
Agente A: "Veo que tienes una clínica..."

LLAMADA AI (este sistema):
"Hola, buenos días..." [Audio precargado]
[Lead contesta]
[Pausa de ~350ms - casi imperceptible]
"Veo que tienes una clínica..."
```

### Pre-calentamiento ("prewarm")

Truco de ingeniería: Mientras suena el teléfono, la IA **ya está conectada y lista**. Así la primera respuesta es aún más rápida.

```
MOMENTO 0: Twilio marca al lead
         ↓ (Le ordeno al conversador que se conecte)
MOMENTO 50ms: Conversador está listo (fuera del camino crítico)
         ↓
MOMENTO 5000ms: Lead contesta
         ↓
MOMENTO 5350ms: Lead escucha respuesta
```

Sin prewarm: Lead escucharía respuesta en 6000ms (~1.5s)  
Con prewarm: Lead escucha en 5350ms (~750ms)

---

## 🎯 Las Ventajas del Sistema

### Ventaja 1: Modular (LEGO)

El sistema está diseñado como piezas LEGO. Puedes tener varias empresas vendiendo, cada una con su propio "kit":

```
┌─────────────────────────────────────┐
│  Motor Genérico (sin cambios)       │
│  - Escuchar (STT)                   │
│  - Entender (Classifier)            │
│  - Decidir (State Engine)           │
│  - Hablar (Gemini Flash)            │
│  - Sonido natural (TTS)             │
└─────────────────────────────────────┘
         ↑            ↑            ↑
    [SmartDental]  [Peluguau]  [Groomly]
    (Carlos, ES)  (Laura, MX) (Ana, ES)
    €59/mes       $299/mes     €49/mes
```

**Beneficio:** Un cambio en el motor afecta a TODOS. No hay bugs paralelos.

### Ventaja 2: Configurable sin código

Puedes cambiar:
- 🎤 La voz (acento español, mexicano, colombiano)
- 🎭 El nombre del agente (Carlos, Mariana, etc.)
- 📝 Los scripts y frases
- 💰 El precio a mencionar
- 🏢 El nombre de la empresa

**Todo desde un archivo de configuración**, sin tocar código.

### Ventaja 3: Decisiones predecibles

Porque el Estratega es código puro (no LLM), cada prospecto recibe el MISMO tratamiento:

```
PROSPECTO DICE: "Es caro"

Llamada 1 a las 14:00
  → Estratega: riesgo_pérdida = 70% → toca caso de éxito
  → Respuesta: "Déjame mostrarte..."

Llamada 2 a las 14:15 (mismo prospecto en otra IA)
  → Estratega: riesgo_pérdida = 70% → toca caso de éxito
  → Respuesta: "Déjame mostrarte..." (otra vez, con natural)
```

No hay variabilidad. Es reproducible.

### Ventaja 4: Observable en tiempo real

Durante cada llamada ves:
- 📊 Qué stage de venta está el prospecto (`discovery`, `closing`, `exit`)
- 💯 La confianza de que haya entendido bien (0-100%)
- 😊 La emoción detectada (`interesado`, `molesto`, `ocupado`)
- 📈 El progreso hacia la demo (0-100%)
- ⚠️ El riesgo de perderlo (0-100%)

```
DURANTE LA LLAMADA VES:
├─ Stage: "solution_aware" (está entendiendo la solución)
├─ Confianza: 82%
├─ Emoción: "interesado"
├─ Progreso: 65%
└─ Riesgo: 25%
```

### Ventaja 5: Las dos vías (Humano vs AI)

Puedes elegir:

| Modo | Funciona así | Mejor para |
|------|--------------|-----------|
| **AI** | Llamada completamente automática | Volumen: 100+ leads/día |
| **Humano** | El sistema solo facilita la llamada | Calidad: Leads muy duros |

**Híbrido:** Llama el AI. Si el prospecto pide humano → transfiere.

---

## 🔧 Los Dos Pipelines (Técnico)

El sistema tiene dos formas de "plumbing":

### Pipeline 1: Gemini Live (Simple)
```
Prospecto → [Twilio] → [Gemini Live API]
                           ├─ Escucha (STT)
                           ├─ Entiende (LLM)
                           ├─ Responde (LLM)
                           └─ Habla (TTS)
            [Twilio] ← Resultado
```

**Ventaja:** Simple, todo en un lugar  
**Desventaja:** Menos control sobre la estrategia

### Pipeline 2: ElevenLabs Híbrido (Inteligente)
```
Prospecto → [Twilio] → [ElevenLabs STT]
                           ↓
                      [Estado Actual]
                      ├─ ¿Qué dijo?
                      ├─ ¿Está interesado?
                      ├─ ¿Está molesto?
                      └─ ¿Cuál es el siguiente paso?
                           ↓
                      [State Engine]
                      ├─ Clasifica la intención
                      ├─ Actualiza el estado
                      └─ Da orden al conversador
                           ↓
                      [Gemini Chat]
                      (Convierte orden en palabras)
                           ↓
                      [ElevenLabs TTS]
                      (Convierte palabras en voz)
                           ↓
            [Twilio] ← Respuesta
```

**Ventaja:** Control total, decisiones predecibles, voz mejor  
**Desventaja:** Más puntos de fallo (pero testeo cubre todo)

---

## 📋 Máquina de Estados (Cómo decide)

El Estratega ve la conversación así:

```
┌─────────┐
│ SALUDO  │ "Hola, soy Carlos..."
└────┬────┘
     ↓ (prospecto contesta)
┌─────────────┐
│ DISCOVERY   │ "¿Cuál es tu principal dolor?"
│ (¿Tiene      │
│ problema?)   │ Prospecto: "Clientes que no regresan"
└────┬────────┘ → Estratega marca: "pain_detected = True"
     ↓
┌──────────────────┐
│ SOLUTION_AWARE   │ "Tengo una herramienta que se encarga..."
│ (¿Interesa la    │
│ solución?)       │ Prospecto: "Sí, pero cuánto cuesta?"
└────┬─────────────┘ → Estratega marca: "wants_price = True"
     ↓
┌──────────────────┐
│ QUALIFIED        │ "Con ROI de 40% en 2 meses..."
│ (¿Es decisor?)   │
└────┬─────────────┘ Prospecto: "Vale, ¿cómo lo vemos?"
     ↓
┌─────────┐
│ CLOSING │ "¿Mañana a las 3 o pasado a las 10?"
└────┬────┘
     ↓ (prospecto dice "Mañana a las 3")
┌──────────────┐
│ DEMO         │ ✅ Agendada en Cal.com
│ AGENDADA     │
└──────────────┘
```

**Clave:** No es lineal. El Estratega puede saltar estados o retroceder si detecta una objeción.

---

## 🛠️ Las 7 Herramientas (Tools)

Durante la llamada, la IA puede ejecutar órdenes:

| Tool | Qué hace | Cuándo |
|------|----------|--------|
| **consultar_crm** | Lee histórico del lead | Inicio de llamada |
| **buscar_caso_éxito** | "Una vet como tú, en Guadalajara..." | Cuando hay objeción |
| **calcular_roi** | "Recuperas el costo en 2 meses" | Para cerrar |
| **comparar_competidor** | "A diferencia de Calendly..." | Si mencionan otro software |
| **agendar_demo** | Crea link en Cal.com | Cuando dice que sí |
| **enviar_whatsapp** | Manda confirmación | Post-llamada |
| **transferir_humano** | "Te paso con un especialista" | Si lo pide |

---

## 🎓 Ejemplo de Flujo Completo (Una llamada real)

### Acto 1: Pre-llamada (antes de marcar)

```
BACKEND: "Llama al lead ID 42 (Dr. Martínez, veterinaria, Guadalajara)"
         ↓
AGENTE:  Valida: ¿Horario legal? ✅ (9am-8pm MX)
         ¿Lead en no-llamar? ❌
         ↓
         Twilio marca: +52 555 123 4567
         Mientras suena el teléfono: "Calienta" la sesión
         (conecta con Google, avisa al conversador que esté listo)
```

### Acto 2: Prospecto contesta

```
PROSPECTO: [Contesta]
           ↓
ESTRATEGA: "Acabo de recibir una llamada"
           Estado inicial: stage="saludo"
           ↓
CONVERSADOR: (Recibe orden: "saluda profesional")
             Responde: "Buenos días, Dr. Martínez.
             Soy Carlos de Peluguau. Se que está ocupado,
             le prometo que solo le quito 30 segundos.
             Estoy haciendo un estudio con veterinarias
             en Guadalajara y encontré un dato que me preocupa:
             el 42% de las mascotas que visitan no vuelven
             en los 6 meses. ¿A usted también le pasa?"
             
             [Tiempo: 5350ms desde que marcó]
             [El prospecto lo escucha como si fuera humano]
```

### Acto 3: Prospecto responde

```
PROSPECTO: "Pues sí, tenemos ese problema"
           ↓
ESTRATEGA: Clasifica: intencion="interesado"
                      pain_detected=True
           Actualiza: stage="problem_aware"
           Riesgo: 35% (hay dolor confirmado)
           ↓
CONVERSADOR: (Recibe orden: "cuantifica el dolor")
             Responde: "¿Cuántas mascotas pierde?
             Si me dice 20 por mes, son 240 al año.
             A €150 por cita, son €36.000 en ingresos perdidos."
             
PROSPECTO: "Caramba, sí que es mucho"
           ↓
ESTRATEGA: Clasifica: pain_quantified=True
           Actualiza: stage="solution_aware"
           Riesgo: 20%
           ↓
CONVERSADOR: (Recibe orden: "presenta solución")
             Responde: "Tengo una herramienta automática
             que envía recordatorios por WhatsApp...
             Una veterinaria en Madrid similar a la suya
             aumentó retornos de clientes en 40%..."
```

### Acto 4: Objeción

```
PROSPECTO: "Suena bien, pero cuánto cuesta?"
           ↓
ESTRATEGA: Detecta: nueva_objecion="precio"
           Calcula riesgo_pérdida = 65%
           (El prospecto está ahora escéptico)
           ↓
CONVERSADOR: (Recibe orden: "juega caso éxito antes de hablar precio")
             Responde: "Es una buena pregunta.
             Mira, una clínica en Valencia con 15 mascotas/día
             hacía 8 llamadas de recordatorio manual.
             Ahora las máquinas lo hacen automático.
             Le dije 'pruébalo 2 semanas sin costo'
             y en la primera semana ya había 12 retornos nuevos.
             El ROI lo recuperaba en 10 días.
             ¿Quieres que lo probemos juntos?"

PROSPECTO: "Vale, cómo seria?"
           ↓
ESTRATEGA: Detecta: wants_demo=True
           Actualiza: stage="closing"
           Riesgo: 15% (está cerca del cierre)
           ↓
CONVERSADOR: (Recibe orden: "cierra concreto con fecha")
             Responde: "Perfecto. Te dejo una demo
             mañana a las 3 de la tarde donde vemos
             exactamente cómo se configura.
             ¿Te queda bien?"

PROSPECTO: "Sí, mañana a las 3"
           ↓
ESTRATEGA: Detecta: "agendando"
           Ejecuta TOOL: agendar_demo() → Cal.com
           Resultado: calendar.com/demo/42/...
           ↓
CONVERSADOR: (Recibe orden: "confirma por WhatsApp")
             Responde: "Perfecto, Dr. Martínez.
             Le acabo de enviar el link por WhatsApp.
             Mañana a las 3, ¿le parece?
             ¿Me deja su nombre tal como sale en WhatsApp?"

PROSPECTO: "Perfecto, soy Martín Gómez"
           ↓
ESTRATEGA: Ejecuta TOOL: enviar_whatsapp()
           Mensaje: "Dr. Gómez, le envío el link de la demo..."
           ↓
CONVERSADOR: (Recibe orden: "cierra amable")
             Responde: "Perfecto, Dr. Gómez.
             Nos vemos mañana. Muchas gracias y hasta luego."

[Prospecto cuelga después de ~4 minutos]
```

### Acto 5: Post-llamada (automático)

```
AGENTE:  Guarda en BD:
         ├─ outcome: "demo_agendada" ✅
         ├─ duracion: 4 min 23 seg
         ├─ transcript: [completo en JSON]
         ├─ emocion_final: "interesado"
         ├─ frustration_score: 0 (sin problemas)
         └─ led_estado_nuevo: "INTERESADO"
         ↓
         Notifica BACKEND
         ↓
BACKEND: Actualiza en CRM:
         ├─ Lead: estado = INTERESADO
         ├─ LlamadaReal: crea registro
         └─ Emite Socket.IO al frontend
         ↓
FRONTEND: Muestra:
          ├─ "Demo agendada para mañana a las 3" ✅
          ├─ Transcript completo (para revisar)
          ├─ Duración: 4:23
          └─ Audio para revisar (opcional)
```

---

## 📊 Métricas que se monitorean

Durante cada llamada, el sistema mide:

| Métrica | Qué significa | Alerta si |
|---------|---------------|-----------|
| **Latencia** | Tiempo respuesta | > 700ms |
| **Emoción** | Cómo se siente el lead | "molesto" o "frustrado" |
| **Frustracion** | Score acumulado (0-10) | >= 5 |
| **Interrupciones** | Barge-in detectado | (solo log, no alerta) |
| **Duración** | Minutos de llamada | > 5 min = "muy involucrado" |
| **Progreso** | % hacia demo | 100% = agendada |
| **Riesgo pérdida** | % de que se vaya | >= 70% |

---

## 🚀 Instalación rápida (para técnicos)

### Paso 1: Clonar y setup

```bash
cd llamadas/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Paso 2: Configurar claves

```bash
# .env
GEMINI_API_KEY=tu_clave_google
TWILIO_ACCOUNT_SID=tu_twilio_sid
TWILIO_AUTH_TOKEN=tu_token
ELEVENLABS_API_KEY=tu_elevenlabs  # si usas pipeline hibrido
```

### Paso 3: Elegir pipeline

```bash
# En .env:
VOICE_PIPELINE=gemini      # Simple (default)
# o
VOICE_PIPELINE=elevenlabs  # Inteligente (recomendado)
```

### Paso 4: Iniciar

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### Paso 5: Probar

```bash
# Opción 1: Simulación por texto
curl -X POST http://localhost:8000/simulate/start \
  -H "Content-Type: application/json" \
  -d '{"softwareId": "groomly"}'

# Opción 2: Llamada real (requiere Twilio configurado)
POST http://localhost:8000/outbound
{
  "phone": "+525512345678",
  "softwareId": "groomly",
  "leadId": "abc123"
}
```

---

## 📚 Conceptos clave

### State Engine (El Estratega)

Máquina de estados **probabilística**. No es "estoy en X ahora" sino "tengo 75% de confianza en que estoy en X".

```python
@dataclass
class SalesState:
    stage: str = "saludo"              # Dónde estamos
    confidence: float = 0.85            # Qué tan seguros (0-1)
    next_stages: dict[str, float] = {   # Dónde podría ir
        "closing": 0.40,
        "discovery": 0.35,
        "exit": 0.15
    }
```

### Classifier (El clasificador)

Entiende la intención del prospecto:

```python
@dataclass
class IntentClassification:
    intencion: str          # "interesado", "rechazando", "neutro"
    tags: list[str]         # ["tiene_software", "dolor_alto"]
    confidence: float       # 0.82
    nueva_objecion: str     # "precio", "ya_usamos_otro", etc
    emocion: str            # "interesado", "molesto", "ocupado"
```

### Call Goal (Meta de la llamada)

Evita conversaciones bonitas pero sin resultado:

```python
@dataclass
class CallGoal:
    goal: str = "book_demo"        # Siempre: agendar demo
    progress: float = 65.0          # % avance (0-100)
    risk_of_loss: float = 25.0      # % de perder (0-100)
    turns_without_progress: int = 1 # Turnos sin avance
```

---

## ⚙️ Stack Técnico Completo

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  Next.js 14 (React) → API Cliente                       │
├─────────────────────────────────────────────────────────┤
│                    BACKEND API                          │
│  Express.js → PostgreSQL + Redis                        │
├─────────────────────────────────────────────────────────┤
│                   AGENTE AI (aquí estamos)              │
│  FastAPI (Python 3.11+)                                 │
│  ├─ Google Gemini (Chat + Live API)                     │
│  ├─ ElevenLabs (STT + TTS)                              │
│  ├─ Twilio (Telefonía)                                  │
│  └─ PostgreSQL (Persistencia)                           │
├─────────────────────────────────────────────────────────┤
│                    EXTERNOS                             │
│  Google Cloud (Gemini API)                              │
│  ElevenLabs (Voz)                                       │
│  Twilio (Teléfono)                                      │
│  Cal.com (Agendado)                                     │
│  Slack (Alertas)                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Preguntas frecuentes

### ¿Por qué dos IAs y no solo una?

Porque necesitamos velocidad + precisión. Un LLM grande es preciso pero lento. Un LLM pequeño es rápido pero a veces falla en decisiones. La combinación:
- **Estado Engine** = decisión correcta, ultra-rápida
- **Conversador Flash** = texto natural, rápido

### ¿Qué pasa si el lead no contesta?

```
POST /outbound
↓
Twilio: Marca, espera 45 seg, sin respuesta
↓
Agente: Registra outcome="no_contesta"
↓
Backend: Actualiza lead con "llamada_fallida"
↓
Puedes reintentar después
```

### ¿Se puede guardar la voz del cliente?

Sí. Twilio registra automáticamente. El mp3 se guarda en S3 (configurable) y obtienes una URL.

### ¿Puedo transferir a un humano?

Sí. Si el lead dice "Quiero hablar con alguien", la IA invoca `transferir_humano()` y llama a tu teléfono, luego liga al lead.

```
PROSPECTO: "Necesito más info, ¿puedo hablar con alguien?"
           ↓
AGENTE:    Tool: transferir_humano()
           ↓
TWILIO:    Llama a agente humano (tu teléfono)
           + Lead (simultáneamente)
           ↓
AGENTE:    "Te paso con mi jefe que puede resolver eso"
           ↓
[Se unen las dos llamadas]
```

### ¿Cuánto cuesta por llamada?

| Servicio | Costo estimado |
|----------|---|
| Google Gemini | $0.003 |
| ElevenLabs STT | $0.008 |
| ElevenLabs TTS | $0.004 |
| Twilio (MX) | $0.025 |
| **TOTAL** | **~$0.04/min** |

Una llamada de 4 minutos = ~$0.16  
Si agendan 8% de llamadas y el ticket promedio es €500:  
100 llamadas → 8 demos → ~4 clientes → €2000 = **ROI de 2500%**

---

## 🔍 Debugging rápido

Si algo falla:

```bash
# 1. Ver logs
tail -f ~/.agente/logs/latest.log

# 2. Probar STT
POST /simulate/start
{
  "softwareId": "groomly",
  "mode": "texto"
}

# 3. Revisar metricas
GET /status

# 4. Ver sesión en vivo
WebSocket a ws://localhost:8000/simulate/live

# 5. Restartar servicio
systemctl restart agente-llamadas
```

---

## 🎯 Resumen ejecutivo para Carlos

**El sistema:**
- 📞 Llama leads automáticamente
- 🧠 Toma decisiones (cuándo cerrar, cuándo esperar)
- 🗣️ Habla como humano (~350ms respuesta, indistinguible)
- 🎯 Agenda demos automáticamente
- 📊 Todo registrado y analizable

**Las dos IAs:**
1. **Estratega** (rápida, 1ms) → Decide QUÉ vender
2. **Conversador** (rápida, 200ms) → Habla de forma natural

**Las velocidades:**
- Escucha: 150ms
- Estrategia: <1ms
- Generación: 200ms
- Voz: 75ms
- **Total: 350-425ms** = indistinguible de humano

**La ventaja:**
- Todas las llamadas siguen la misma estrategia
- Cada una suena natural y diferente
- Observable en tiempo real
- Reproducible y predecible

**El costo:**
- ~$0.04/min
- ROI > 2000% si la tasa de conversión es razonable

---

## 📖 Próximos pasos

1. **Entender el código:**
   - `app/conversation/state_engine.py` → El Estratega
   - `app/conversation/classifier.py` → El Clasificador
   - `app/gemini/chat_session.py` → El Conversador

2. **Probar en vivo:**
   - `/dashboard/llamadas/probar-ai` → Simulador con audio
   - `/dashboard/llamadas` → Tab "Practicar" (por texto)

3. **Configurar tu empresa:**
   - Crear `AgentConfig` en `app/modules/tuempresa.py`
   - Personalizar scripts, voces, precios

4. **Lanzar llamadas reales:**
   - POST `/api/llamadas/iniciar-ai`
   - Monitorear en tiempo real
   - Ajustar based en resultados

---

**¿Dudas?** Revisa los logs, prueba el simulador, o pregunta. El sistema es complejo pero cada pieza es simple.

*— Sistema de Llamadas AI v2.0, 2026*
