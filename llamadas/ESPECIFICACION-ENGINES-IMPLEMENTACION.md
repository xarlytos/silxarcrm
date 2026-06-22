# WINNING ARGUMENTS + OBJECTION INTELLIGENCE ENGINES
## Especificación Técnica + Código Base

**Target:** Incrementar close rate 14-16pp via data-driven conversation intelligence  
**Timeline:** 12 semanas (Phase 1) → Full deployment  
**Status:** Ready to implement  

---

## PARTE 1: DATA LAYER (Semanas 1-3)

### 1.1 Schema SQL - Momento Crítico (Nueva)

```sql
-- Tabla: call_moments (extrae cada momento de conversación)
CREATE TABLE call_moments (
    id BIGSERIAL PRIMARY KEY,
    call_id TEXT NOT NULL,
    turn_number INT NOT NULL,
    speaker TEXT NOT NULL, -- 'agent' | 'prospect'
    text TEXT NOT NULL,
    
    -- Clasificación
    moment_type TEXT, -- 'argument_used' | 'objection' | 'signal' | 'outcome'
    argument_used TEXT, -- "Automatizamos 80%" si es argumento
    objection_type TEXT, -- "es_caro", "ya_tenemos", etc
    signal_type TEXT, -- "interest", "confusion", "frustration"
    
    -- Contexto
    stage TEXT NOT NULL, -- 'saludo', 'discovery', 'solution_aware', etc
    emotion TEXT, -- 'interesado', 'molesto', 'neutro'
    confidence FLOAT, -- 0.0-1.0, qué tan seguro estamos
    
    -- Outcome (si es último turno)
    call_outcome TEXT, -- 'closed', 'demo_booked', 'followup', 'rejected', 'no_decision'
    
    -- Meta
    agent_id TEXT,
    prospect_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_call_moments_call_id ON call_moments(call_id);
CREATE INDEX idx_call_moments_moment_type ON call_moments(moment_type);
CREATE INDEX idx_call_moments_argument ON call_moments(argument_used);
CREATE INDEX idx_call_moments_objection ON call_moments(objection_type);

-- Tabla: winning_arguments (aggregated stats)
CREATE TABLE winning_arguments (
    id BIGSERIAL PRIMARY KEY,
    argument_text TEXT NOT NULL UNIQUE,
    segment_key TEXT NOT NULL, -- "tech_sme", "health_enterprise", etc
    
    -- Metrics
    total_uses INT DEFAULT 0,
    total_closes INT DEFAULT 0,
    close_rate FLOAT,
    
    -- Confidence
    sample_size INT DEFAULT 0,
    confidence FLOAT, -- sqrt(sample / (sample + 30))
    prediction_interval_low FLOAT,
    prediction_interval_high FLOAT,
    
    -- Trends
    trend TEXT DEFAULT 'stable', -- 'up', 'down', 'stable'
    win_rate_30d FLOAT, -- Last 30 days
    win_rate_90d FLOAT, -- Last 90 days
    
    -- Segments breakdown
    by_industry JSONB, -- {"tech": 0.89, "health": 0.71}
    by_company_size JSONB, -- {"sme": 0.88, "enterprise": 0.71}
    by_persona JSONB, -- {"cfo": 0.95, "ops": 0.72}
    
    -- Effectiveness
    best_stage TEXT, -- Stage where it's most effective
    average_position_in_call INT, -- Turn 4-6
    
    -- Meta
    first_used TIMESTAMP,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(argument_text, segment_key)
);

-- Tabla: objection_intelligence (deep objection understanding)
CREATE TABLE objection_intelligence (
    id BIGSERIAL PRIMARY KEY,
    stated_objection TEXT NOT NULL, -- "Es caro"
    root_cause TEXT, -- "Budget not approved", "Not convinced ROI", etc
    root_cause_confidence FLOAT,
    
    -- Severity
    severity TEXT, -- 'showstopper' | 'negotiable' | 'minor'
    abandonment_risk FLOAT, -- 0.0-1.0
    
    -- Metrics
    encountered_count INT DEFAULT 0,
    overcome_count INT DEFAULT 0,
    overcome_rate FLOAT,
    
    -- Best rebuttal (link to objection_rebuttals table)
    best_rebuttal_id BIGINT,
    
    -- Segments
    by_industry JSONB,
    by_persona JSONB,
    
    -- Trend
    trend TEXT DEFAULT 'stable',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: objection_rebuttals (how to overcome each objection)
CREATE TABLE objection_rebuttals (
    id BIGSERIAL PRIMARY KEY,
    objection_id BIGINT REFERENCES objection_intelligence(id),
    objection_type TEXT, -- "es_caro", "ya_tenemos", etc
    rebuttal_text TEXT NOT NULL, -- "ROI en 3 meses"
    
    -- Effectiveness
    success_rate FLOAT,
    sample_size INT,
    confidence FLOAT,
    
    -- Segments
    most_effective_in JSONB, -- {"tech": 0.91, "sme": 0.88}
    least_effective_in JSONB, -- {"health": 0.52}
    
    -- Personas
    works_with JSONB, -- ["CFO", "VP Sales"]
    works_poorly_with JSONB, -- ["Procurement"]
    
    -- Sequential
    follow_up_rebuttal_id BIGINT REFERENCES objection_rebuttals(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: competitor_mentions (track competitor landscape)
CREATE TABLE competitor_mentions (
    id BIGSERIAL PRIMARY KEY,
    call_id TEXT NOT NULL,
    competitor TEXT NOT NULL, -- "HubSpot", "Salesforce", etc
    mention_context TEXT, -- "Ya usamos HubSpot"
    mention_stage TEXT, -- 'discovery', 'solution_aware', etc
    prospect_sentiment TEXT, -- 'satisfied', 'frustrated', 'neutral'
    
    suggested_counter TEXT, -- Pre-built differentiation
    counter_effectiveness FLOAT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_competitor_mentions_competitor ON competitor_mentions(competitor);

-- Tabla: talk_track_variations (A/B test different phrasings)
CREATE TABLE talk_track_variations (
    id BIGSERIAL PRIMARY KEY,
    stage TEXT NOT NULL, -- 'solution_aware'
    intent TEXT NOT NULL, -- "Explain ROI", "Overcome price objection"
    
    variation_text TEXT NOT NULL,
    variation_order INT, -- 1st, 2nd, 3rd option
    
    -- Performance
    total_uses INT DEFAULT 0,
    total_closes INT DEFAULT 0,
    close_rate FLOAT,
    
    -- Segment performance
    by_industry JSONB,
    by_company_size JSONB,
    
    is_winner BOOLEAN DEFAULT FALSE,
    confidence FLOAT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 1.2 Post-Call Extraction Pipeline

**File: `llamadas/app/post_call/moment_extractor.py` (NEW)**

```python
"""Post-call extraction: capture moments, arguments, objections"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ExtractedMoment:
    """One critical moment from a call"""
    call_id: str
    turn_number: int
    speaker: str  # 'agent' | 'prospect'
    text: str
    
    # Classification
    moment_type: str  # 'argument_used' | 'objection' | 'signal'
    argument_used: str | None
    objection_type: str | None
    signal_type: str | None
    
    # Context
    stage: str
    emotion: str
    confidence: float
    
    # Outcome
    call_outcome: str | None
    
    # Meta
    agent_id: str
    prospect_id: str


class MomentExtractor:
    """Extract critical moments from transcripts using Gemini"""
    
    def __init__(self, db_client, gemini_client):
        self.db = db_client
        self.gemini = gemini_client
    
    async def extract_moments_from_call(
        self,
        call_id: str,
        transcript: str,
        stage_history: list[str],
        call_outcome: str,
        agent_id: str,
        prospect_id: str
    ) -> list[ExtractedMoment]:
        """
        Extract all critical moments from a call transcript.
        
        Input: Full call transcript with turns labeled [AGENT] / [PROSPECT]
        Output: List of moments with classification
        """
        
        moments = []
        
        # Parse transcript into turns
        turns = self._parse_transcript(transcript)
        
        # For each turn, classify
        for turn_idx, turn in enumerate(turns):
            if turn['speaker'] != 'agent':
                continue  # Only analyze agent moments (they contain arguments)
            
            # Classify this turn
            classification = await self._classify_turn(
                turn['text'],
                preceding_context="\n".join(t['text'] for t in turns[max(0, turn_idx-3):turn_idx]),
                stage=stage_history[min(turn_idx // 2, len(stage_history)-1)],  # Approx stage
            )
            
            # Create moment
            moment = ExtractedMoment(
                call_id=call_id,
                turn_number=turn_idx,
                speaker='agent',
                text=turn['text'],
                moment_type=classification.get('moment_type'),
                argument_used=classification.get('argument_used'),
                objection_type=classification.get('objection_type'),
                signal_type=classification.get('signal_type'),
                stage=stage_history[-1] if stage_history else 'unknown',
                emotion=classification.get('emotion', 'neutro'),
                confidence=classification.get('confidence', 0.5),
                call_outcome=call_outcome if turn_idx == len(turns) - 1 else None,
                agent_id=agent_id,
                prospect_id=prospect_id,
            )
            
            if moment.moment_type:
                moments.append(moment)
        
        # Save to DB
        await self._save_moments(moments)
        
        logger.info(f"Extracted {len(moments)} moments from call {call_id}")
        
        return moments
    
    async def _classify_turn(
        self,
        agent_text: str,
        preceding_context: str,
        stage: str
    ) -> dict:
        """
        Use Gemini to classify what the agent is doing in this turn.
        """
        
        from google.genai import types
        
        prompt = f"""Eres un clasificador de momentos de venta.
Analiza qué está haciendo el agente en este turno.

CONTEXTO (últimas 3 intervenciones):
{preceding_context}

TURNO DEL AGENTE:
"{agent_text}"

STAGE ACTUAL: {stage}

Responde ÚNICAMENTE con este JSON:
{{
  "moment_type": "argument_used|objection_handled|signal|other",
  "argument_used": "aquí el argumento principal o null",
  "objection_type": "tipo de objeción si se menciona o null",
  "signal_type": "tipo de señal verbal si aplica o null",
  "emotion": "emoción probable del prospect",
  "confidence": 0.0-1.0
}}

Ejemplos:
- "Mira, típicamente se recupera la inversión en 3 meses" → 
  {{"moment_type": "argument_used", "argument_used": "ROI en 3 meses", ...}}

- "Entiendo que es caro. Pero piensa en el ahorro anual" →
  {{"moment_type": "objection_handled", "objection_type": "es_caro", ...}}
"""
        
        try:
            resp = await self.gemini.aio.models.generate_content(
                model="gemini-2.5-pro",
                contents=[types.Content(parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=300,
                ),
            )
            
            raw = resp.text or "{}"
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw
            if raw.endswith("```"):
                raw = raw.rsplit("\n", 1)[0]
            
            return json.loads(raw)
        
        except Exception as exc:
            logger.warning(f"Classification error: {exc}")
            return {"moment_type": None}
    
    def _parse_transcript(self, transcript: str) -> list[dict]:
        """Parse transcript into [AGENT]/[PROSPECT] turns"""
        turns = []
        for line in transcript.split("\n"):
            if line.startswith("[AGENT]"):
                turns.append({"speaker": "agent", "text": line.replace("[AGENT]", "").strip()})
            elif line.startswith("[PROSPECT]"):
                turns.append({"speaker": "prospect", "text": line.replace("[PROSPECT]", "").strip()})
        return turns
    
    async def _save_moments(self, moments: list[ExtractedMoment]):
        """Save moments to Supabase"""
        for moment in moments:
            await self.db.insert('call_moments', {
                'call_id': moment.call_id,
                'turn_number': moment.turn_number,
                'speaker': moment.speaker,
                'text': moment.text,
                'moment_type': moment.moment_type,
                'argument_used': moment.argument_used,
                'objection_type': moment.objection_type,
                'signal_type': moment.signal_type,
                'stage': moment.stage,
                'emotion': moment.emotion,
                'confidence': moment.confidence,
                'call_outcome': moment.call_outcome,
                'agent_id': moment.agent_id,
                'prospect_id': moment.prospect_id,
            })
```

---

## PARTE 2: WINNING ARGUMENTS ENGINE (Semanas 4-6)

### 2.1 Real Data Pipeline (Replace Simulated)

**File: `llamadas/app/conversation_intelligence.py` - REPLACE**

```python
"""MEJORA 4: Conversation Intelligence Layer - REAL DATA VERSION"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class ArgumentInsight:
    """Insight sobre un argumento (REAL DATA)"""
    argument: str
    segment_key: str
    
    uses: int
    closes: int
    close_rate: float
    
    sample_size: int
    confidence: float
    prediction_interval: tuple[float, float]
    
    trend: str  # "up", "down", "stable"
    by_industry: dict  # {"tech": 0.89, "health": 0.71}


@dataclass
class ObjectionPlaybook:
    """Cómo manejar una objeción (REAL DATA)"""
    objection: str
    root_cause: str
    root_cause_confidence: float
    
    best_rebuttal: str
    overcome_rate: float
    
    times_encountered: int
    times_overcome: int
    
    by_industry: dict


class ConversationIntelligenceEngine:
    """Engine que aprende de TODAS las conversaciones (REAL DATA)"""
    
    def __init__(self, db_client):
        self.db = db_client
    
    async def build_winning_arguments_playbook(
        self,
        segment_key: str = "all",
        min_confidence: float = 0.70
    ) -> List[ArgumentInsight]:
        """
        Construir playbook de argumentos ganadores basado en DATOS REALES.
        
        NOT simulated. NOT hardcoded.
        Query actual a Supabase.
        """
        
        # Query Supabase para argumentos con close_rate real
        query = """
        SELECT 
            argument_text as argument,
            segment_key,
            total_uses as uses,
            total_closes as closes,
            close_rate,
            sample_size,
            confidence,
            prediction_interval_low,
            prediction_interval_high,
            trend,
            by_industry,
            by_company_size
        FROM winning_arguments
        WHERE confidence >= $1
        """
        
        params = [min_confidence]
        
        if segment_key != "all":
            query += " AND segment_key = $2"
            params.append(segment_key)
        
        query += " ORDER BY close_rate DESC LIMIT 20"
        
        try:
            result = await self.db.query(query, params)
            
            insights = []
            for row in result:
                insight = ArgumentInsight(
                    argument=row['argument'],
                    segment_key=row['segment_key'],
                    uses=row['uses'],
                    closes=row['closes'],
                    close_rate=row['close_rate'],
                    sample_size=row['sample_size'],
                    confidence=row['confidence'],
                    prediction_interval=(
                        row['prediction_interval_low'],
                        row['prediction_interval_high']
                    ),
                    trend=row['trend'],
                    by_industry=row['by_industry'],
                )
                insights.append(insight)
            
            logger.info(f"Built playbook for {segment_key}: {len(insights)} arguments")
            return insights
        
        except Exception as exc:
            logger.error(f"Error building playbook: {exc}")
            return []
    
    async def compute_winning_arguments_stats(self):
        """
        Post-call job: aggregate all call_moments → update winning_arguments table.
        
        Run this daily or after each call.
        """
        
        # Query: count uses + closes per argument
        query = """
        WITH arg_stats AS (
            SELECT 
                argument_used,
                COUNT(*) as total_uses,
                SUM(CASE WHEN call_outcome IN ('closed', 'demo_booked') THEN 1 ELSE 0 END) as total_closes
            FROM call_moments
            WHERE argument_used IS NOT NULL
            GROUP BY argument_used
        ),
        segment_stats AS (
            SELECT
                cm.argument_used,
                cm.segment_key,
                COUNT(*) as uses,
                SUM(CASE WHEN cm.call_outcome IN ('closed', 'demo_booked') THEN 1 ELSE 0 END) as closes
            FROM call_moments cm
            WHERE cm.argument_used IS NOT NULL
            GROUP BY cm.argument_used, cm.segment_key
        )
        SELECT * FROM segment_stats
        """
        
        try:
            result = await self.db.query(query)
            
            for row in result:
                close_rate = row['closes'] / row['uses'] if row['uses'] > 0 else 0
                confidence = self._compute_confidence(row['uses'])
                prediction_interval = self._compute_prediction_interval(
                    close_rate,
                    row['uses']
                )
                
                # Upsert into winning_arguments
                await self.db.query("""
                INSERT INTO winning_arguments (
                    argument_text, segment_key, total_uses, total_closes,
                    close_rate, sample_size, confidence,
                    prediction_interval_low, prediction_interval_high, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (argument_text, segment_key) DO UPDATE SET
                    total_uses = EXCLUDED.total_uses,
                    total_closes = EXCLUDED.total_closes,
                    close_rate = EXCLUDED.close_rate,
                    sample_size = EXCLUDED.sample_size,
                    confidence = EXCLUDED.confidence,
                    prediction_interval_low = EXCLUDED.prediction_interval_low,
                    prediction_interval_high = EXCLUDED.prediction_interval_high,
                    updated_at = NOW()
                """, [
                    row['argument_used'],
                    row['segment_key'],
                    row['uses'],
                    row['closes'],
                    close_rate,
                    row['uses'],
                    confidence,
                    prediction_interval[0],
                    prediction_interval[1],
                ])
            
            logger.info(f"Updated {len(result)} argument stats")
        
        except Exception as exc:
            logger.error(f"Error computing stats: {exc}")
    
    def _compute_confidence(self, sample_size: int) -> float:
        """
        Confidence increases with sample size.
        Formula: sqrt(n / (n + k))
        where k=30 (takes 30 samples to reach 94% confidence)
        """
        return min(0.99, math.sqrt(sample_size / (sample_size + 30)))
    
    def _compute_prediction_interval(
        self,
        close_rate: float,
        sample_size: int,
        confidence_level: float = 0.95
    ) -> tuple[float, float]:
        """
        Wilson score interval for binomial proportion.
        More accurate than normal approximation for small samples.
        """
        if sample_size == 0:
            return (0.0, 1.0)
        
        z = 1.96  # 95% confidence
        
        p_hat = close_rate
        n = sample_size
        
        denominator = 1 + z**2 / n
        centre_adjusted_probability = (p_hat + z**2 / (2*n)) / denominator
        adjusted_standard_deviation = math.sqrt(
            (p_hat * (1 - p_hat) + z**2 / (4*n)) / n
        ) / denominator
        
        lower = centre_adjusted_probability - z * adjusted_standard_deviation
        upper = centre_adjusted_probability + z * adjusted_standard_deviation
        
        return (max(0, lower), min(1, upper))
    
    async def build_objection_handling_playbook(
        self,
        segment_key: str = "all"
    ) -> List[ObjectionPlaybook]:
        """Construir playbook de objeciones basado en DATOS REALES"""
        
        query = """
        SELECT 
            stated_objection,
            root_cause,
            root_cause_confidence,
            best_rebuttal,
            overcome_rate,
            encountered_count,
            overcome_count,
            by_industry
        FROM objection_intelligence
        WHERE encountered_count >= 10
        """
        
        params = []
        if segment_key != "all":
            query += " AND segment_key = $1"
            params.append(segment_key)
        
        query += " ORDER BY overcome_rate DESC"
        
        try:
            result = await self.db.query(query, params)
            
            playbooks = []
            for row in result:
                playbook = ObjectionPlaybook(
                    objection=row['stated_objection'],
                    root_cause=row['root_cause'],
                    root_cause_confidence=row['root_cause_confidence'],
                    best_rebuttal=row['best_rebuttal'],
                    overcome_rate=row['overcome_rate'],
                    times_encountered=row['encountered_count'],
                    times_overcome=row['overcome_count'],
                    by_industry=row['by_industry'],
                )
                playbooks.append(playbook)
            
            return playbooks
        
        except Exception as exc:
            logger.error(f"Error building objection playbook: {exc}")
            return []


class PromptOptimizer:
    """Actualizar prompts automáticamente basados en DATOS REALES"""
    
    def __init__(self, conv_intel: ConversationIntelligenceEngine):
        self.conv_intel = conv_intel
    
    async def generate_optimized_master_prompt(
        self,
        segment_key: str
    ) -> str:
        """
        Generar prompt del Maestro con argumentos que REALMENTE cierran deals.
        No guessed, no simulated. REAL DATA.
        """
        
        # Get real winning arguments
        arguments = await self.conv_intel.build_winning_arguments_playbook(
            segment_key=segment_key,
            min_confidence=0.75
        )
        
        # Get real objection handling
        objections = await self.conv_intel.build_objection_handling_playbook(
            segment_key=segment_key
        )
        
        # Build prompt
        prompt = f"""You are a sales agent for {segment_key} segment.

WINNING ARGUMENTS (Ranked by real close rate):
"""
        
        for i, arg in enumerate(arguments[:5], 1):
            prompt += f"""
{i}. "{arg.argument}"
   - Close Rate: {arg.close_rate:.0%} (confidence: {arg.confidence:.0%}, n={arg.uses})
   - Prediction Interval: {arg.prediction_interval[0]:.0%} - {arg.prediction_interval[1]:.0%}
   - Status: {arg.trend}"""
        
        prompt += """

OBJECTION HANDLING (Real data from your segment):
"""
        
        for i, obj in enumerate(objections[:3], 1):
            prompt += f"""
{i}. Prospect says: "{obj.objection}"
   - Root cause: {obj.root_cause} (confidence: {obj.root_cause_confidence:.0%})
   - Best rebuttal: "{obj.best_rebuttal}"
   - Success rate: {obj.overcome_rate:.0%} ({obj.times_overcome}/{obj.times_encountered} times)"""
        
        prompt += """

CRITICAL:
- These are REAL insights from your market segment, not generic advice
- Use the top 3 arguments in this order. They have proven effectiveness.
- When prospect objects, use the exact rebuttals shown above.
- Track every interaction for continuous learning.

Your goal: Book a 15-minute demo by the end of this call.
"""
        
        return prompt
```

---

## PARTE 3: QUICK START (Semanas 1-2)

### Step 1: Deploy schema
```bash
# Connect to Supabase
psql postgresql://user:password@db.supabase.co:5432/postgres

# Run schema from Part 1.1
# (SQL code above)
```

### Step 2: Add extraction to post-call flow
```python
# In llamadas/app/main.py or wherever calls complete:

from app.post_call.moment_extractor import MomentExtractor

async def on_call_complete(call_id, transcript, outcome):
    extractor = MomentExtractor(db, gemini_client)
    
    moments = await extractor.extract_moments_from_call(
        call_id=call_id,
        transcript=transcript,
        stage_history=call.stage_history,
        call_outcome=outcome,
        agent_id=call.agent_id,
        prospect_id=call.prospect_id,
    )
    
    # Next: compute stats
    intel = ConversationIntelligenceEngine(db)
    await intel.compute_winning_arguments_stats()
```

### Step 3: Test with 10 calls
- Run extraction
- Verify data in Supabase
- Check close_rate calculations

### Step 4: Create dashboard query
```sql
SELECT 
    argument_text,
    close_rate,
    sample_size,
    confidence,
    segment_key
FROM winning_arguments
WHERE confidence >= 0.70
ORDER BY close_rate DESC
LIMIT 10;
```

---

## DELIVERY: 12-Week Roadmap

| Week | Deliverable | Close Rate Lift |
|------|-------------|-----------------|
| 1-2 | Schema + extraction pipeline | Baseline |
| 3-4 | Real data flowing, initial playbook | +2-3% |
| 5-6 | Propensity matching for causal lift | +4-6% |
| 7-8 | Root cause detection | +2-3% |
| 9-12 | Real-time suggestions + dashboards | +3-4% |
| **TOTAL** | **Full deployment** | **+11-16%** |

---

## SUCCESS METRICS (After 90 days)

```
□ 50+ unique arguments tracked
□ 100+ calls with moment extraction
□ Top 5 arguments with confidence >= 0.80
□ Objection playbook for main 3-4 objections
□ Close rate comparison: baseline vs using playbook
□ Coach feedback: "useful for training"
□ Agent adoption: >70% using suggestions
```

---

**Next Action:** Approve implementation budget and timeline.  
**Contact:** Revenue AI Specialist
