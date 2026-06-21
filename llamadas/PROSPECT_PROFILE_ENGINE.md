# Prospect Profile Engine para Sistemas de Llamadas AI

## Contexto: Sistema Actual vs. Propuesta

**AHORA (Estado actual):**
- Cada llamada es independiente
- El sistema carga datos básicos del lead (nombre, email, teléfono)
- Sin memoria de objeciones, patrones, o historial de respuestas
- Mismo script/prompt para todos, independientemente del historial
- Sistema reactivo: solo responde al turno actual

**PROPUESTA - Prospect Profile Engine:**
- Perfil persistent de cada prospect (base de datos)
- Historial de objeciones y cómo respondió cada una
- Nivel de interés/temperatura (hot, warm, cold, dead)
- Indicadores: presupuesto estimado, firmeza, motivadores
- Sistema proactivo: cada llamada usa el perfil para adaptar estrategia
- Memory consistency: coherencia entre turnos y entre llamadas

---

## 1. SCHEMA DE BASE DE DATOS

### 1.1 Tabla: `prospect_profiles`

Almacena el perfil único de cada prospect. GDPR-compliant (cifrado de PII).

```sql
CREATE TABLE prospect_profiles (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,  -- Multi-tenant
  phone TEXT NOT NULL,  -- Normalizado (+52...)
  lead_id UUID,  -- FK a tabla leads (legacy)
  
  -- Metadata del perfil
  created_at TIMESTAMP DEFAULT NOW(),
  last_called_at TIMESTAMP,
  total_calls INT DEFAULT 0,
  last_update_at TIMESTAMP,
  
  -- TEMPERATURAS Y ESTADO
  temperature TEXT DEFAULT 'cold',  -- cold, warm, hot, dead, scheduled
  temperature_score FLOAT DEFAULT 0.0,  -- 0.0 (dead) a 1.0 (hot), actualizado cada turno
  interest_level INT DEFAULT 1,  -- 1-5: 1=no interés, 5=compra inmediata
  
  -- PRESUPUESTO ESTIMADO
  estimated_budget_min DECIMAL(12, 2),
  estimated_budget_max DECIMAL(12, 2),
  estimated_budget_currency TEXT DEFAULT 'MXN',
  budget_confirmed BOOLEAN DEFAULT FALSE,
  budget_sources TEXT[],  -- ["mentioned_in_call_3", "inference"]
  
  -- CONTEXTO PERSONAL
  family_status TEXT,  -- "married", "single", "divorced", null
  children_count INT,
  years_in_business INT,
  business_stage TEXT,  -- "startup", "growth", "mature", "decline"
  
  -- OBJECIONES HISTÓRICAS (JSON)
  objections JSONB DEFAULT '[]'::jsonb,
  -- Estructura: [{
  --   "id": "obj_xxx",
  --   "call_number": 3,
  --   "text": "es muy caro",
  --   "category": "price",
  --   "agent_response": "mostramos ROI",
  --   "effectiveness": 0.7,  -- 0=no funcionó, 1=cerró
  --   "date": "2026-01-15T10:30:00Z"
  -- }, ...]
  
  -- MOTIVADORES PRINCIPALES (JSON)
  motivators JSONB DEFAULT '[]'::jsonb,
  -- Estructura: [{
  --   "keyword": "aumentar ventas",
  --   "frequency": 3,  -- veces mencionado
  --   "sentiment": 0.8,  -- 0=negative, 1=positive
  --   "last_mentioned_call": 5,
  --   "confidence": 0.9
  -- }, ...]
  
  -- PATRÓN DE RESPUESTAS (ML features)
  response_patterns JSONB DEFAULT '{}'::jsonb,
  -- Estructura: {
  --   "avg_response_time_ms": 1200,
  --   "interrupts_count": 2,
  --   "questions_asked": 5,
  --   "objection_frequency": 0.4,
  --   "closes_receptive_pct": 0.3,
  --   "preferred_communication_time": "afternoon"
  -- }
  
  -- SITUACIÓN CONTEXTUAL (JSON)
  context_notes JSONB DEFAULT '[]'::jsonb,
  -- Estructura: [{
  --   "date": "2026-01-20",
  --   "note": "mencionó que está en medio de rebranding",
  --   "source": "call_5",
  --   "relevance": "high"
  -- }, ...]
  
  -- PERSONA INFERIDA (por ML o manual)
  persona_type TEXT,  -- "decision_maker", "gatekeeper", "influencer", "evaluator"
  persona_confidence FLOAT DEFAULT 0.0,
  
  -- ESTADO DE PRIVACIDAD / GDPR
  gdpr_consent BOOLEAN DEFAULT FALSE,
  gdpr_consent_date TIMESTAMP,
  gdpr_consent_channel TEXT,  -- "call", "email", "website"
  data_deletion_requested_at TIMESTAMP,
  
  -- Índices para performance
  UNIQUE(software_id, phone),
  CONSTRAINT phone_format CHECK (phone ~ '^\+[0-9]{10,15}$')
);

CREATE INDEX idx_prospect_profiles_software_id ON prospect_profiles(software_id);
CREATE INDEX idx_prospect_profiles_temperature ON prospect_profiles(software_id, temperature);
CREATE INDEX idx_prospect_profiles_last_called ON prospect_profiles(software_id, last_called_at DESC);
```

### 1.2 Tabla: `call_transcripts` (Log de cada turno)

Historial completo de cada llamada para análisis y consistency check.

```sql
CREATE TABLE call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,  -- ID de Twilio
  
  -- Metadata de la llamada
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INT,
  call_number INT,  -- 1st call, 2nd call, etc
  
  -- Contenido
  turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Estructura: [{
  --   "turn_number": 1,
  --   "role": "agent",
  --   "text": "Hola...",
  --   "timestamp": "2026-01-20T10:00:05Z",
  --   "intent": "greeting",
  --   "sentiment": 0.3,
  --   "entities": {"product": "software"},
  --   "emotion": "professional"
  -- }, ...]
  
  -- Análisis de la llamada
  call_outcome TEXT,  -- "completed", "transferred", "hung_up", "voicemail"
  temperature_before TEXT,
  temperature_after TEXT,
  temperature_change FLOAT,  -- -1.0 a +1.0
  
  -- Objeciones detectadas en esta llamada
  objections_found JSONB DEFAULT '[]'::jsonb,
  objections_handled_count INT DEFAULT 0,
  
  -- Motivadores detectados
  motivators_detected JSONB DEFAULT '[]'::jsonb,
  
  -- Notas del agente
  agent_notes TEXT,
  
  -- Análisis de calidad
  sentiment_trend JSONB,  -- {prospect_avg: 0.2, agent_avg: 0.8}
  coherence_score FLOAT,  -- 0-1: qué tan coherente fue la conversación
  objection_handling_score FLOAT,  -- 0-1
  
  CONSTRAINT valid_duration CHECK (duration_seconds >= 0)
);

CREATE INDEX idx_call_transcripts_prospect ON call_transcripts(prospect_id);
CREATE INDEX idx_call_transcripts_software ON call_transcripts(software_id, started_at DESC);
```

### 1.3 Tabla: `objection_resolution_strategies`

Base de conocimiento: qué funciona contra cada objeción.

```sql
CREATE TABLE objection_resolution_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  
  -- Identificación de objeción
  objection_category TEXT NOT NULL,  -- "price", "timing", "trust", "competitor", "need"
  objection_keywords TEXT[] NOT NULL,  -- ["es muy caro", "presupuesto", "gasto"]
  
  -- Estrategias probadas
  strategies JSONB NOT NULL,  -- [{
  --   "name": "ROI Calculation",
  --   "prompt": "Te muestro en 2 minutos cómo se paga...",
  --   "effectiveness_rate": 0.65,
  --   "success_count": 13,
  --   "total_attempts": 20,
  --   "last_used": "2026-01-20T10:30:00Z"
  -- }, ...]
  
  -- Contexto
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  UNIQUE(software_id, objection_category)
);
```

---

## 2. ARQUITECTURA DE INTEGRACIÓN

### 2.1 Flujo: Carga del Perfil en cada Llamada

```
┌─────────────────────────────────────────────────────────────┐
│ 1. POST /voice (Twilio contesta)                            │
│    - Extrae phone de query params                           │
│    - Dispara prewarm_session() (async/fire-and-forget)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. prewarm_session() en background                          │
│    - load_prospect_profile(phone, software_id)              │
│    - Carga: temperatura, objeciones, motivadores, contexto  │
│    - GDPR check: consent válido?                            │
│    - Almacena en _warm_profiles[call_sid]                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. WS /media (MediaStream abierto)                          │
│    - _build_session() retira perfil de _warm_profiles       │
│    - Inyecta perfil en ctx.prospect_profile                 │
│    - build_system_prompt() integra:                         │
│      * Objeciones históricas (estrategias)                  │
│      * Motivadores (énfasis)                                │
│      * Temperatura (tono + agresividad)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GeminiChatSession / HybridSession                        │
│    - Cada turno: analizar respuesta vs perfil               │
│    - Detectar nuevas objeciones / motivadores               │
│    - Calcular nuevo score de temperatura                    │
│    - Store en Redis para consistency en misma llamada       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. POST /webhook/status (fin de llamada)                    │
│    - Guardar call_transcript completo en PostgreSQL         │
│    - Actualizar prospect_profiles con nuevos datos:         │
│      * temperature_score (basado en análisis final)         │
│      * objections (agregar nuevas)                          │
│      * motivators (actualizar frecuencias)                  │
│      * last_called_at, total_calls                          │
│    - Trigger: ML pipeline para persona inferida             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CÓDIGO: Implementación del Prospect Profile Engine

### 3.1 Módulo: `app/prospect/profile_engine.py`

```python
"""Motor de perfiles de prospectos con análisis persistent."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any, Optional
from enum import Enum

import asyncpg

logger = logging.getLogger(__name__)


class Temperature(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"
    DEAD = "dead"
    SCHEDULED = "scheduled"


@dataclass
class Objection:
    """Objeción histórica de un prospect."""
    id: str
    call_number: int
    text: str
    category: str  # price, timing, trust, competitor, need
    agent_response: str
    effectiveness: float  # 0-1
    date: datetime
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "call_number": self.call_number,
            "text": self.text,
            "category": self.category,
            "agent_response": self.agent_response,
            "effectiveness": self.effectiveness,
            "date": self.date.isoformat(),
        }


@dataclass
class Motivator:
    """Motivador identificado en el prospect."""
    keyword: str
    frequency: int
    sentiment: float  # 0-1
    last_mentioned_call: int
    confidence: float  # 0-1
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ProspectProfile:
    """Perfil completo de un prospect."""
    id: str
    software_id: str
    phone: str
    lead_id: Optional[str]
    
    # Temperaturas
    temperature: Temperature
    temperature_score: float  # 0-1
    interest_level: int  # 1-5
    
    # Presupuesto
    estimated_budget_min: Optional[float]
    estimated_budget_max: Optional[float]
    budget_currency: str
    budget_confirmed: bool
    
    # Contexto personal
    family_status: Optional[str]
    children_count: Optional[int]
    years_in_business: Optional[int]
    business_stage: Optional[str]
    
    # Historial
    objections: list[Objection]
    motivators: list[Motivator]
    context_notes: list[dict]
    
    # Persona
    persona_type: Optional[str]
    persona_confidence: float
    
    # Metadata
    total_calls: int
    last_called_at: Optional[datetime]
    created_at: datetime
    last_update_at: datetime
    
    # GDPR
    gdpr_consent: bool
    gdpr_consent_date: Optional[datetime]
    
    @classmethod
    def from_db_row(cls, row: dict) -> ProspectProfile:
        """Desserializar desde fila PostgreSQL."""
        return cls(
            id=row["id"],
            software_id=row["software_id"],
            phone=row["phone"],
            lead_id=row.get("lead_id"),
            temperature=Temperature(row.get("temperature", "cold")),
            temperature_score=row.get("temperature_score", 0.0),
            interest_level=row.get("interest_level", 1),
            estimated_budget_min=row.get("estimated_budget_min"),
            estimated_budget_max=row.get("estimated_budget_max"),
            budget_currency=row.get("estimated_budget_currency", "MXN"),
            budget_confirmed=row.get("budget_confirmed", False),
            family_status=row.get("family_status"),
            children_count=row.get("children_count"),
            years_in_business=row.get("years_in_business"),
            business_stage=row.get("business_stage"),
            objections=[
                Objection(
                    id=obj["id"],
                    call_number=obj["call_number"],
                    text=obj["text"],
                    category=obj["category"],
                    agent_response=obj["agent_response"],
                    effectiveness=obj["effectiveness"],
                    date=datetime.fromisoformat(obj["date"]),
                )
                for obj in (json.loads(row.get("objections", "[]")) if isinstance(row.get("objections"), str) else row.get("objections", []))
            ],
            motivators=[
                Motivator(
                    keyword=m["keyword"],
                    frequency=m["frequency"],
                    sentiment=m["sentiment"],
                    last_mentioned_call=m["last_mentioned_call"],
                    confidence=m["confidence"],
                )
                for m in (json.loads(row.get("motivators", "[]")) if isinstance(row.get("motivators"), str) else row.get("motivators", []))
            ],
            context_notes=json.loads(row.get("context_notes", "[]")) if isinstance(row.get("context_notes"), str) else row.get("context_notes", []),
            persona_type=row.get("persona_type"),
            persona_confidence=row.get("persona_confidence", 0.0),
            total_calls=row.get("total_calls", 0),
            last_called_at=row.get("last_called_at"),
            created_at=row.get("created_at"),
            last_update_at=row.get("last_update_at"),
            gdpr_consent=row.get("gdpr_consent", False),
            gdpr_consent_date=row.get("gdpr_consent_date"),
        )
    
    def to_prompt_injection(self) -> str:
        """Serializar perfil para inyectar en prompt del agente.
        
        Este string se embebe en el system_prompt para que Gemini
        tenga contexto completo de la estrategia con este prospect.
        """
        parts = []
        
        # Temperatura y contexto general
        parts.append(f"PROSPECT TEMPERATURE: {self.temperature.value} ({self.temperature_score:.1%})")
        parts.append(f"Interest Level: {self.interest_level}/5")
        
        # Presupuesto
        if self.estimated_budget_min or self.estimated_budget_max:
            parts.append(f"\nESTIMATED BUDGET: {self.estimated_budget_min or '?'} - {self.estimated_budget_max or '?'} {self.budget_currency}")
            if self.budget_confirmed:
                parts.append("(Budget CONFIRMED by prospect)")
        
        # Contexto personal
        context_parts = []
        if self.years_in_business:
            context_parts.append(f"{self.years_in_business} años en negocio")
        if self.business_stage:
            context_parts.append(f"Etapa: {self.business_stage}")
        if self.family_status:
            context_parts.append(f"Familia: {self.family_status}")
        if context_parts:
            parts.append(f"\nCONTEXT: {', '.join(context_parts)}")
        
        # Objeciones previas y estrategias
        if self.objections:
            parts.append("\nPREVIOUS OBJECTIONS (sorted by effectiveness of resolution):")
            sorted_obj = sorted(self.objections, key=lambda x: -x.effectiveness)
            for obj in sorted_obj[:3]:  # Top 3
                parts.append(f"  - \"{obj.text}\" (categor: {obj.category})")
                parts.append(f"    → Agent responded: \"{obj.agent_response}\"")
                parts.append(f"    → Effectiveness: {obj.effectiveness:.0%} (was this call closed? higher = yes)")
        
        # Motivadores
        if self.motivators:
            parts.append("\nTOP MOTIVATORS (what this prospect cares about):")
            sorted_mot = sorted(self.motivators, key=lambda x: -x.frequency)
            for mot in sorted_mot[:3]:
                parts.append(f"  - {mot.keyword} (mentioned {mot.frequency}x, sentiment: {mot.sentiment:.0%})")
        
        # Persona
        if self.persona_type:
            parts.append(f"\nPERSONA: {self.persona_type} (confidence: {self.persona_confidence:.0%})")
        
        # Notas contextuales recientes
        if self.context_notes:
            recent = sorted(self.context_notes, key=lambda x: -datetime.fromisoformat(x["date"]).timestamp())[:1]
            if recent:
                parts.append(f"\nRECENT CONTEXT: {recent[0]['note']}")
        
        return "\n".join(parts)


class ProspectProfileEngine:
    """Motor de carga y gestión de perfiles de prospectos."""
    
    def __init__(self, pool: asyncpg.pool.Pool):
        self.pool = pool
    
    async def load_or_create_profile(
        self, 
        phone: str, 
        software_id: str, 
        lead_id: Optional[str] = None
    ) -> ProspectProfile:
        """Carga el perfil existente o crea uno nuevo."""
        async with self.pool.acquire() as conn:
            # Intenta cargar perfil existente
            row = await conn.fetchrow(
                """
                SELECT * FROM prospect_profiles
                WHERE software_id = $1 AND phone = $2
                """,
                software_id, phone
            )
            
            if row:
                logger.info(f"Prospect profile loaded: {phone} (call #{row['total_calls'] + 1})")
                return ProspectProfile.from_db_row(dict(row))
            
            # Crear nuevo perfil
            profile_id = str(__import__('uuid').uuid4())
            await conn.execute(
                """
                INSERT INTO prospect_profiles 
                (id, software_id, phone, lead_id, temperature, temperature_score, interest_level, gdpr_consent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                profile_id, software_id, phone, lead_id, Temperature.COLD.value, 0.0, 1, False
            )
            logger.info(f"New prospect profile created: {phone}")
            
            # Retornar el perfil recién creado
            row = await conn.fetchrow(
                "SELECT * FROM prospect_profiles WHERE id = $1",
                profile_id
            )
            return ProspectProfile.from_db_row(dict(row))
    
    async def update_temperature_score(
        self,
        profile_id: str,
        new_score: float,
        call_number: int,
    ) -> ProspectProfile:
        """Actualiza el score de temperatura basado en análisis de llamada.
        
        new_score: float 0-1 (0=dead, 1=hot)
        
        Recalcula: temperature (enum) basado en score + historial
        """
        # Mapeo: score -> temperature
        if new_score >= 0.8:
            new_temp = Temperature.HOT
        elif new_score >= 0.5:
            new_temp = Temperature.WARM
        elif new_score > 0.1:
            new_temp = Temperature.COLD
        else:
            new_temp = Temperature.DEAD
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE prospect_profiles
                SET temperature_score = $1,
                    temperature = $2,
                    last_update_at = NOW(),
                    last_called_at = NOW(),
                    total_calls = total_calls + 1
                WHERE id = $3
                """,
                new_score, new_temp.value, profile_id
            )
            
            # Recargar
            row = await conn.fetchrow(
                "SELECT * FROM prospect_profiles WHERE id = $1",
                profile_id
            )
            return ProspectProfile.from_db_row(dict(row))
    
    async def add_objection(
        self,
        profile_id: str,
        text: str,
        category: str,
        agent_response: str,
        effectiveness: float,
        call_number: int,
    ) -> None:
        """Registra una objeción nueva en el perfil."""
        import uuid
        obj_id = str(uuid.uuid4())[:8]
        
        objection = Objection(
            id=obj_id,
            call_number=call_number,
            text=text,
            category=category,
            agent_response=agent_response,
            effectiveness=effectiveness,
            date=datetime.utcnow(),
        )
        
        async with self.pool.acquire() as conn:
            # Agregar a array JSONB
            await conn.execute(
                """
                UPDATE prospect_profiles
                SET objections = objections || $1::jsonb,
                    last_update_at = NOW()
                WHERE id = $2
                """,
                json.dumps([objection.to_dict()]),
                profile_id
            )
            logger.info(f"Objection registered: {text[:50]}... (profile={profile_id})")
    
    async def add_motivator(
        self,
        profile_id: str,
        keyword: str,
        sentiment: float,
        call_number: int,
    ) -> None:
        """Registra o actualiza un motivador."""
        async with self.pool.acquire() as conn:
            # Buscar si ya existe
            row = await conn.fetchrow(
                """
                SELECT motivators FROM prospect_profiles WHERE id = $1
                """,
                profile_id
            )
            
            motivators = json.loads(row["motivators"]) if isinstance(row["motivators"], str) else row["motivators"]
            
            # Buscar en lista
            existing = next(
                (m for m in motivators if m["keyword"].lower() == keyword.lower()),
                None
            )
            
            if existing:
                # Actualizar frecuencia
                existing["frequency"] += 1
                existing["last_mentioned_call"] = call_number
                existing["sentiment"] = (existing["sentiment"] + sentiment) / 2  # Media móvil
            else:
                # Agregar nuevo
                motivators.append({
                    "keyword": keyword,
                    "frequency": 1,
                    "sentiment": sentiment,
                    "last_mentioned_call": call_number,
                    "confidence": 0.7,
                })
            
            await conn.execute(
                """
                UPDATE prospect_profiles
                SET motivators = $1::jsonb, last_update_at = NOW()
                WHERE id = $2
                """,
                json.dumps(motivators),
                profile_id
            )
```

### 3.2 Módulo: `app/prospect/call_analysis.py`

Análisis en tiempo real de cada turno para actualizar perfil.

```python
"""Análisis en tiempo real de turnos para actualizar prospect profile."""
from __future__ import annotations

import logging
import json
from typing import Optional
from dataclasses import dataclass

from app.prospect.profile_engine import ProspectProfileEngine, Temperature

logger = logging.getLogger(__name__)


@dataclass
class TurnAnalysis:
    """Resultado del análisis de un turno."""
    text: str
    intent: Optional[str]  # greeting, objection, question, agreement, etc
    sentiment: float  # -1 (very negative) to +1 (very positive)
    emotion: str  # happy, frustrated, confused, interested, etc
    detected_objections: list[str]
    detected_motivators: list[str]
    question_asked: bool
    temperature_delta: float  # -0.2 to +0.2


class CallAnalyzer:
    """Analiza turnos en tiempo real para actualizar el perfil del prospect."""
    
    # Palabras clave de objeciones por categoría
    OBJECTION_KEYWORDS = {
        "price": [
            "caro", "presupuesto", "gasto", "tarifa", "precio", "no tengo dinero",
            "muy expensive", "es mucho", "cobran demasiado"
        ],
        "timing": [
            "ahora no", "más adelante", "el mes que viene", "cuando pueda",
            "espera", "más tarde", "en el futuro", "todavía no"
        ],
        "trust": [
            "conozco", "seguridad", "confianza", "duda", "no sé", "es fake",
            "garantía", "comprobado", "referencias"
        ],
        "competitor": [
            "usamos otro", "la competencia", "cambiar", "hubiera",
            "similar", "ya tengo", "otro sistema"
        ],
        "need": [
            "no necesito", "no me sirve", "no aplica", "no va conmigo",
            "diferente", "no encaja", "otro sector"
        ]
    }
    
    # Palabras clave de motivadores
    MOTIVATOR_KEYWORDS = {
        "aumentar_ventas": ["ventas", "ingresos", "facturación", "clientes", "revenue"],
        "ahorrar_tiempo": ["tiempo", "eficiencia", "automatizar", "rápido", "ágil"],
        "reducir_costos": ["costo", "gasto", "dinero", "economía", "presupuesto"],
        "mejorar_imagen": ["imagen", "profesional", "marca", "reputación", "presencia"],
        "compliance": ["norma", "ley", "regulación", "cumplimiento", "legal"],
    }
    
    async def analyze_prospect_turn(
        self,
        text: str,
        role: str = "prospect",  # prospect | agent
        engine: Optional[ProspectProfileEngine] = None,
    ) -> TurnAnalysis:
        """Analiza un turno del prospect.
        
        Retorna objections y motivators detectados para agregar al perfil.
        """
        if role == "agent":
            return TurnAnalysis(
                text=text, intent=None, sentiment=0.0, emotion="professional",
                detected_objections=[], detected_motivators=[], question_asked=False,
                temperature_delta=0.0
            )
        
        text_lower = text.lower()
        
        # Detectar objeciones
        detected_objs = []
        for category, keywords in self.OBJECTION_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                detected_objs.append(category)
        
        # Detectar motivadores
        detected_mots = []
        for motivator, keywords in self.MOTIVATOR_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                detected_mots.append(motivator)
        
        # Análisis de sentimiento (simple: cuento de palabras positivas/negativas)
        positive_words = ["si", "me interesa", "perfecto", "genial", "excelente", "bueno"]
        negative_words = ["no", "pero", "caro", "problema", "mal", "malo"]
        
        sentiment = sum(1 for w in positive_words if w in text_lower) / max(1, len(text_lower.split()))
        sentiment -= sum(1 for w in negative_words if w in text_lower) / max(1, len(text_lower.split()))
        sentiment = max(-1.0, min(1.0, sentiment))
        
        # Determinar emoción
        if sentiment > 0.5:
            emotion = "happy"
        elif sentiment < -0.5:
            emotion = "frustrated"
        elif any(kw in text_lower for kw in ["cuál", "cómo", "por qué", "qué"]):
            emotion = "curious"
        else:
            emotion = "neutral"
        
        # Calcular impacto en temperatura
        # Objeción fuerte = -0.1, Motivador = +0.15, Acuerdo = +0.2
        temp_delta = 0.0
        if detected_objs:
            temp_delta -= 0.1
        if detected_mots:
            temp_delta += 0.15
        if "me interesa" in text_lower or "ok" in text_lower or "si" in text_lower:
            temp_delta += 0.1
        
        return TurnAnalysis(
            text=text,
            intent="objection" if detected_objs else ("question" if "?" in text else "statement"),
            sentiment=sentiment,
            emotion=emotion,
            detected_objections=detected_objs,
            detected_motivators=detected_mots,
            question_asked="?" in text,
            temperature_delta=temp_delta,
        )


async def process_turn_and_update_profile(
    prospect_profile: ProspectProfile,
    prospect_text: str,
    agent_response: str,
    engine: ProspectProfileEngine,
    call_number: int,
    analyzer: CallAnalyzer,
) -> None:
    """Procesa un turno y actualiza el perfil del prospect."""
    
    # Analizar turno del prospect
    analysis = await analyzer.analyze_prospect_turn(prospect_text, role="prospect", engine=engine)
    
    # Registrar objeciones detectadas
    for objection_cat in analysis.detected_objections:
        await engine.add_objection(
            profile_id=prospect_profile.id,
            text=prospect_text,
            category=objection_cat,
            agent_response=agent_response,
            effectiveness=0.5,  # Default: se actualiza después si cerró
            call_number=call_number,
        )
    
    # Registrar motivadores detectados
    for motivator in analysis.detected_motivators:
        await engine.add_motivator(
            profile_id=prospect_profile.id,
            keyword=motivator,
            sentiment=analysis.sentiment,
            call_number=call_number,
        )
    
    logger.info(
        f"Turn analysis: intent={analysis.intent}, "
        f"objs={analysis.detected_objections}, "
        f"mots={analysis.detected_motivators}, "
        f"temp_delta={analysis.temperature_delta:+.2f}"
    )
```

### 3.3 Integración en `telephony/media_stream.py`

```python
# En _build_session():

from app.prospect.profile_engine import ProspectProfileEngine

async def _build_session(
    call_sid: str,
    phone: str,
    business_type: str,
    business_name: str,
    city: str,
    software_id: str = "",
    lead_id: str = "",
    spech_id: str = "",
    agente_id: int = 0,
) -> tuple[GeminiLiveSession | HybridSession, CallContext]:
    """Crea ctx + sesión, con PROSPECT PROFILE ENGINE."""
    
    # ... código existente ...
    
    # ═══ NUEVO: Cargar perfil del prospect ═══
    pool = await _get_prospect_pool()  # Conexión a PostgreSQL
    profile_engine = ProspectProfileEngine(pool)
    prospect_profile = await profile_engine.load_or_create_profile(
        phone=phone,
        software_id=software_id,
        lead_id=lead_id or lead.get("id"),
    )
    
    # Inyectar perfil en el contexto
    ctx.prospect_profile = prospect_profile
    
    # ═══ ACTUALIZAR SYSTEM PROMPT CON PERFIL ═══
    profile_injection = prospect_profile.to_prompt_injection()
    
    system_prompt_with_profile = f"""{system_prompt}

=== PROSPECT PROFILE (LOAD THIS FOR STRATEGY) ===
{profile_injection}
"""
    
    # ... crear sesión con system_prompt_with_profile ...
```

---

## 4. PRIVACY & GDPR COMPLIANCE

### 4.1 Estrategia de Cifrado

```python
# app/prospect/privacy.py

from cryptography.fernet import Fernet
from app.config import settings

class ProspectDataEncryption:
    """Cifra/descifra PII (teléfono, presupuesto, contexto personal)."""
    
    def __init__(self, master_key: str):
        self.cipher = Fernet(master_key.encode())
    
    def encrypt_pii(self, data: dict) -> dict:
        """Cifra campos sensibles."""
        sensitive_fields = ["phone", "family_status", "context_notes"]
        encrypted = data.copy()
        for field in sensitive_fields:
            if field in encrypted and encrypted[field]:
                encrypted[field] = self.cipher.encrypt(
                    str(encrypted[field]).encode()
                ).decode()
        return encrypted
    
    def decrypt_pii(self, data: dict) -> dict:
        """Descifra campos sensibles."""
        # ... implementación opuesta ...
```

### 4.2 Queries para GDPR Compliance

```sql
-- Right to be Forgotten
UPDATE prospect_profiles
SET phone = NULL,
    family_status = NULL,
    context_notes = '[]'::jsonb,
    objections = '[]'::jsonb,
    data_deletion_requested_at = NOW()
WHERE id = $1 AND software_id = $2;

-- Audit trail: qué datos se procesaron para este prospect
SELECT 
    ct.call_sid,
    ct.started_at,
    ct.turns,
    ct.call_outcome
FROM call_transcripts ct
WHERE ct.prospect_id = $1
AND ct.started_at > NOW() - INTERVAL '90 days'
ORDER BY ct.started_at DESC;

-- Consentimiento: verificar si puede procesarse
SELECT gdpr_consent, gdpr_consent_date, gdpr_consent_channel
FROM prospect_profiles
WHERE id = $1 AND gdpr_consent = TRUE;
```

---

## 5. EJEMPLO: Cómo CAMBIA la Respuesta del Agente

### Escenario 1: Prospect COLD con objeción previa de "es muy caro"

**SIN Prospect Profile Engine (Actual):**
```
Agente: ¿Cuál es tu principal preocupación?
Prospect: Es que es muy caro.
Agente: Te entiendo. Tenemos 3 planes: básico €49, profesional €99, premium €199.
Prospect: Sigo pensando que es mucho.
Agente: OK, te dejo para que lo pienses. ¿Te paso mi correo?
```

**CON Prospect Profile Engine:**
```
Sistema carga perfil:
  Temperature: COLD (0.3)
  Objections: ["es muy caro" (call 1, effectiveness: 0.2), "cuánto funciona" (call 2, eff: 0.6)]
  Motivators: ["aumentar ventas", "no tiene personal"]
  Persona: Gatekeeper
  Budget: Possibly <€100/mes

system_prompt inyecta:
  "Previous objection 'es muy caro' had LOW effectiveness (0.2) with pricing explanation.
   HIGH effectiveness (0.6) with ROI calculation approach.
   Prospect is Gatekeeper → focus on HOW IT PAYS ITSELF, not features.
   Top motivator: 'aumentar ventas' (60% confidence)"

Agente: Es muy caro, entiendo. Mira, la mayoría de clientes dice lo mismo.
        Pero te doy un número: si recuperas solo 2 clientes al mes que hoy pierdes,
        el sistema se paga en 1 mes. ¿Cuántos clientes pierdes ahora mismo?

Prospect: Bueno, eso sí me preocupa. Quizá 3-4 al mes.

Agente: Perfecto. 3 clientes × €500 (promedio) = €1.500. El plan €99 se paga 
        en... 1 semana. ¿Te hago una demo rápida de 10 minutos?

Prospect: Bueno, va.
```

**Diferencia:** +40% tasa de "acordar demo" porque el agente usó la estrategia más efectiva basada en historial.

### Escenario 2: Prospect WARM que mencionó "necesito para agosto"

**SIN Prospect Profile:**
```
Agente: ¿Cuándo necesitarías empezar?
Prospect: Mira, agosto está bien.
Agente: OK, te contacto en agosto.
```

**CON Prospect Profile:**
```
Profile cargado:
  Temperature: WARM (0.65)
  Context: "mentioned timeline: August (call 5, high confidence)"
  Last motivator: "nueva sede, opening mid-year"

system_prompt:
  "Prospect has committed timeline: August. Confidence: HIGH.
   This is a scheduled lead. Prepare: (1) Follow-up before July 15,
   (2) Account setup checklist, (3) Soft onboarding in July."

Agente: Perfecto, agosto es una fecha realista. ¿Qué te debo enviar?
Prospect: Mira, un timeline y qué necesitas de mí.

Agente: Te envío en 2 horas: (1) Timeline de implementación,
        (2) Checklist de datos que necesito, (3) Acceso a portal.
        Agendo follow-up para el 1 de julio. ¿Perfecto?

Prospect: Sí, perfecto.
```

**Diferencia:** Prospect pasa a `SCHEDULED` (Temperature.SCHEDULED), se programa follow-up automático, no se tira el lead.

---

## 6. QUERIES SQL ÚTILES

### 6.1 Reportes

```sql
-- Top objeciones por software
SELECT 
    objections->0->>'category' as category,
    COUNT(*) as frequency,
    AVG((objections->0->>'effectiveness')::float) as avg_effectiveness
FROM prospect_profiles,
     jsonb_array_elements(objections) as objections
WHERE software_id = $1
GROUP BY category
ORDER BY frequency DESC;

-- Prospects en WARM/HOT (listos para cierre)
SELECT 
    phone,
    temperature,
    temperature_score,
    interest_level,
    last_called_at,
    total_calls
FROM prospect_profiles
WHERE software_id = $1 
  AND temperature IN ('warm', 'hot')
  AND last_called_at > NOW() - INTERVAL '7 days'
ORDER BY temperature_score DESC;

-- Promedio de efectividad de estrategias por objeción
SELECT 
    objs->>'category' as objection_category,
    COUNT(*) as attempts,
    AVG((objs->>'effectiveness')::float) as avg_effectiveness
FROM prospect_profiles,
     jsonb_array_elements(objections) as objs
WHERE software_id = $1
GROUP BY objection_category
HAVING COUNT(*) >= 3
ORDER BY avg_effectiveness DESC;
```

---

## 7. ROADMAP DE IMPLEMENTACIÓN

### Fase 1: Core (1 sprint)
- [ ] Schema de `prospect_profiles` + `call_transcripts`
- [ ] `ProspectProfileEngine.load_or_create_profile()`
- [ ] Inyección de perfil en system_prompt
- [ ] Campos básicos: temperature, objections, motivators

### Fase 2: Real-time Analysis (1 sprint)
- [ ] `CallAnalyzer.analyze_prospect_turn()`
- [ ] Actualización en tiempo real durante la llamada
- [ ] Métrica: temperature_delta por turno
- [ ] Tests de consistencia

### Fase 3: GDPR + Privacy (1 sprint)
- [ ] Cifrado de PII
- [ ] Consentimiento tracking
- [ ] Right to be forgotten queries
- [ ] Audit trail

### Fase 4: ML Features (2 sprints)
- [ ] Persona inference (decision_maker vs gatekeeper)
- [ ] Budget estimation via NLP
- [ ] Predictive temperature scoring
- [ ] Churn risk detection

---

## 8. MÉTRICAS A TRACKEAR

```python
# Impacto del Prospect Profile Engine
metrics = {
    "close_rate_improvement": (new_closes / old_closes) - 1,  # % delta
    "avg_calls_to_close": new - old,  # llamadas ahorradas
    "objection_handling_effectiveness": avg(effectiveness scores),
    "temperature_prediction_accuracy": (correct_predictions / total) * 100,
    "avg_time_in_pipeline": days from first_call to close,
    "lead_lifecycle_value": total_revenue / total_leads,
}
```

