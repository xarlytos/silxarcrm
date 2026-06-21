# 📋 PLAN DE IMPLEMENTACIÓN EXHAUSTIVO (4 MESES)
## Sistema de Llamadas AI + Prospect Memory + Coaching + Multicanal

**Para**: Carlos Zamudio + Team  
**Fecha**: 2026-06-21  
**Status**: 🟢 Blueprint Final Realista  
**Alcance**: 4 fases, 16 semanas, ~320 horas dev + testing

---

## ✅ EXECUTIVE SUMMARY

### Objetivo Principal
Transformar sistema de llamadas independientes → **Llamadas inteligentes con memoria, coaching automático y alcance multicanal**.

### Resultado Esperado
```
HOY:         1,000 llamadas/mes × 40% cierre = 400 leads/mes
             Costo: $37.50/lead

DESPUÉS:     1,000 llamadas/mes × 55-60% cierre = 550-600 leads/mes
             Costo: $30-32/lead
             +150 leads adicionales/mes = +$45k/mes = +$540k/año
             
TIMELINE:    4 meses (16 semanas)
INVERSIÓN:   ~$48k dev + $15k/mes ops = $108k directo
ROI:         5x en año 1 (conservador)
```

### Riesgos Asumidos
- ✅ Escala rápida = degradación de calidad (-10-15%)
- ✅ Integración multicanal puede tomar más tiempo
- ✅ ML models necesitan 30+ días de datos para ser útiles
- ✅ Compliance/GDPR requiere auditoría

---

---

# FASE 1: PROSPECT PROFILE ENGINE (SEMANAS 1-4)

## Objetivo
Crear "memoria" entre llamadas. Llamada 2 sabe qué pasó en Llamada 1.

## 1.1 DATABASE SCHEMA

### Tabla Principal: `prospect_profiles`

```sql
CREATE TABLE prospect_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  lead_id UUID,
  
  -- CORE PROFILE DATA
  name TEXT,
  company TEXT,
  industry TEXT,  -- 'veterinaria', 'gym', 'spa', 'dental', 'other'
  company_size TEXT,  -- 'solo', '1-5', '6-20', '20+'
  
  -- ENGAGEMENT STATE
  temperature TEXT DEFAULT 'cold',  -- cold, warm, hot, dead, booked
  temperature_score FLOAT DEFAULT 0.0,  -- 0.0-1.0
  interest_level INT DEFAULT 1,  -- 1-5
  last_called_at TIMESTAMP,
  total_calls INT DEFAULT 0,
  
  -- BUDGET (SI MENCIONADO EXPLÍCITAMENTE)
  stated_budget_min DECIMAL(12,2),      -- NULL si no lo dijo
  stated_budget_max DECIMAL(12,2),
  budget_currency TEXT DEFAULT 'MXN',
  budget_confidence FLOAT DEFAULT 0.0,  -- Qué tan seguro estamos
  
  -- OBJECIONES HISTÓRICAS (JSONB)
  objections JSONB DEFAULT '[]'::jsonb,
  -- [{
  --   "call_number": 1,
  --   "text": "es muy caro",
  --   "category": "price",
  --   "handler_used": "mostrar ROI",
  --   "effectiveness": 0.6,  -- 0=didn't work, 1=closed
  --   "date": "2026-01-15T10:30:00Z"
  -- }]
  
  -- MOTIVADORES DETECTADOS (JSONB)
  motivators JSONB DEFAULT '[]'::jsonb,
  -- [{
  --   "keyword": "aumentar ventas",
  --   "frequency": 2,
  --   "sentiment": 0.8,
  --   "confidence": 0.85,
  --   "source_calls": [1, 3]
  -- }]
  
  -- PATRÓN DE RESPUESTAS (JSONB)
  interaction_patterns JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "avg_response_time_ms": 1200,
  --   "interrupts_count": 2,
  --   "questions_asked": 5,
  --   "best_time_to_call": "afternoon",
  --   "language_preference": "es"
  -- }
  
  -- DECISION MAKER INFO
  is_decision_maker BOOLEAN DEFAULT FALSE,
  decision_maker_confidence FLOAT DEFAULT 0.0,
  
  -- TIMESTAMPS
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_profile_update_at TIMESTAMP,
  
  UNIQUE(software_id, phone),
  CONSTRAINT phone_format CHECK (phone ~ '^\+[0-9]{10,15}$')
);

CREATE INDEX idx_profiles_software_temperature 
  ON prospect_profiles(software_id, temperature);
CREATE INDEX idx_profiles_last_called 
  ON prospect_profiles(software_id, last_called_at DESC);
```

### Tabla Auxiliar: `call_turns` (Historial detallado)

```sql
CREATE TABLE call_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id),
  call_sid TEXT NOT NULL,
  
  -- METADATA
  call_number INT,  -- 1st, 2nd call
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INT,
  
  -- CONTENIDO (array de turnos)
  turns JSONB NOT NULL,
  -- [{
  --   "turn": 1,
  --   "role": "agent" | "prospect",
  --   "text": "...",
  --   "timestamp": "2026-01-20T10:00:05Z",
  --   "intent": "greeting",
  --   "entities": {"product": "software", "pain_point": "citas"}
  -- }]
  
  -- ANÁLISIS POST-CALL
  analysis JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "sentiment": 0.6,
  --   "objections_count": 2,
  --   "questions_asked": 4,
  --   "outcome": "soft_no",
  --   "confidence_level": 0.75
  -- }
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_call_turns_prospect 
  ON call_turns(prospect_id, started_at DESC);
```

---

## 1.2 API ENDPOINTS (Backend FastAPI)

### Endpoint 1: `POST /api/v1/prospects/profile`
**Objetivo**: Cargar perfil ANTES de iniciar llamada 2

```python
# Request
{
  "phone": "+52-1234567890",
  "software_id": "uuid-xxx"
}

# Response (Llamada 2 recibe esto)
{
  "prospect": {
    "name": "Juan García",
    "company": "Clínica García",
    "industry": "dental",
    "company_size": "1-5",
    "phone": "+52-1234567890"
  },
  "engagement": {
    "temperature": "warm",
    "interest_level": 3,
    "last_called_at": "2026-01-15T10:30:00Z",
    "total_calls": 1
  },
  "history": {
    "stated_budget_min": 2000,
    "stated_budget_max": 5000,
    "budget_confidence": 0.7,
    "objections": [
      {
        "text": "es muy caro",
        "category": "price",
        "handler_used": "ROI calc",
        "effectiveness": 0.4
      }
    ],
    "motivators": [
      {
        "keyword": "aumentar pacientes",
        "frequency": 2,
        "sentiment": 0.85
      }
    ]
  },
  "interaction": {
    "avg_response_time_ms": 1200,
    "best_time_to_call": "afternoon",
    "language_preference": "es"
  }
}
```

**Implementación** (app/crm/prospect_service.py):
```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import ProspectProfile
from sqlalchemy import select

class ProspectService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_profile(self, phone: str, software_id: str) -> dict:
        """Cargar perfil de prospect (NULL si no existe)"""
        stmt = select(ProspectProfile).where(
            (ProspectProfile.phone == phone) &
            (ProspectProfile.software_id == software_id)
        )
        profile = await self.db.execute(stmt)
        row = profile.scalar_one_or_none()
        
        if not row:
            return {"status": "new", "phone": phone}
        
        return {
            "status": "returning",
            "prospect": row.to_dict(),
            "engagement": {
                "temperature": row.temperature,
                "interest_level": row.interest_level,
                "last_called_at": row.last_called_at,
                "total_calls": row.total_calls
            },
            "history": {
                "budget": {
                    "min": float(row.stated_budget_min) if row.stated_budget_min else None,
                    "max": float(row.stated_budget_max) if row.stated_budget_max else None,
                    "confidence": row.budget_confidence
                },
                "objections": row.objections or [],
                "motivators": row.motivators or []
            },
            "interaction": row.interaction_patterns or {}
        }
```

### Endpoint 2: `POST /api/v1/prospects/update-after-call`
**Objetivo**: Guardar datos extraídos DESPUÉS de cada llamada

```python
# Request (Enviado por agente de voz después de colgar)
{
  "phone": "+52-1234567890",
  "software_id": "uuid-xxx",
  "call_sid": "twilio-sid-xxx",
  "call_number": 1,
  "duration_seconds": 340,
  
  "profile_updates": {
    "temperature_delta": 0.15,  # Cambio en score
    "new_interest_level": 3,     # De 1 a 3
    "stated_budget": {
      "min": 2000,
      "max": 5000,
      "confidence": 0.7,
      "source": "explicit_mention"
    },
    "is_decision_maker": true,
    "decision_maker_confidence": 0.85
  },
  
  "interaction_data": {
    "objections": [
      {
        "text": "es muy caro",
        "category": "price",
        "sentiment": -0.6
      }
    ],
    "motivators": [
      {
        "keyword": "aumentar pacientes",
        "frequency": 1,
        "sentiment": 0.8
      }
    ]
  },
  
  "call_data": {
    "turns": [
      {"role": "agent", "text": "Hola..."},
      {"role": "prospect", "text": "Hola, ¿quién es?"},
      ...
    ],
    "analysis": {
      "sentiment": 0.6,
      "outcome": "soft_no"
    }
  }
}

# Response
{
  "status": "success",
  "prospect_id": "uuid-xxx",
  "profile": {
    "temperature": "warm",
    "interest_level": 3,
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

**Implementación** (app/crm/prospect_service.py):
```python
async def update_profile_after_call(
    self,
    phone: str,
    software_id: str,
    profile_updates: dict,
    interaction_data: dict,
    call_data: dict
) -> dict:
    """Actualizar perfil después de llamada"""
    
    # 1. Get or create prospect
    stmt = select(ProspectProfile).where(
        (ProspectProfile.phone == phone) &
        (ProspectProfile.software_id == software_id)
    )
    prospect = await self.db.execute(stmt)
    row = prospect.scalar_one_or_none()
    
    if not row:
        # CREATE nuevo prospect
        row = ProspectProfile(
            phone=phone,
            software_id=software_id,
            temperature="cold",
            temperature_score=0.0,
            interest_level=1,
            total_calls=1
        )
        self.db.add(row)
    else:
        # UPDATE existente
        row.total_calls += 1
        row.last_called_at = datetime.utcnow()
    
    # 2. Update temperature
    if "temperature_delta" in profile_updates:
        new_score = min(1.0, row.temperature_score + profile_updates["temperature_delta"])
        row.temperature_score = new_score
        # Map score to temperature
        if new_score >= 0.7:
            row.temperature = "hot"
        elif new_score >= 0.4:
            row.temperature = "warm"
        else:
            row.temperature = "cold"
    
    # 3. Update budget (SOLO si mencionado explícitamente)
    if "stated_budget" in profile_updates and profile_updates["stated_budget"]["source"] == "explicit_mention":
        row.stated_budget_min = profile_updates["stated_budget"]["min"]
        row.stated_budget_max = profile_updates["stated_budget"]["max"]
        row.budget_confidence = profile_updates["stated_budget"]["confidence"]
    
    # 4. Update decision maker
    if "is_decision_maker" in profile_updates:
        row.is_decision_maker = profile_updates["is_decision_maker"]
        row.decision_maker_confidence = profile_updates.get("decision_maker_confidence", 0.0)
    
    # 5. Append objections (guardar todo, no reemplazar)
    existing_objections = row.objections or []
    if interaction_data.get("objections"):
        for obj in interaction_data["objections"]:
            obj["call_number"] = row.total_calls
            obj["date"] = datetime.utcnow().isoformat()
            existing_objections.append(obj)
    row.objections = existing_objections
    
    # 6. Update motivators
    existing_motivators = row.motivators or []
    if interaction_data.get("motivators"):
        for mot in interaction_data["motivators"]:
            # Merge or append
            existing_motivators.append(mot)
    row.motivators = existing_motivators
    
    # 7. Save call transcript
    call_turns = CallTurns(
        software_id=software_id,
        prospect_id=row.id,
        call_sid=call_data.get("call_sid", "unknown"),
        call_number=row.total_calls,
        turns=call_data.get("turns", []),
        analysis=call_data.get("analysis", {})
    )
    self.db.add(call_turns)
    
    # 8. Commit
    await self.db.commit()
    
    return {
        "status": "success",
        "prospect_id": str(row.id),
        "profile": row.to_dict()
    }
```

---

## 1.3 INTEGRACIÓN CON AGENTE DE VOZ

### Paso 1: Cargar perfil ANTES de iniciar llamada

**Archivo**: `app/conversation/master_llm.py` (existente, modificar)

```python
class MasterLLM:
    async def prepare_call(self, phone: str, software_id: str) -> dict:
        """Pre-call: Cargar perfil del prospect"""
        
        # 1. Obtener profile existente
        from app.crm.prospect_service import ProspectService
        service = ProspectService(db=self.db)
        profile = await service.get_profile(phone, software_id)
        
        # 2. Si es llamada 2+, inyectar en prompt
        if profile["status"] == "returning":
            context = self._build_context_from_profile(profile)
            # Este context se inyecta en el prompt del Maestro
            return context
        else:
            # Llamada 1: usar context default
            return {"status": "new", "context": ""}
    
    def _build_context_from_profile(self, profile: dict) -> dict:
        """Construir contexto para LLM usando perfil"""
        
        context_text = f"""
        PROSPECT CONTEXT (from call history):
        =====================================
        Name: {profile['prospect']['name']}
        Company: {profile['prospect']['company']}
        Industry: {profile['prospect']['industry']}
        
        PREVIOUS ENGAGEMENT:
        - Calls: {profile['engagement']['total_calls']}
        - Temperature: {profile['engagement']['temperature']}
        - Interest Level: {profile['engagement']['interest_level']}/5
        - Last called: {profile['engagement']['last_called_at']}
        
        BUDGET (if stated):
        - Min: ${profile['history']['stated_budget_min']}
        - Max: ${profile['history']['stated_budget_max']}
        - Confidence: {profile['history']['budget_confidence']*100:.0f}%
        
        PREVIOUS OBJECTIONS:
        {self._format_objections(profile['history']['objections'])}
        
        MOTIVATORS:
        {self._format_motivators(profile['history']['motivators'])}
        
        USE THIS CONTEXT TO:
        1. Reference previous conversations (builds trust)
        2. Avoid repeating objections that didn't work
        3. Focus on stated motivators
        4. Acknowledge budget constraints
        """
        
        return {
            "status": "returning",
            "context": context_text,
            "prospect_id": profile['prospect'].get('id'),
            "temperature": profile['engagement']['temperature'],
            "interest_level": profile['engagement']['interest_level']
        }
```

### Paso 2: Extraer datos DESPUÉS de llamada

**Archivo**: `app/post_call/extraction_engine.py` (NUEVO)

```python
class PostCallExtractionEngine:
    """Extraer datos relevantes del transcript para actualizar perfil"""
    
    def __init__(self, gemini_client):
        self.gemini = gemini_client
    
    async def extract_profile_data(
        self,
        transcript: list,  # [{role, text, timestamp, ...}]
        existing_profile: dict = None
    ) -> dict:
        """Usar Gemini para extraer datos estruturados del transcript"""
        
        prompt = f"""
        Analizar el transcript de llamada y extraer datos estructurados.
        
        IMPORTANT: Solo extraer datos EXPLÍCITAMENTE MENCIONADOS por el prospect.
        NO inventar probabilidades, NO inferir sin base.
        
        Transcript:
        {self._format_transcript(transcript)}
        
        EXTRAER:
        1. Temperature (cold/warm/hot/dead/booked)
        2. Budget (solo si fue mencionado explícitamente): min, max, confidence
        3. Objections encontradas (con categoría)
        4. Motivators principales mencionados
        5. ¿Es decision maker? (solo si confirmó)
        6. Sentiment general (-1 a +1)
        7. Outcome (soft_no, hard_no, interested, demo_booked, transfer)
        
        Retornar JSON estructurado:
        {{
            "temperature": "warm",
            "temperature_confidence": 0.85,
            "budget": {{
                "min": 2000,
                "max": 5000,
                "confidence": 0.7,
                "source": "explicit_mention"
            }},
            "objections": [
                {{
                    "text": "es muy caro",
                    "category": "price",
                    "sentiment": -0.6,
                    "agent_response": "mostrar ROI"
                }}
            ],
            "motivators": [
                {{
                    "text": "aumentar pacientes",
                    "frequency": 2,
                    "sentiment": 0.8
                }}
            ],
            "is_decision_maker": true,
            "decision_maker_confidence": 0.85,
            "sentiment": 0.6,
            "outcome": "soft_no",
            "reasoning": "Explained budget constraints but interested"
        }}
        """
        
        # Usar Gemini para extracción
        response = await self.gemini.generate_content(prompt)
        
        # Parse JSON response
        import json
        extracted = json.loads(response.text)
        
        return extracted
    
    def _format_transcript(self, turns: list) -> str:
        """Formatear transcript para LLM"""
        formatted = []
        for turn in turns:
            formatted.append(f"{turn['role'].upper()}: {turn['text']}")
        return "\n".join(formatted)
```

**Uso** (después de cada llamada):
```python
# En app/main.py o endpoint de callback
async def on_call_ended(call_data: dict):
    """Ejecutar después de que termina llamada"""
    
    phone = call_data["phone"]
    transcript = call_data["transcript"]
    software_id = call_data["software_id"]
    
    # 1. Extraer datos del transcript
    engine = PostCallExtractionEngine(gemini_client)
    extracted_data = await engine.extract_profile_data(transcript)
    
    # 2. Obtener perfil existente
    service = ProspectService(db)
    existing_profile = await service.get_profile(phone, software_id)
    
    # 3. Actualizar perfil
    update_payload = {
        "profile_updates": {
            "temperature_delta": extracted_data["temperature_confidence"] * 0.2,
            "new_interest_level": map_temperature_to_interest(extracted_data["temperature"]),
            "stated_budget": extracted_data["budget"],
            "is_decision_maker": extracted_data["is_decision_maker"],
            "decision_maker_confidence": extracted_data["decision_maker_confidence"]
        },
        "interaction_data": {
            "objections": extracted_data["objections"],
            "motivators": extracted_data["motivators"]
        },
        "call_data": {
            "call_sid": call_data["call_sid"],
            "turns": call_data["turns"],
            "analysis": {
                "sentiment": extracted_data["sentiment"],
                "outcome": extracted_data["outcome"]
            }
        }
    }
    
    result = await service.update_profile_after_call(
        phone=phone,
        software_id=software_id,
        **update_payload
    )
    
    return result
```

---

## 1.4 EFFORT & TIMELINE

| Task | Hours | Days | Dependencies |
|------|-------|------|--------------|
| Database schema + migrations | 12 | 2 | None |
| ProspectService (backend) | 16 | 2 | ✅ Schema |
| API endpoints (GET/POST) | 12 | 2 | ✅ Service |
| PostCallExtractionEngine | 16 | 2 | ✅ Gemini client |
| Integration with MasterLLM | 8 | 1 | ✅ All above |
| Testing + edge cases | 12 | 2 | ✅ All above |
| **TOTAL FASE 1** | **76 horas** | **~11 días** | - |

**Picos de complejidad**:
- Extraction engine (data accuracy critical)
- Memory consistency entre calls
- Edge cases: multiple calls same day, missing data

---

## 1.5 SUCCESS METRICS (Fase 1)

| Métrica | Target | Cómo medir |
|---------|--------|-----------|
| Profile accuracy | >85% | Manual audit de 50 calls |
| Data extraction | >90% precision | NLP evaluation |
| Llamada 2 recognizes persona | >70% | Prospect feedback |
| No data loss on call end | 100% | Audit logs |
| API latency (<500ms) | <300ms p95 | APM dashboard |
| Database queries <100ms | 99% | Query logs |

---

## 1.6 RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Gemini extraction errors | Wrong profile data | Medium | Manual review + confidence scores |
| Database migration failure | Data loss | Low | Backup before migration, test in staging |
| PII exposure (GDPR) | Legal risk | Low | Encrypt PII at rest, GDPR audit |
| Integration bugs with voice | Calls fail to load profile | Medium | Extensive integration testing |

---

---

# FASE 2: COACHING AUTOMÁTICO + LEAD SCORING (SEMANAS 5-8)

## Objetivo
Dar feedback automático al agente sobre cómo mejorar.
Score cada prospect para priorización.

## 2.1 LEAD SCORING MODEL

### Schema: `lead_scores` table

```sql
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id),
  
  -- TIMESTAMP
  calculated_at TIMESTAMP DEFAULT NOW(),
  call_number INT,
  
  -- INDIVIDUAL SCORES (0-100)
  budget_fit_score INT,        -- Presupuesto vs nuestro rango
  company_size_fit_score INT,  -- Tamaño vs histórico
  industry_alignment_score INT, -- Industria con mejor conversion
  objection_overcoming_score INT, -- Qué tan hard/soft son las objeciones
  timeline_urgency_score INT,  -- ¿Cuándo necesita? (hoy vs 6 meses)
  
  -- COMPOSITE SCORES
  interest_score INT,          -- 0-100, combina engagement + signals
  buying_signal_score INT,     -- 0-100, qué tan cerca de cerrar
  
  -- FINAL LEAD SCORE
  lead_score INT,              -- 0-100 (weighted average)
  confidence FLOAT,            -- 0-1: qué tan seguro estamos
  
  -- BREAKDOWN
  calculation_details JSONB,   -- {weights, formula, per_factor}
  
  -- FOR COACHING
  strengths TEXT[],            -- ["mencionó presupuesto", "decision maker"]
  weaknesses TEXT[],           -- ["rechazó 3 veces", "dijo muy caro"]
  recommended_next_steps TEXT[],  -- ["mostrar case study", "oferta especial"]
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_scores_prospect 
  ON lead_scores(prospect_id, calculated_at DESC);
```

### Lead Scoring Algorithm

```python
class LeadScoringEngine:
    """Calcular lead score basado en datos históricos + actuales"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_lead_score(
        self,
        prospect_id: str,
        software_id: str
    ) -> dict:
        """
        Lead Score = Weighted combination of:
        1. Budget fit (30%)
        2. Company size alignment (20%)
        3. Industry signals (15%)
        4. Engagement level (20%)
        5. Objection intensity (15%)
        """
        
        # 1. Get prospect profile
        prospect = await self._get_prospect(prospect_id)
        
        # 2. Calculate individual scores
        scores = {
            "budget_fit": await self._score_budget_fit(prospect),
            "company_size": await self._score_company_size(prospect),
            "industry": await self._score_industry_alignment(prospect),
            "engagement": await self._score_engagement(prospect),
            "objections": await self._score_objections(prospect)
        }
        
        # 3. Calculate weighted average
        weights = {
            "budget_fit": 0.30,
            "company_size": 0.20,
            "industry": 0.15,
            "engagement": 0.20,
            "objections": 0.15
        }
        
        lead_score = sum(
            scores[key] * weights[key] 
            for key in scores.keys()
        )
        
        # 4. Calculate confidence
        confidence = await self._calculate_confidence(prospect, scores)
        
        # 5. Get strengths/weaknesses
        strengths, weaknesses = await self._analyze_profile(prospect)
        
        # 6. Generate next steps
        next_steps = await self._recommend_next_steps(prospect, scores)
        
        return {
            "lead_score": int(lead_score),
            "confidence": confidence,
            "component_scores": scores,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommended_next_steps": next_steps,
            "classification": self._classify_lead(int(lead_score))
        }
    
    async def _score_budget_fit(self, prospect: dict) -> float:
        """Score: Does prospect budget fit our range?"""
        
        # If budget not stated, medium confidence
        if not prospect["stated_budget_min"]:
            return 50.0
        
        # Our typical deal: $500-3000
        OUR_MIN, OUR_MAX = 500, 3000
        prospect_budget = (prospect["stated_budget_min"] + prospect["stated_budget_max"]) / 2
        
        if prospect_budget < OUR_MIN:
            return 30.0  # Too cheap, won't work
        elif prospect_budget > OUR_MAX:
            return 70.0  # Rich customer, good potential but needs custom pricing
        else:
            return 90.0  # Perfect fit
    
    async def _score_company_size(self, prospect: dict) -> float:
        """Score: Historical data - which sizes convert best?"""
        
        # Query historical data for this industry
        stmt = text("""
            SELECT 
                company_size,
                COUNT(*) as total,
                SUM(CASE WHEN outcome IN ('demo_booked', 'closed') THEN 1 ELSE 0 END) as conversions,
                SUM(CASE WHEN outcome IN ('demo_booked', 'closed') THEN 1 ELSE 0 END)::float / COUNT(*) as conversion_rate
            FROM call_turns ct
            JOIN prospect_profiles pp ON ct.prospect_id = pp.id
            WHERE pp.software_id = :software_id
              AND pp.industry = :industry
              AND ct.started_at > NOW() - INTERVAL '90 days'
            GROUP BY company_size
            ORDER BY conversion_rate DESC
        """)
        
        result = await self.db.execute(stmt, {
            "software_id": prospect["software_id"],
            "industry": prospect["industry"]
        })
        
        company_size_data = result.mappings().all()
        
        # Find conversion rate for this size
        for row in company_size_data:
            if row["company_size"] == prospect["company_size"]:
                return row["conversion_rate"] * 100
        
        # Default if not found
        return 50.0
    
    async def _score_industry_alignment(self, prospect: dict) -> float:
        """Score: Does this industry have good conversion?"""
        
        stmt = text("""
            SELECT 
                industry,
                SUM(CASE WHEN outcome IN ('demo_booked', 'closed') THEN 1 ELSE 0 END)::float / COUNT(*) as conversion_rate
            FROM call_turns ct
            JOIN prospect_profiles pp ON ct.prospect_id = pp.id
            WHERE pp.software_id = :software_id
              AND ct.started_at > NOW() - INTERVAL '90 days'
            GROUP BY industry
            ORDER BY conversion_rate DESC
        """)
        
        result = await self.db.execute(stmt, {
            "software_id": prospect["software_id"]
        })
        
        industry_data = result.mappings().all()
        
        for row in industry_data:
            if row["industry"] == prospect["industry"]:
                return row["conversion_rate"] * 100
        
        return 50.0
    
    async def _score_engagement(self, prospect: dict) -> float:
        """Score: Engagement signals from profile"""
        
        # engagement = temperature_score (0-1) * 100
        base_engagement = prospect["temperature_score"] * 100
        
        # Boost if decision maker confirmed
        if prospect["is_decision_maker"]:
            base_engagement += 15
        
        # Boost if stated budget (shows interest)
        if prospect["stated_budget_min"]:
            base_engagement += 10
        
        return min(100, base_engagement)
    
    async def _score_objections(self, prospect: dict) -> float:
        """Score: How hard are the objections?"""
        
        objections = prospect["objections"] or []
        
        if not objections:
            return 80.0  # No objections = good signal
        
        # Score based on objection type
        objection_weights = {
            "price": 0.5,           # Hard to overcome
            "need": 0.8,            # Easy (just show value)
            "timing": 0.6,          # Medium (urgent vs can wait)
            "competitor": 0.4,      # Hard
            "other": 0.7
        }
        
        total_difficulty = 0
        for obj in objections:
            difficulty = objection_weights.get(obj.get("category", "other"), 0.5)
            total_difficulty += difficulty
        
        avg_difficulty = total_difficulty / len(objections)
        
        # Lower difficulty = higher score
        return (1 - avg_difficulty) * 100
    
    async def _calculate_confidence(self, prospect: dict, scores: dict) -> float:
        """How confident are we in this score?"""
        
        # Confidence increases with:
        # - More calls (more data)
        # - More recent data
        # - Explicit budget/decision info
        
        confidence = 0.3  # Base
        
        # Add for each call
        confidence += min(0.3, prospect["total_calls"] * 0.1)
        
        # Add for explicit budget
        if prospect["stated_budget_min"] and prospect["budget_confidence"] > 0.7:
            confidence += 0.2
        
        # Add for decision maker confirmation
        if prospect["is_decision_maker"] and prospect["decision_maker_confidence"] > 0.7:
            confidence += 0.2
        
        return min(1.0, confidence)
    
    async def _analyze_profile(self, prospect: dict) -> tuple:
        """Get strengths and weaknesses"""
        
        strengths = []
        weaknesses = []
        
        # Strengths
        if prospect["temperature"] == "hot":
            strengths.append("🔥 Hot prospect - high engagement")
        elif prospect["temperature"] == "warm":
            strengths.append("⚠️ Warm prospect - interested")
        
        if prospect["is_decision_maker"]:
            strengths.append("✅ Decision maker confirmed")
        
        if prospect["stated_budget_min"]:
            strengths.append(f"💰 Budget stated: ${prospect['stated_budget_min']}-${prospect['stated_budget_max']}")
        
        # Weaknesses
        if prospect["temperature"] == "cold":
            weaknesses.append("❄️ Cold prospect - needs warming")
        
        if prospect["total_calls"] == 1 and prospect["temperature"] == "cold":
            weaknesses.append("⏰ Only 1 call, need more data")
        
        if prospect["objections"]:
            objection_count = len(prospect["objections"])
            weaknesses.append(f"⚠️ {objection_count} objections raised")
        
        if not prospect["stated_budget_min"]:
            weaknesses.append("❓ Budget not stated - unknown fit")
        
        return strengths, weaknesses
    
    async def _recommend_next_steps(self, prospect: dict, scores: dict) -> list:
        """Generate recommended actions"""
        
        next_steps = []
        
        # If budget_fit is low
        if scores["budget_fit"] < 40:
            next_steps.append("Send custom pricing email")
        
        # If engagement is high but objections present
        if scores["engagement"] > 70 and scores["objections"] < 50:
            next_steps.append("Send case study addressing main objection")
        
        # If decision maker not confirmed
        if not prospect["is_decision_maker"]:
            next_steps.append("Ask to be transferred to decision maker")
        
        # If warm/hot and no budget stated
        if prospect["temperature"] in ["warm", "hot"] and not prospect["stated_budget_min"]:
            next_steps.append("Schedule follow-up to discuss budget")
        
        return next_steps
    
    def _classify_lead(self, score: int) -> str:
        """Classify lead based on score"""
        if score >= 80:
            return "🌟 PREMIUM - Ready to close"
        elif score >= 60:
            return "⭐ QUALITY - High potential"
        elif score >= 40:
            return "👥 STANDARD - Worth nurturing"
        else:
            return "❌ LOW - Deprioritize"
```

---

## 2.2 POST-CALL COACHING ENGINE

### Schema: `coaching_feedback` table

```sql
CREATE TABLE coaching_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id),
  call_id UUID NOT NULL REFERENCES call_turns(id),
  
  -- FEEDBACK GENERATION
  generated_at TIMESTAMP DEFAULT NOW(),
  model_version TEXT,  -- gemini-3.5, etc
  
  -- COACHING AREAS (JSONB)
  coaching JSONB NOT NULL,
  -- {
  --   "objection_handling": {
  --     "score": 0.6,
  --     "feedback": "Respondiste a '¿muy caro?' con ROI. Bien. Pero podrías haber usado case study.",
  --     "example_response": "Déjame mostrarte cómo X ahorró $Y..."
  --   },
  --   "discovery": {
  --     "score": 0.4,
  --     "feedback": "No preguntaste sobre presupuesto",
  --     "recommended_question": "¿Cuál es tu presupuesto aproximado?"
  --   },
  --   "closing": {
  --     "score": 0.2,
  --     "feedback": "No cerraste. Prospect estaba warm pero no pediste demo.",
  --     "closing_attempt": "Entonces, ¿agendamos una demo para mañana?"
  --   },
  --   "tonality": {
  --     "score": 0.7,
  --     "feedback": "Buen tono, profesional y amable"
  --   }
  -- }
  
  overall_score FLOAT,  -- 0-1
  
  -- SPECIFIC RECOMMENDATIONS
  do_more TEXT[],       -- ["usar case studies", "preguntar budget pronto"]
  avoid TEXT[],         -- ["repeating yourself", "hard sell after objection"]
  practice_area TEXT,   -- "objection_handling" | "closing" | "discovery"
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Coaching Generation

```python
class CoachingEngine:
    """Generar coaching feedback automático después de cada llamada"""
    
    def __init__(self, gemini_client):
        self.gemini = gemini_client
    
    async def generate_coaching(
        self,
        call_transcript: list,
        prospect_profile: dict,
        lead_score: dict
    ) -> dict:
        """
        Usar Gemini para analizar call y generar coaching específico
        """
        
        prompt = f"""
        Eres un coach de ventas experimentado. Analiza esta llamada y proporciona feedback constructivo.
        
        PROSPECT INFO:
        - Temperature: {prospect_profile['temperature']}
        - Interest: {prospect_profile['interest_level']}/5
        - Objections: {prospect_profile['objections']}
        
        CALL TRANSCRIPT:
        {self._format_transcript(call_transcript)}
        
        ANALYZE Y PROPORCIONA FEEDBACK EN ESTOS AREAS:
        
        1. DISCOVERY (0-1 score)
           - ¿Hizo suficientes preguntas?
           - ¿Identificó pain points?
           - ¿Preguntó sobre budget/timeline?
           Feedback: ...
           Recommended question if missing: ...
        
        2. OBJECTION HANDLING (0-1 score)
           - Objections encontradas: [list]
           - How well handled: 
           - Better approach: ...
        
        3. CLOSING (0-1 score)
           - ¿Intentó cerrar o pidió demo?
           - Timing adecuado?
           - Suggested closing attempt: ...
        
        4. TONALITY (0-1 score)
           - Professional?
           - Empathetic?
           - Feedback: ...
        
        5. PACING (0-1 score)
           - No too fast?
           - Allowed prospect to talk?
           - Feedback: ...
        
        RETORNAR JSON:
        {{
            "objection_handling": {{
                "score": 0.6,
                "feedback": "...",
                "improved_response": "..."
            }},
            "discovery": {{
                "score": 0.4,
                "feedback": "...",
                "missing_questions": ["¿presupuesto?", "¿timeline?"]
            }},
            "closing": {{
                "score": 0.2,
                "feedback": "...",
                "suggested_closing": "..."
            }},
            "tonality": {{
                "score": 0.7,
                "feedback": "..."
            }},
            "pacing": {{
                "score": 0.8,
                "feedback": "..."
            }},
            "overall_score": 0.54,
            "do_more": ["use case studies", "ask budget early"],
            "avoid": ["repeat yourself"],
            "practice_area": "objection_handling"
        }}
        """
        
        response = await self.gemini.generate_content(prompt)
        
        import json
        feedback = json.loads(response.text)
        
        return feedback
```

---

## 2.3 EFFORT & TIMELINE

| Task | Hours | Days | Dependencies |
|------|-------|------|--------------|
| Lead Scoring schema + logic | 20 | 2.5 | Phase 1 complete |
| Scoring engine implementation | 20 | 2.5 | ✅ Schema |
| Coaching feedback table | 8 | 1 | ✅ Schema |
| Gemini coaching integration | 16 | 2 | ✅ Extraction |
| Coaching dashboard (UI) | 16 | 2 | ✅ All above |
| Testing + calibration | 12 | 1.5 | ✅ All above |
| **TOTAL FASE 2** | **92 horas** | **~11 días** | - |

---

## 2.4 SUCCESS METRICS (Fase 2)

| Métrica | Target | Cómo medir |
|---------|--------|-----------|
| Lead score accuracy | >80% | Correlate with actual closures |
| Coaching usefulness | >70% | Agent survey |
| Model accuracy | >85% precision | Manual audit |
| Score consistency | <10% variance | Multiple runs |
| Coaching generation time | <2s | Latency monitoring |

---

---

# FASE 3: MULTICANAL (WHATSAPP + SMS + EMAIL) (SEMANAS 9-12)

## Objetivo
Contactar prospects que no contestan llamadas. Continuar nurture post-call.

## 3.1 WHATSAPP INTEGRATION

### Schema

```sql
CREATE TABLE channel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id),
  
  -- CHANNELS
  prefer_whatsapp BOOLEAN DEFAULT TRUE,
  prefer_sms BOOLEAN DEFAULT FALSE,
  prefer_email BOOLEAN DEFAULT TRUE,
  prefer_phone BOOLEAN DEFAULT TRUE,
  
  -- QUIET HOURS (don't contact outside these)
  quiet_hours_start TIME,  -- e.g., 20:00
  quiet_hours_end TIME,    -- e.g., 08:00
  
  -- OPT-OUT
  do_not_contact BOOLEAN DEFAULT FALSE,
  do_not_contact_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id),
  
  -- MESSAGE META
  channel TEXT NOT NULL,  -- 'whatsapp', 'sms', 'email'
  message_type TEXT,      -- 'follow_up', 'offer', 'case_study', 'nurture'
  
  -- CONTENT
  subject TEXT,           -- For email
  body TEXT NOT NULL,
  template_id TEXT,       -- Which template used
  
  -- SCHEDULING
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  
  -- DELIVERY
  provider_id TEXT,       -- Provider's message ID
  status TEXT,            -- 'pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'
  error_message TEXT,
  
  -- ENGAGEMENT
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  click_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### WhatsApp Provider Integration

```python
# app/multicanal/whatsapp_provider.py

class WhatsAppProvider:
    """Integration with WhatsApp Business API"""
    
    def __init__(self, account_id: str, access_token: str):
        self.account_id = account_id
        self.token = access_token
        self.base_url = "https://graph.instagram.com/v18.0"
    
    async def send_message(
        self,
        phone: str,
        message: str,
        template_name: str = None
    ) -> dict:
        """
        Send message via WhatsApp.
        If template_name provided, use template (more reliable)
        """
        
        if template_name:
            return await self._send_template_message(phone, template_name, message)
        else:
            return await self._send_text_message(phone, message)
    
    async def _send_text_message(self, phone: str, message: str) -> dict:
        """Send plain text message"""
        
        url = f"{self.base_url}/{self.account_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message
            }
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            return {
                "status": "success",
                "provider_id": result["messages"][0]["id"]
            }
        else:
            return {
                "status": "failed",
                "error": response.text
            }
    
    async def _send_template_message(
        self,
        phone: str,
        template_name: str,
        params: dict = None
    ) -> dict:
        """Send templated message (recommended for compliance)"""
        
        url = f"{self.base_url}/{self.account_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "es"},
                "parameters": {
                    "body": {
                        "parameters": [{"type": "text", "text": v} for v in (params or {}).values()]
                    }
                }
            }
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            return {
                "status": "success",
                "provider_id": result["messages"][0]["id"]
            }
        else:
            return {
                "status": "failed",
                "error": response.text
            }
```

### Orchestration: Decide Which Channel

```python
# app/multicanal/channel_orchestrator.py

class ChannelOrchestrator:
    """Decide best channel for each next action"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def select_channel_for_prospect(
        self,
        prospect_id: str,
        action_type: str
    ) -> dict:
        """
        Decide: WhatsApp? SMS? Email? Voice?
        
        Rules:
        1. If lead is HOT and not answered calls -> WhatsApp (faster)
        2. If lead is WARM -> Email (less intrusive)
        3. If contact failed -> SMS (universal)
        4. If available -> Respect preferences
        """
        
        # Get prospect and preference
        prospect = await self._get_prospect(prospect_id)
        prefs = await self._get_channel_prefs(prospect_id)
        
        # Scoring function for each channel
        scores = {
            "whatsapp": 0,
            "sms": 0,
            "email": 0,
            "phone": 0
        }
        
        # RULE 1: Temperature matters
        if prospect["temperature"] == "hot":
            scores["whatsapp"] += 30
            scores["phone"] += 20
        elif prospect["temperature"] == "warm":
            scores["email"] += 25
            scores["whatsapp"] += 15
        else:
            scores["email"] += 10
        
        # RULE 2: Action type
        if action_type == "demo_confirmation":
            scores["whatsapp"] += 20
        elif action_type == "nurture":
            scores["email"] += 20
        elif action_type == "urgent_offer":
            scores["sms"] += 15
        
        # RULE 3: Respect preferences
        if prefs.get("prefer_whatsapp"):
            scores["whatsapp"] += 10
        if prefs.get("prefer_email"):
            scores["email"] += 10
        
        # RULE 4: Previous success
        success_rate = await self._get_channel_success_rate(prospect_id)
        for channel, rate in success_rate.items():
            scores[channel] += rate * 100
        
        # Pick best
        best_channel = max(scores, key=scores.get)
        
        return {
            "recommended_channel": best_channel,
            "alternative_channels": sorted(scores.items(), key=lambda x: x[1], reverse=True)[1:3],
            "reasoning": f"Hot temp ({prospect['temperature']}) + {action_type} + history"
        }
```

---

## 3.2 FOLLOW-UP TEMPLATES

### Template System

```python
# app/multicanal/templates.py

FOLLOW_UP_TEMPLATES = {
    "warm_email_followup": {
        "channel": "email",
        "subject": "Hola {{name}}, te dejé algunos números 💡",
        "body": """
Hola {{name}},

Hablamos ayer sobre cómo aumentar pacientes en {{company}}.

Mencionaste que tu presupuesto es alrededor de ${{budget}}, así que aquí están las opciones:

**Plan Starter**: ${{plan_starter_price}}/mes
- {{feature_1}}
- {{feature_2}}

**Plan Pro**: ${{plan_pro_price}}/mes
- {{feature_1}}
- {{feature_2}}
- {{feature_3}}

¿Cuál te parece mejor? Tengo 2 slots esta semana para demo.

Saludos,
{{agent_name}}
        """
    },
    
    "objection_price_whatsapp": {
        "channel": "whatsapp",
        "template_name": "price_objection_followup",
        "params": {
            "prospect_name": "{{name}}",
            "roi_example": "De los 200 odontólogos que usan nuestro sistema, el 65% recupera la inversión en 3 meses",
            "offer": "¿Te gustaría ver cómo?"
        }
    },
    
    "urgent_offer_sms": {
        "channel": "sms",
        "body": """
{{name}}: Tenemos 1 slot especial hoy para {{company}} - 20% descuento si cierras hoy. ¿Hablamos en 5 min? {{short_link}}
        """
    },
    
    "case_study_email": {
        "channel": "email",
        "subject": "Case: Cómo {{similar_company}} aumentó {{metric}} en {{timeframe}}",
        "body": """
Hola {{name}},

Vi que trabajas con {{company}} ({{company_size}} personas, industria {{industry}}).

Pensé que te podría interesar este caso de {{similar_company}}:
- Situación: {{situation}}
- Solución: {{our_solution}}
- Resultado: {{result}}

¿Te gustaría algo similar?

Link a caso: {{case_study_link}}
        """
    }
}
```

### Automatic Follow-Up Orchestration

```python
# app/multicanal/followup_engine.py

class FollowUpEngine:
    """Automatically schedule follow-ups based on call outcome"""
    
    def __init__(self, db: AsyncSession, whatsapp: WhatsAppProvider):
        self.db = db
        self.whatsapp = whatsapp
    
    async def schedule_followups_after_call(
        self,
        prospect_id: str,
        call_outcome: str,
        next_steps: list
    ):
        """
        After each call, schedule follow-ups:
        - Soft NO -> Email in 24h with case study
        - INTERESTED -> WhatsApp in 2h with calendar link
        - HARD NO -> Keep in loop, email in 7d
        """
        
        followups = []
        
        if call_outcome == "soft_no":
            # Try to resurrect with value
            followups.append({
                "channel": "email",
                "template": "case_study_email",
                "delay_minutes": 1440,  # 24 hours
                "priority": 1
            })
            followups.append({
                "channel": "sms",
                "template": "urgent_offer_sms",
                "delay_minutes": 2880,  # 2 days
                "priority": 2
            })
        
        elif call_outcome == "interested":
            # Strike while hot
            followups.append({
                "channel": "whatsapp",
                "template": "warm_email_followup",  # Adapt for WhatsApp
                "delay_minutes": 120,  # 2 hours
                "priority": 1
            })
        
        elif call_outcome == "hard_no":
            # Long tail nurture
            followups.append({
                "channel": "email",
                "template": "case_study_email",
                "delay_minutes": 10080,  # 7 days
                "priority": 3
            })
        
        elif call_outcome == "demo_booked":
            # Confirm demo
            followups.append({
                "channel": "whatsapp",
                "template": "demo_confirmation",
                "delay_minutes": 30,  # Quick reminder
                "priority": 1
            })
        
        # Schedule all
        for fu in followups:
            await self._schedule_message(prospect_id, fu)
    
    async def _schedule_message(self, prospect_id: str, followup_config: dict):
        """Schedule message for later send"""
        
        from datetime import datetime, timedelta
        
        scheduled_at = datetime.utcnow() + timedelta(minutes=followup_config["delay_minutes"])
        
        msg = OutboundMessage(
            prospect_id=prospect_id,
            channel=followup_config["channel"],
            template_id=followup_config["template"],
            scheduled_at=scheduled_at,
            status="pending",
            message_type="follow_up"
        )
        
        self.db.add(msg)
        await self.db.commit()
```

---

## 3.3 EFFORT & TIMELINE

| Task | Hours | Days | Dependencies |
|------|-------|------|--------------|
| WhatsApp API integration | 20 | 2.5 | Credentials setup |
| SMS provider setup (Twilio SMS) | 12 | 1.5 | Account |
| Email provider (SendGrid/Mailgun) | 8 | 1 | Account |
| Channel orchestrator | 16 | 2 | All providers |
| Template system | 12 | 1.5 | DB schema |
| Followup automation | 16 | 2 | Orchestrator |
| Compliance/opt-out logic | 12 | 1.5 | GDPR audit |
| Testing across channels | 16 | 2 | All above |
| **TOTAL FASE 3** | **112 horas** | **~15 días** | - |

---

## 3.4 SUCCESS METRICS (Fase 3)

| Métrica | Target | Cómo medir |
|---------|--------|-----------|
| WhatsApp open rate | >70% | Message delivery tracking |
| SMS response rate | >15% | Webhook tracking |
| Email open rate | >25% | SendGrid tracking |
| Multi-channel conversion | +20% vs phone only | Cohort analysis |
| Opt-out compliance | 100% | Audit |

---

---

# FASE 4: GLOBAL LEARNING LOOP (SEMANAS 13-16)

## Objetivo
Aprender de todos los calls para mejorar prompts y estrategia automáticamente.

## 4.1 LEARNING DATA PIPELINE

### Schema

```sql
CREATE TABLE learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  
  -- TIME WINDOW
  window_date DATE NOT NULL,
  window_start TIMESTAMP,
  window_end TIMESTAMP,
  
  -- AGGREGATE METRICS
  calls_count INT,
  leads_count INT,
  closures INT,
  closure_rate FLOAT,
  avg_call_duration INT,
  
  -- QUALITY METRICS
  avg_lead_score FLOAT,
  avg_coaching_score FLOAT,
  
  -- BY SEGMENT
  by_industry JSONB,    -- {industry: {closure_rate, avg_score}}
  by_company_size JSONB,
  by_temperature JSONB,
  
  -- TOP PATTERNS
  top_objections JSONB, -- [{objection, count, overcome_rate}]
  top_motivators JSONB, -- [{motivator, frequency, conversion_impact}]
  top_arguments JSONB,  -- [{argument, win_rate}]
  
  -- MODEL PERFORMANCE
  prompt_version TEXT,
  model_version TEXT,
  
  -- RECOMMENDATIONS
  recommended_prompt_changes JSONB,
  recommended_strategy_changes JSONB,
  confidence_in_changes FLOAT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_learning_metrics_window 
  ON learning_metrics(software_id, window_date DESC);
```

### Daily Learning Loop

```python
# app/learning_loop/daily_analyzer.py

class DailyLearningAnalyzer:
    """Run daily to extract learnings from past 24h of calls"""
    
    def __init__(self, db: AsyncSession, gemini_client):
        self.db = db
        self.gemini = gemini_client
    
    async def run_daily_analysis(self, software_id: str, date: date = None):
        """
        Execute daily:
        1. Aggregate metrics from yesterday
        2. Identify top objections/motivators
        3. Get winning arguments
        4. Recommend prompt improvements
        """
        
        if date is None:
            date = datetime.utcnow().date()
        
        # 1. Get yesterday's calls
        calls = await self._get_calls_for_date(software_id, date - timedelta(days=1))
        
        if not calls:
            logger.info(f"No calls for {date}, skipping analysis")
            return None
        
        # 2. Compute metrics
        metrics = {
            "calls_count": len(calls),
            "closure_rate": self._compute_closure_rate(calls),
            "avg_lead_score": self._compute_avg_lead_score(calls),
            "avg_call_duration": self._compute_avg_duration(calls),
            "by_industry": await self._segment_by_industry(calls),
            "by_company_size": await self._segment_by_company_size(calls),
            "top_objections": await self._extract_top_objections(calls),
            "top_motivators": await self._extract_top_motivators(calls),
            "top_arguments": await self._extract_top_arguments(calls)
        }
        
        # 3. Generate recommendations
        recommendations = await self._generate_recommendations(metrics, calls)
        
        # 4. Save to DB
        learning_record = LearningMetrics(
            software_id=software_id,
            window_date=date,
            window_start=datetime.combine(date, time.min),
            window_end=datetime.combine(date, time.max),
            **metrics,
            recommended_prompt_changes=recommendations["prompt_changes"],
            recommended_strategy_changes=recommendations["strategy_changes"],
            confidence_in_changes=recommendations["confidence"]
        )
        
        self.db.add(learning_record)
        await self.db.commit()
        
        return learning_record
    
    def _compute_closure_rate(self, calls: list) -> float:
        """% of calls that resulted in demo/closure"""
        closures = sum(1 for c in calls if c.outcome in ["demo_booked", "closed"])
        return closures / len(calls) if calls else 0
    
    async def _extract_top_objections(self, calls: list) -> list:
        """Get most common objections and how often overcome"""
        
        objections = {}
        
        for call in calls:
            for obj in call.objections:
                key = obj["category"]
                if key not in objections:
                    objections[key] = {"count": 0, "overcome": 0}
                
                objections[key]["count"] += 1
                if obj.get("effectiveness", 0) > 0.5:  # Handler was effective
                    objections[key]["overcome"] += 1
        
        # Sort by frequency
        sorted_obj = sorted(
            objections.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )
        
        return [
            {
                "objection": name,
                "frequency": counts["count"],
                "overcome_rate": counts["overcome"] / counts["count"]
            }
            for name, counts in sorted_obj[:5]
        ]
    
    async def _extract_top_arguments(self, calls: list) -> list:
        """Get winning arguments (agent responses that led to closure)"""
        
        arguments = {}
        
        for call in calls:
            # Get calls that closed
            if call.outcome in ["demo_booked", "closed"]:
                # Extract agent's winning responses
                for turn_idx, turn in enumerate(call.turns):
                    if turn["role"] == "agent":
                        arg_text = turn["text"]
                        if arg_text not in arguments:
                            arguments[arg_text] = 0
                        arguments[arg_text] += 1
        
        # Sort by frequency
        top_args = sorted(arguments.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return [
            {"argument": text, "wins": count}
            for text, count in top_args
        ]
    
    async def _generate_recommendations(self, metrics: dict, calls: list) -> dict:
        """Use Gemini to recommend prompt improvements"""
        
        prompt = f"""
        Eres un experto en ventas B2B. Analiza estos datos de {len(calls)} llamadas y recomienda mejoras.
        
        METRICS:
        - Closure rate: {metrics['closure_rate']*100:.1f}%
        - Avg lead score: {metrics['avg_lead_score']:.1f}
        - Top objections: {json.dumps(metrics['top_objections'][:3])}
        - Top motivators: {json.dumps(metrics['top_motivators'][:3])}
        - Winning arguments: {json.dumps(metrics['top_arguments'][:3])}
        
        SEGMENT PERFORMANCE:
        - By industry: {json.dumps(metrics['by_industry'])}
        
        RECOMMEND:
        1. Prompt changes to improve closure rate
        2. Strategy changes based on segment
        3. New objection handlers
        4. Confidence in each recommendation
        
        RETORNAR JSON:
        {{
            "prompt_changes": [
                {{
                    "current": "...",
                    "suggested": "...",
                    "reasoning": "...",
                    "expected_impact": "+5% closure"
                }}
            ],
            "strategy_changes": [
                {{
                    "segment": "dental",
                    "current_rate": 0.35,
                    "suggestion": "Focus on cost justification",
                    "expected_improvement": "+10%"
                }}
            ],
            "new_objection_handlers": [
                {{
                    "objection": "price",
                    "new_handler": "..."
                }}
            ],
            "overall_confidence": 0.75
        }}
        """
        
        response = await self.gemini.generate_content(prompt)
        
        import json
        recommendations = json.loads(response.text)
        
        return {
            "prompt_changes": recommendations.get("prompt_changes", []),
            "strategy_changes": recommendations.get("strategy_changes", []),
            "confidence": recommendations.get("overall_confidence", 0.5)
        }
```

---

## 4.2 A/B TESTING FRAMEWORK

```python
# app/learning_loop/ab_testing.py

class ABTestingFramework:
    """Run A/B tests on prompt variants"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_test(
        self,
        software_id: str,
        variant_a_prompt: str,
        variant_b_prompt: str,
        test_duration_days: int = 7
    ) -> dict:
        """Create new A/B test"""
        
        test = ABTest(
            software_id=software_id,
            variant_a_prompt=variant_a_prompt,
            variant_b_prompt=variant_b_prompt,
            started_at=datetime.utcnow(),
            duration_days=test_duration_days,
            status="active"
        )
        
        self.db.add(test)
        await self.db.commit()
        
        return {"test_id": str(test.id), "status": "started"}
    
    async def assign_variant(
        self,
        test_id: str,
        prospect_id: str
    ) -> str:
        """
        Route prospect to variant A or B (50/50 split)
        """
        
        import random
        variant = random.choice(["a", "b"])
        
        assignment = ABTestAssignment(
            test_id=test_id,
            prospect_id=prospect_id,
            variant=variant,
            assigned_at=datetime.utcnow()
        )
        
        self.db.add(assignment)
        await self.db.commit()
        
        return variant
    
    async def evaluate_test(self, test_id: str) -> dict:
        """
        After duration_days, evaluate which variant won
        """
        
        test = await self.db.get(ABTest, test_id)
        
        if test.status != "active":
            return {"error": "Test not active"}
        
        # Get results
        stmt = text("""
            SELECT 
                variant,
                COUNT(*) as total,
                SUM(CASE WHEN outcome IN ('demo_booked', 'closed') THEN 1 ELSE 0 END) as closures,
                SUM(CASE WHEN outcome IN ('demo_booked', 'closed') THEN 1 ELSE 0 END)::float / COUNT(*) as closure_rate,
                AVG(lead_score) as avg_lead_score
            FROM ab_test_assignments ata
            JOIN call_turns ct ON ata.prospect_id = ct.prospect_id
            WHERE ata.test_id = :test_id
              AND ata.assigned_at BETWEEN :start AND :end
            GROUP BY variant
        """)
        
        results = await self.db.execute(stmt, {
            "test_id": test_id,
            "start": test.started_at,
            "end": test.started_at + timedelta(days=test.duration_days)
        })
        
        rows = results.mappings().all()
        
        # Determine winner
        results_dict = {row["variant"]: row for row in rows}
        
        variant_a = results_dict.get("a", {})
        variant_b = results_dict.get("b", {})
        
        winner = "a" if (variant_a.get("closure_rate", 0) > variant_b.get("closure_rate", 0)) else "b"
        
        # Update test status
        test.status = "completed"
        test.winner = winner
        test.winner_details = {
            "variant_a": dict(variant_a),
            "variant_b": dict(variant_b),
            "improvement": (variant_a.get("closure_rate", 0) - variant_b.get("closure_rate", 0)) * 100
        }
        
        await self.db.commit()
        
        return {
            "test_id": test_id,
            "winner": winner,
            "details": test.winner_details
        }
```

---

## 4.3 EFFORT & TIMELINE

| Task | Hours | Days | Dependencies |
|------|-------|------|--------------|
| Learning metrics schema | 8 | 1 | DB ready |
| Daily analyzer implementation | 20 | 2.5 | Schema |
| Gemini integration for recommendations | 16 | 2 | Analyzer |
| A/B testing framework | 16 | 2 | Schema |
| Analytics dashboard (backend) | 20 | 2.5 | Metrics |
| Scheduled jobs (cron) | 8 | 1 | Analyzer |
| Testing + validation | 16 | 2 | All above |
| **TOTAL FASE 4** | **104 horas** | **~13 días** | - |

---

## 4.4 SUCCESS METRICS (Fase 4)

| Métrica | Target | Cómo medir |
|---------|--------|-----------|
| Recommendation accuracy | >80% | Implement + measure impact |
| A/B test clarity | Confidence >95% | Statistical significance |
| Learning loop latency | <1 day | Timestamp tracking |
| Prompt improvements | +2-3% closure/month | Month-over-month |
| Strategy pivots executed | 2/month | Change log |

---

---

# OVERALL TIMELINE & EFFORT SUMMARY

## By Phase

| Phase | Name | Hours | Days | Cumulative | Start | End |
|-------|------|-------|------|------------|-------|-----|
| 1 | Prospect Profile Engine | 76 | 11 | 76 | Week 1 | Week 2 |
| 2 | Coaching + Scoring | 92 | 11 | 168 | Week 3 | Week 4 |
| 3 | Multicanal | 112 | 15 | 280 | Week 5 | Week 7 |
| 4 | Global Learning | 104 | 13 | 384 | Week 8 | Week 9 |
| | **BUFFER/QA** | **40** | **6** | **424** | Weeks 10-12 | Week 12 |
| | **TOTAL** | **424 hrs** | **60 days** | - | - | **Week 12** |

**Horas/semana**: 424 / 12 = ~35 hrs/week (0.9 FTE)

---

## Resource Plan

### Team Composition
- **1 Backend Lead** (Phases 1-4): 0.9 FTE
  - Database schema
  - API endpoints
  - Integration with voice system
- **1 Integration Engineer** (Phases 3-4): 0.5 FTE (weeks 5+)
  - WhatsApp/SMS/Email
  - Channel orchestration
- **Optional: QA/Testing** (Phases 1-4): 0.5 FTE
  - End-to-end testing
  - Edge cases

### Infrastructure Costs (Year 1)

| Component | Cost | Notes |
|-----------|------|-------|
| Database (PostgreSQL) | $200/mo | Managed (Supabase/RDS) |
| WhatsApp Business API | $50/mo | SMS-like pricing |
| Email provider (SendGrid) | $50/mo | 100k emails/mo |
| Gemini API | Variable | ~$0.01 per request, est. $500/mo |
| Hosting/compute | $500/mo | Existing infra |
| Monitoring (DataDog/New Relic) | $200/mo | Log analysis |
| **TOTAL INFRASTRUCTURE** | **~$1,500/mo** | **$18k/year** |

### Development Cost
- Backend dev: ~$80/hr × 424 hrs = **$33,920**
- Integration engineer: ~$75/hr × 100 hrs = **$7,500**
- QA/testing: ~$65/hr × 60 hrs = **$3,900**
- **TOTAL DEV** | **~$45,320**

### Total Investment (Dev + Ops Year 1)
- Dev: $45k
- Ops: $18k
- **TOTAL: $63k**

---

# ROLLOUT STRATEGY

## Phase 1 (Weeks 1-2): Internal Testing
- Deploy to staging
- Test with small customer segment (10-20 prospects)
- Gather feedback

## Phase 2 (Weeks 3-4): Coaching Beta
- Enable for 50% of calls
- Monitor coaching quality
- Adjust scoring weights

## Phase 3 (Weeks 5-7): Multicanal Soft Launch
- WhatsApp for HOT prospects only
- Email for all WARM
- SMS as fallback

## Phase 4 (Weeks 8-9): Learning Loop Go-Live
- Daily analysis enabled
- A/B tests starting
- Automated prompt updates

## Week 10-12: Full Scale + Monitoring
- All 4 phases active
- Monitor for degradation
- Prepare customer communication

---

# RISK MANAGEMENT

## Top 5 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Gemini extraction errors degrade quality | Medium | High | Confidence scores + manual review |
| Database performance under load | Medium | High | Index strategy, query optimization, caching |
| WhatsApp rate limiting | Low | Medium | Rate limiting client, fallback to SMS |
| GDPR compliance issues | Low | High | Legal review, encryption, audit |
| Integration failures break calls | High | Critical | Extensive testing, feature flags, rollback |

### Mitigation Strategy
1. **Feature flags** for each phase (enable/disable per customer)
2. **Canary deployments** (1% traffic first)
3. **Monitoring alerts** for quality degradation
4. **Rollback plan** for each phase
5. **Weekly review calls** with team + customers

---

# SUCCESS CRITERIA (END OF 4 MONTHS)

## Quantitative

```
STARTING POINT (Today):
  - 1,000 calls/month
  - 40% closure rate = 400 leads
  - $37.50 cost/lead

TARGET (4 months):
  - 1,000 calls/month
  - 55% closure rate = 550 leads  ← +150 leads/month
  - $30 cost/lead
  - Revenue impact: +$45k/month = +$540k/year

PHASE 1 SUCCESS:
  - 100% of returning calls have profile context
  - Prospect recognizes "you know my situation" in 70%+ calls
  - No profile extraction errors >5%

PHASE 2 SUCCESS:
  - Lead score correlates 80%+ with actual closures
  - Coaches say feedback is "useful" 70%+ of time
  - No coaching slowdown of calls

PHASE 3 SUCCESS:
  - WhatsApp reach 60% of HOT prospects
  - 70%+ WhatsApp delivery rate
  - +20% conversion vs phone-only for WARM

PHASE 4 SUCCESS:
  - Learning loop generates recommendations 95% of time
  - A/B tests run monthly
  - +2-3% monthly closure improvement from prompt updates
```

## Qualitative

- ✅ System stable in production (no crashes)
- ✅ Customer satisfaction (NPS >50)
- ✅ Team can maintain code (documentation complete)
- ✅ GDPR compliant (audit passed)
- ✅ Roadmap clear for scaling to 10k calls/month

---

# WHAT NOT TO DO (Anti-Patterns)

### ❌ Over-engineering

- Don't build "perfect ML scoring" in Phase 1. Start with rules-based.
- Don't optimize for 100k calls if current load is 1k. Scale later.
- Don't build "optional" features. Do it or don't.

### ❌ Compliance Risks

- Don't skip GDPR audit. Do it before Phase 3 multicanal.
- Don't assume WhatsApp templates are optional. They're required.
- Don't store PII in plain text. Encrypt at rest.

### ❌ Integration Mistakes

- Don't integrate multicanal BEFORE Prospect Profile works. Sequence matters.
- Don't A/B test on different customer bases. Keep cohorts clean.
- Don't deploy all 4 phases at once. Each needs stabilization.

---

# APPENDIX: QUICK START COMMANDS

### Phase 1 Setup

```bash
# 1. Create database
psql -c "CREATE DATABASE silxarcrm_learning"

# 2. Run migrations
alembic upgrade head

# 3. Seed sample data
python scripts/seed_prospect_profiles.py

# 4. Test extraction engine
python -m pytest tests/test_extraction_engine.py -v

# 5. Deploy to staging
docker build -t silxarcrm:phase1 .
docker tag silxarcrm:phase1 gcr.io/project/silxarcrm:phase1
docker push gcr.io/project/silxarcrm:phase1
```

### Phase 3 Setup (WhatsApp)

```bash
# 1. Set WhatsApp credentials
export WHATSAPP_ACCOUNT_ID="xxx"
export WHATSAPP_ACCESS_TOKEN="xxx"

# 2. Create WhatsApp templates
curl -X POST https://graph.instagram.com/v18.0/xxx/message_templates \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -d @templates/whatsapp_templates.json

# 3. Test channel orchestration
python tests/test_channel_orchestrator.py::test_warm_prospect_email
```

---

**END OF PLAN**

Contacto: Carlos Zamudio
Fecha actualización: 2026-06-21
Status: 🟢 READY FOR KICKOFF
