# Prospect Profile Engine - Diagramas y Visuales

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LLAMADA ENTRANTE (TWILIO)                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │ POST /voice (Twilio Webhook)            │
        │  - Extrae: phone, software_id           │
        │  - Dispara: prewarm_session() (async)   │
        └──────────────┬───────────────────────────┘
                       │ Fire-and-forget
                       ▼
    ┌─────────────────────────────────────────────────┐
    │ PROSPECT PROFILE ENGINE - LOAD                  │
    │                                                  │
    │ 1. Redis.get("prospect:{phone}")               │
    │    ├─ HIT → Retorna en <10ms                   │
    │    └─ MISS → Continua                          │
    │                                                  │
    │ 2. PostgreSQL.query(prospect_profiles)         │
    │    WHERE phone = $1 AND software_id = $2       │
    │    ├─ FOUND → Cache en Redis + retorna         │
    │    └─ NOT FOUND → Crear nuevo perfil          │
    │                                                  │
    │ 3. Resultado: ProspectProfile                  │
    │    {                                            │
    │      temperature: "cold" (0.2),                │
    │      objections: [                             │
    │        {text: "es caro", effectiveness: 0.2}  │
    │      ],                                         │
    │      motivators: [...],                        │
    │      total_calls: 2,                           │
    │      ...                                        │
    │    }                                            │
    └──────────────┬──────────────────────────────────┘
                   │ Guardado en _warm_profiles[call_sid]
                   ▼
        ┌──────────────────────────────────────────┐
        │ WS /media (MediaStream abierto)          │
        │  - Toma perfil de _warm_profiles         │
        │  - Inyecta en ctx.prospect_profile       │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────────────┐
    │ build_system_prompt() + PROFILE INJECTION       │
    │                                                  │
    │ System prompt ahora incluye:                    │
    │ "PROSPECT PROFILE: temperature=cold (0.2)      │
    │  Previous objections (sorted by effectiveness):│
    │   - 'es caro' (price): effectiveness=0.2       │
    │     → Agent responded: 'ROI calc'              │
    │     → SUCCESSFUL response: 'ROI' (60%)         │
    │  Top motivators:                               │
    │   - 'aumentar ventas' (mentioned 2x)           │
    │   - 'no tiene staff' (mentioned 1x)            │
    │  Persona: gatekeeper                           │
    │  Recommended: Use ROI angle, not price list"  │
    └──────────────┬──────────────────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────────────────┐
    │ GeminiChatSession.send_message()                │
    │  (Cada turno del prospect)                      │
    │                                                  │
    │ Prospect: "Es que es muy caro, ¿no?"          │
    │                                                  │
    │ 1. CallAnalyzer.analyze_prospect_turn()        │
    │    ├─ Detecta: intent="objection"              │
    │    ├─ Category: "price"                        │
    │    ├─ Sentiment: -0.6                          │
    │    ├─ Emotion: "frustrated"                    │
    │    ├─ temperature_delta: -0.1                  │
    │    └─ Crea: TurnAnalysis object                │
    │                                                  │
    │ 2. ProspectProfileCache.update_temp_lazy()    │
    │    └─ Redis: temperatura = 0.2 - 0.1 = 0.1   │
    │       (Mark: "dirty" para sync en background) │
    │                                                  │
    │ 3. Guardar en session._turn_analyses[]         │
    │    (Para sincronizar al fin de llamada)        │
    │                                                  │
    │ 4. Generar respuesta (usa perfil)              │
    │    Sistema sugiere: "Usa ROI, no tarifa"       │
    │                                                  │
    │    Agente: "¿Cuántos clientes pierdes/mes?"   │
    │ ────────────────────────────────────────────    │
    │ Prospect: "3-4 al mes"                         │
    │                                                  │
    │ 5. Nuevo análisis:                             │
    │    ├─ Detecta motivator: "aumentar_ventas"    │
    │    ├─ temperature_delta: +0.15                │
    │    ├─ Redis: 0.1 + 0.15 = 0.25               │
    │    └─ Guardar en _turn_analyses[]             │
    │                                                  │
    │ ... (continúa por cada turno)                  │
    └──────────────┬──────────────────────────────────┘
                   │
                   ▼ (Después de varios turnos)
    ┌─────────────────────────────────────────────────┐
    │ Agente: "Demo en 10 minutos?"                   │
    │ Prospect: "Dale, perfecto"                      │
    │                                                  │
    │ Análisis final:                                 │
    │ ├─ intent: "agreement"                         │
    │ ├─ temperature_delta: +0.1                     │
    │ ├─ Redis temp: 0.25 + 0.1 = 0.35             │
    │ └─ Nueva temperatura: WARM (de COLD)          │
    └──────────────┬──────────────────────────────────┘
                   │
                   ▼ (End-of-call)
    ┌─────────────────────────────────────────────────┐
    │ handle_media_stream() - finally block           │
    │  → Dispara: sync_call_profile_updates()         │
    │            (async, fire-and-forget)             │
    └──────────────┬──────────────────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────────────────┐
    │ PROSPECT PROFILE ENGINE - SYNC TO DB            │
    │                                                  │
    │ 1. Guardar call_transcript completo:           │
    │    {                                            │
    │      prospect_id: "profile_123",               │
    │      call_sid: "CA1234567890",                 │
    │      turns: [                                   │
    │        {role: "prospect", text: "Es caro"...}, │
    │        {role: "agent", text: "¿Pierdes..."},   │
    │        ...                                      │
    │      ],                                         │
    │      temperature_before: "cold" (0.2),         │
    │      temperature_after: "warm" (0.35),         │
    │      temperature_change: +0.15,                │
    │      objections_found: ["price"],              │
    │      motivators_detected: ["aumentar_ventas"], │
    │      call_outcome: "demo_scheduled",           │
    │    }                                            │
    │                                                  │
    │ 2. Registrar objeciones en prospect_profiles:  │
    │    INSERT INTO objections (JSONB):             │
    │    {                                            │
    │      id: "obj_abc123",                        │
    │      call_number: 2,                          │
    │      text: "Es que es muy caro, ¿no?",       │
    │      category: "price",                       │
    │      agent_response: "¿Pierdes clientes?",   │
    │      effectiveness: 0.7,  ← Mejoró vs call 1 │
    │      date: "2026-01-22T15:30:00Z"            │
    │    }                                            │
    │                                                  │
    │ 3. Actualizar motivadores:                     │
    │    {                                            │
    │      keyword: "aumentar_ventas",              │
    │      frequency: 3,  ← Aumentó en call 2      │
    │      sentiment: 0.8,                         │
    │      last_mentioned_call: 2,                │
    │      confidence: 0.9                         │
    │    }                                            │
    │                                                  │
    │ 4. UPDATE prospect_profiles:                   │
    │    temperature = 'warm',                       │
    │    temperature_score = 0.35,                   │
    │    total_calls = 2,                           │
    │    last_called_at = NOW()                     │
    │                                                  │
    │ ✅ Perfil actualizado, listo para call 3      │
    └─────────────────────────────────────────────────┘
```

---

## 2. Ciclo de Vida de una Objeción

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA DE OBJECIÓN                         │
└─────────────────────────────────────────────────────────────────────┘

CALL 1 (Primera vez que aparece):
┌──────────────────────────────────────────────┐
│ Prospect: "Es que es muy caro"              │
│ State: DETECTED (nueva)                     │
│ Effectiveness: 0.2 (porque agente usa list) │
└──────────────────────────────────────────────┘
         │
         ▼ Guardar en DB
    {
      "id": "obj_caro_1",
      "call_number": 1,
      "text": "Es que es muy caro",
      "category": "price",
      "agent_response": "€49, €99, €199 options",
      "effectiveness": 0.2,
      "state": "detected",
      "date": "2026-01-15T10:00:00Z"
    }

═════════════════════════════════════════════════════════════════════

CALL 2 (2 semanas después):
┌──────────────────────────────────────────────────────────────────┐
│ Sistema carga histórico:                                         │
│  "Previous 'price' objection: effectiveness=0.2 (FAILED)"       │
│  "What WORKED with price objections: ROI calculation (60%)"     │
│                                                                  │
│ Agente (guiado por perfil):                                     │
│  "¿Cuántos clientes pierdes cada mes que podrías recuperar?"    │
│                                                                  │
│ Prospect: "3-4 al mes, sí..."                                  │
│                                                                  │
│ Agente: "3 × €500 = €1.500. Nuestro plan es €99. Se paga      │
│         en... 1 semana. ¿Te parece interesante?"               │
│                                                                  │
│ Prospect: "Bueno, de verdad... ¿me haces una demo?"           │
│                                                                  │
│ State: RESOLVED (aceptó respuesta)                             │
│ Effectiveness: 0.8 (¡funcionó!)                                │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ Actualizar en DB
    Objection update:
    {
      "id": "obj_caro_1",
      "call_number": 2,  ← Updated
      "text": "Es que es muy caro",
      "category": "price",
      "agent_response": "ROI: 3 × €500 = €1.500; plan €99 = 1 week payback",
      "effectiveness": 0.8,  ← Mejoró de 0.2
      "state": "resolved",   ← Resuelto
      "date": "2026-01-22T14:30:00Z"
    }

═════════════════════════════════════════════════════════════════════

ANALYTICS (después de 10+ llamadas):
┌──────────────────────────────────────────────────────────────────┐
│ SELECT objection_category, AVG(effectiveness) FROM ...           │
│                                                                  │
│ Category    │ Effectiveness │ Attempts │ Best Strategy          │
│─────────────┼───────────────┼──────────┼─────────────────────   │
│ price       │ 0.65          │ 15       │ ROI calculation        │
│ timing      │ 0.55          │ 8        │ Timeline explanation   │
│ competitor  │ 0.42          │ 12       │ Feature diff           │
│ trust       │ 0.71          │ 6        │ Social proof           │
│ need        │ 0.38          │ 9        │ Needs analysis         │
│                                                                  │
│ → ROI es la estrategia más efectiva para "price"                │
│ → Usar esto en todos los futuros prospects con objeción "price" │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Estados de Temperatura

```
┌────────────────────────────────────────────────────────────────────┐
│              PROSPECT TEMPERATURE PROGRESSION                       │
└────────────────────────────────────────────────────────────────────┘

Score: 0.0 ──────────────► 0.25 ──────────────► 0.5 ──────────────► 1.0

DEAD                    COLD                  WARM                 HOT
(0.0-0.15)           (0.15-0.45)          (0.45-0.75)          (0.75-1.0)

├─ "No me interesa"   ├─ "Cuéntame más"  ├─ "Me interesa"      ├─ "¿Cuándo puedo empezar?"
├─ Colgó llamada      ├─ Hizo preguntas  ├─ Pidió demo         ├─ Pidió contrato
├─ Explícito rechazo  ├─ Primera llamada ├─ Segunda+ llamada   ├─ Cerrado
└─ No responde SMS    ├─ "Déjame pensarlo" ├─ "¿Puedo probar?" └─ VIP prospect

═════════════════════════════════════════════════════════════════════

CALL 1: COLD (0.2)
        Prospect duda, no sabe si necesita
        ├─ Objeción "precio": -0.1 → 0.1
        ├─ Motivador "ventas": +0.15 → 0.25
        └─ Temperature = COLD (steady at 0.25)

CALL 2: COLD → WARM (0.35)
        Prospect interesado en demo
        ├─ Acuerdo a demo: +0.1 → 0.35
        ├─ Multiple motivators: "ventas" + "eficiencia": +0.2 → 0.55
        └─ Temperature = WARM (0.35)

CALL 3: WARM → HOT (0.78)
        Prospect viendo demo, preguntas técnicas
        ├─ Questions asked (5+): +0.15 → 0.70
        ├─ "¿Cómo es el onboarding?": +0.1 → 0.80
        └─ Temperature = HOT (ready to close)

CALL 4: HOT → SCHEDULED / CLOSED (1.0)
        ├─ "Bueno, hace me un contrato": CLOSED
        └─ Temperature = SCHEDULED or CLOSED
```

---

## 4. Integración en Gemini Prompt

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SYSTEM PROMPT ANATOMY                             │
└─────────────────────────────────────────────────────────────────────┘

[BASE PROMPT - Same for all prospects]
┌──────────────────────────────────────────────────────────────────┐
│ Eres un agente de ventas para [business_name].                   │
│ Tu objetivo: Descubrir necesidad → generar interés → cerrar demo │
│ Tono: Profesional, empático, rápido.                             │
│                                                                   │
│ Etapas:                                                          │
│ 1. Rapport: Saludar, nombre                                      │
│ 2. Discovery: "¿Cuál es el principal dolor?"                     │
│ 3. Pitch: "Aquí es donde entramos nosotros..."                   │
│ 4. Objeción: Direccionar a estrategia probada                    │
│ 5. Cierre: "¿Te hago una demo?"                                  │
└──────────────────────────────────────────────────────────────────┘

[DYNAMIC SECTION - ← Inyectado desde Prospect Profile]
┌──────────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════════ │
│ PROSPECT PROFILE (Call #2 for +52-555-XXXXXXX)                  │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                  │
│ TEMPERATURE: COLD (0.25) ← Aún no decidido                      │
│ Interest Level: 2/5                                             │
│ Estimated Budget: €200-500/mes (not confirmed)                  │
│                                                                  │
│ CALL HISTORY:                                                   │
│ Call 1 (15 Jan): First contact, seemed interested, no close    │
│ Call 2 (Today): Second attempt                                  │
│                                                                  │
│ PREVIOUS OBJECTIONS (sorted by agent effectiveness):           │
│ 1. "Es muy caro" (price objection)                             │
│    ├─ What FAILED (0.2 effectiveness): "We have 3 plans..."    │
│    ├─ What WORKED (0.6+ effectiveness): ROI calculation        │
│    │  Example: "3 lost clients × €500 = €1.5k/month lost.      │
│    │           Our plan: €99. Pays for itself in 1 week."      │
│    └─ Persona insight: This prospect is gatekeeper (needs      │
│        numbers, not features)                                   │
│                                                                  │
│ TOP MOTIVATORS (what they care about):                         │
│ • "Aumentar ventas" (mentioned in call 1, 2)                  │
│ • "No tiene staff" (mentioned in discovery)                   │
│ • "Competencia está adelante" (implied tension)               │
│                                                                  │
│ PERSONA: Gatekeeper (decides by ROI, not features)            │
│                                                                  │
│ STRATEGY FOR THIS CALL:                                         │
│ ✓ Lead with ROI/payback angle, NOT tariffs                     │
│ ✓ Mention: automation saves time (no staff hiring needed)      │
│ ✓ If price objection surfaces again: use ROI example above     │
│ ✗ Avoid: Feature deep-dives (not their language)               │
│ ✗ Avoid: Long explanations (gatekeeper needs quick wins)       │
│                                                                  │
│ ═══════════════════════════════════════════════════════════════ │
└──────────────────────────────────────────────────────────────────┘

[SPECH PROMPT - If configured by software_id]
┌──────────────────────────────────────────────────────────────────┐
│ [Custom brief from CRM admin for this software]                  │
│ "Focus on: appointments recovery, SMS reminders, follow-up"      │
└──────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════

RESULT: Gemini receives EVERYTHING it needs to make smart decisions:

Gemini (internals):
  - "temperature=0.25 means: NOT YET WARM"
  - "Lead with ROI, not features"
  - "If says 'caro': use THIS response (has 60% success)"
  - "Persona=gatekeeper: keep it short, numbers only"
  → Generate response calibrated for THIS prospect
```

---

## 5. Database Schema (Simplified)

```
PROSPECT_PROFILES table
┌──────────────────────────────────────────────────────────────┐
│ id (UUID)           │ unique profile ID                      │
├─ software_id       │ tenant ID (multi-tenant)              │
├─ phone             │ +52-555-XXXXXXX (unique key)          │
├─ lead_id           │ link to legacy leads table             │
│                                                             │
├─ temperature       │ 'cold' | 'warm' | 'hot' | 'dead'      │
├─ temperature_score │ 0.0 - 1.0 (actual value)             │
├─ interest_level    │ 1-5 (subjective score)               │
│                                                             │
├─ estimated_budget_min  │ €200 (nullable)                  │
├─ estimated_budget_max  │ €500 (nullable)                  │
├─ budget_confirmed      │ TRUE/FALSE (did they say exact?)│
│                                                             │
├─ family_status     │ 'married' | 'single' (nullable)      │
├─ children_count    │ 2 (nullable)                         │
├─ years_in_business │ 5 (nullable)                         │
├─ business_stage    │ 'startup' | 'growth' | 'mature'      │
│                                                             │
├─ objections        │ JSONB: [                             │
│                    │   {id, call_num, text, category,    │
│                    │    agent_response, effectiveness}    │
│                    │ ]                                    │
│                                                             │
├─ motivators        │ JSONB: [                             │
│                    │   {keyword, frequency, sentiment,    │
│                    │    last_call, confidence}            │
│                    │ ]                                    │
│                                                             │
├─ persona_type      │ 'decision_maker' | 'gatekeeper'     │
├─ persona_confidence│ 0.8 (how sure are we?)              │
│                                                             │
├─ total_calls       │ 2 (how many times contacted)        │
├─ last_called_at    │ TIMESTAMP                           │
├─ created_at        │ TIMESTAMP                           │
├─ last_update_at    │ TIMESTAMP                           │
│                                                             │
├─ gdpr_consent      │ TRUE/FALSE (can we call?)            │
├─ gdpr_consent_date │ TIMESTAMP (when did they consent?)   │
└─ data_deletion_requested_at │ TIMESTAMP (if GDPR delete)  │
└──────────────────────────────────────────────────────────────┘

CALL_TRANSCRIPTS table
┌──────────────────────────────────────────────────────────────┐
│ id (UUID)           │ unique call record ID                │
├─ prospect_id (FK)  │ link to prospect_profiles            │
├─ call_sid          │ Twilio call ID                       │
│                                                             │
├─ started_at        │ TIMESTAMP                           │
├─ ended_at          │ TIMESTAMP                           │
├─ duration_seconds  │ 240 (call length)                   │
├─ call_number       │ 1, 2, 3, ... (which call is this?)  │
│                                                             │
├─ turns             │ JSONB: [                             │
│                    │   {                                  │
│                    │     "turn_number": 1,               │
│                    │     "role": "agent" | "prospect",   │
│                    │     "text": "Hola, cómo estás?",    │
│                    │     "timestamp": "2026-01-22T...",   │
│                    │     "intent": "greeting",            │
│                    │     "sentiment": 0.5,               │
│                    │     "emotion": "happy"              │
│                    │   },                                │
│                    │   ...                               │
│                    │ ]                                   │
│                                                             │
├─ temperature_before│ 'cold' (at start of call)           │
├─ temperature_after │ 'warm' (at end of call)             │
├─ temperature_change│ +0.15 (delta)                       │
│                                                             │
├─ objections_found  │ JSONB: ['price', 'timing']          │
├─ objections_handled_count │ 2 (how many resolved?)      │
│                                                             │
├─ motivators_detected │ JSONB: ['aumentar_ventas', ...]   │
│                                                             │
├─ agent_notes       │ TEXT (notes from agent)             │
├─ call_outcome      │ 'completed' | 'demo_scheduled' |    │
│                    │ 'hungup' | 'transferred'            │
│                                                             │
├─ sentiment_trend   │ JSONB: {                             │
│                    │   "prospect_avg": 0.2,              │
│                    │   "agent_avg": 0.8                  │
│                    │ }                                   │
│                                                             │
├─ coherence_score   │ 0.85 (1.0 = perfect logic flow)    │
└─ objection_handling_score │ 0.7 (0-1 scale)             │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Temperature Score Evolution Over Calls

```
Prospect: +52-555-1234567
Software: dental_clinic_soft

═══════════════════════════════════════════════════════════════════

Call 1 (15-Jan-2026, 10:00 AM)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ Prospect: "Cuéntame más"                                   │
│ Agent: Pitch básico                                        │
│ Prospect: "Es muy caro"          → temp_delta: -0.1       │
│ Agent: "Tenemos 3 planes"        → (ineffective)          │
│ Prospect: "Déjame pensarlo"      → temp_delta: -0.1       │
│                                                             │
│ FINAL TEMPERATURE:                                         │
│ Start: 0.0 (new prospect)                                  │
│ Deltas: -0.1 -0.1                                          │
│ End: 0.2 (COLD)                                           │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

Call 2 (22-Jan-2026, 2:30 PM) [7 days later]
┌─────────────────────────────────────────────────────────────┐
│ System loads profile:                                       │
│ "Previous call: COLD (0.2)                                 │
│  'price' objection: effectiveness=0.2 (FAILED)            │
│  'ROI' strategy: effectiveness=0.6+ (WORKED)"            │
│                                                             │
│ Prospect: "Es que sigue siendo caro"   → temp_delta: -0.05│
│ Agent: "¿Cuántos clientes pierdes/mes?" (ROI approach)   │
│ Prospect: "3-4 al mes"                 → temp_delta: +0.15│
│ Agent: "3×€500=€1.5k, nuestro plan=€99" (ROI calculation)│
│ Prospect: "Ah, de verdad"              → temp_delta: +0.10│
│ Agent: "¿Demo en 10 min?"                                 │
│ Prospect: "Bueno, dale"                → temp_delta: +0.15│
│                                                             │
│ FINAL TEMPERATURE:                                         │
│ Start: 0.2 (from previous call)                            │
│ Deltas: -0.05 +0.15 +0.10 +0.15 = +0.35                 │
│ End: 0.55 (WARM) ← UPGRADE!                              │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

Call 3 (25-Jan-2026, 10:00 AM) [3 days later]
┌─────────────────────────────────────────────────────────────┐
│ System loads profile:                                       │
│ "Previous call: WARM (0.55)                               │
│  Demo scheduled: expected today                            │
│  Motivators: ventas (2x), eficiencia (1x)                │
│  Persona: gatekeeper"                                      │
│                                                             │
│ Prospect: "Mostraste todo?"             → temp_delta: +0.10│
│ Agent: "¿Preguntas técnicas?"            (Deep engagement)│
│ Prospect: "¿Cómo es el onboarding?"     → temp_delta: +0.15│
│ Agent: "3 días, te asignamos account mgr"                │
│ Prospect: "¿Hay soporte en español?"    → temp_delta: +0.10│
│ Agent: "SÍ, chat 24/7, teléfono..."                      │
│ Prospect: "OK, hazme contrato"          → temp_delta: +0.15│
│                                                             │
│ FINAL TEMPERATURE:                                         │
│ Start: 0.55 (from previous call)                           │
│ Deltas: +0.10 +0.15 +0.10 +0.15 = +0.50                 │
│ End: 1.0 (HOT → CLOSED)                                  │
│                                                             │
│ ✅ DEAL CLOSED in 3 calls (vs. avg 5+ without engine)    │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

VISUALIZATION: Temperature progression

1.0 │
    │                              ╱─ CLOSED
0.9 │                            ╱
0.8 │                          ╱
0.7 │                        ╱ (HOT)
0.6 │                      ╱
0.5 │                    ╱─ WARM (Demo scheduled)
0.4 │                  ╱
0.3 │               ╱
0.2 │─────────────╱ (COLD)
0.1 │         ╱
0.0 │───────┴─────────────────────────────
    └──────────────────────────────────────
      Call 1    Call 2      Call 3    (days)
     (Day 1)   (Day 8)     (Day 11)
```

---

## 7. Fallback Chain (Si falla base de datos)

```
┌─────────────────────────────────────┐
│ Load prospect profile request       │
│ (phone: "+52-555-1234567")          │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ TIER 1: Redis Cache (<10ms)  │
    │ Key: prospect:{phone}        │
    │                              │
    │ redis.get() → Found?         │
    └──────────────┬───────────────┘
         │                  │
        YES                 NO
         │                  │
         ▼                  ▼
    ┌───────────┐  ┌────────────────────────┐
    │ RETURN    │  │ TIER 2: PostgreSQL     │
    │ (< 10ms)  │  │ (<100ms, if responsive)│
    │           │  │                        │
    │ 🎯        │  │ Query: SELECT * FROM   │
    │           │  │ prospect_profiles      │
    │           │  │ WHERE phone = $1       │
    └───────────┘  └────────────┬───────────┘
                        │
                   ┌────┴────┐
                  YES        NO
                   │         │
                   ▼         ▼
              ┌────────┐  ┌─────────────────────┐
              │ CACHE  │  │ TIER 3: Fallback    │
              │ result │  │ Minimal Profile     │
              │        │  │                     │
              │ Return │  │ ProspectProfile(    │
              │        │  │   phone="+52...",   │
              └────────┘  │   temp="cold",      │
                          │   score=0.0,        │
                          │   calls=0,          │
                          │   ...               │
                          │ )                   │
                          │                     │
                          │ (No history, but    │
                          │  call continues)    │
                          │                     │
                          └─────────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │ Use minimal     │
                          │ profile anyway  │
                          │ (temp=COLD)     │
                          │                 │
                          │ After call:     │
                          │ Retry sync to DB│
                          └─────────────────┘

LATENCY TARGETS:
├─ Redis hit: < 10ms (ideal)
├─ PostgreSQL: < 100ms (acceptable)
├─ Fallback: < 1ms (instant)
└─ TOTAL: < 150ms P95 (not blocking call)
```

