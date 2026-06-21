# ARQUITECTURA: IMPLEMENTATION BLUEPRINT
## Código esquelético + patrones clave

---

## 1. DATABASE MIGRATIONS

```python
# migrations/001_create_core_tables.py

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

Base = declarative_base()

# ============= PROSPECTS =============
class Prospect(Base):
    __tablename__ = "prospects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id = Column(String(255))
    name = Column(String(255), nullable=False)
    business_name = Column(String(255))
    phone = Column(String(20), nullable=False, unique=True)
    email = Column(String(255))
    
    # Segmentation
    industry = Column(Enum('veterinaria', 'gym', 'yoga', 'spa', 'other'), default='other')
    business_size = Column(Enum('solo', '1-5', '6-20', '20+'), default='solo')
    region = Column(String(100))
    
    # Decision
    is_decision_maker = Column(Boolean, default=False)
    is_gatekeeper = Column(Boolean, default=False)
    
    # History
    attempt_count = Column(Integer, default=0)
    attempt_success_rate = Column(Float, default=0.0)
    last_attempt_at = Column(DateTime)
    
    # Scoring
    lifetime_lead_score = Column(Float, default=0)
    avg_lead_score = Column(Float, default=0)
    lifetime_conversion_probability = Column(Float, default=0)
    
    # Engagement
    preferred_language = Column(Enum('es', 'en', 'ca'), default='es')
    timezone = Column(String(50), default='Europe/Madrid')
    do_not_call = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============= CALLS =============
class Call(Base):
    __tablename__ = "calls"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prospect_id = Column(String(36), ForeignKey("prospects.id"), nullable=False)
    
    # Metadata
    call_sid = Column(String(255), unique=True)  # Twilio SID
    campaign_id = Column(String(255))
    agent_type = Column(Enum('voice_fast', 'hybrid_advanced'), default='hybrid_advanced')
    model_version = Column(String(50), default='gemini-1.5')
    
    # Timing
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # Content
    transcript = Column(JSON)  # [{role, text, timestamp, emotion}]
    classifications = Column(JSON)  # [{turn, tags, confidence}]
    
    # Outcome
    outcome = Column(Enum('demo_booked', 'soft_no', 'hard_no', 'transfer', 'error'))
    outcome_timestamp = Column(DateTime)
    
    # Signals
    pain_points_detected = Column(JSON)  # ["citas perdidas", "recordatorios"]
    objections = Column(JSON)  # ["precio alto", "ya tenemos algo"]
    questions_asked = Column(Integer, default=0)
    prospect_interruptions = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============= CALL METRICS =============
class CallMetrics(Base):
    __tablename__ = "call_metrics"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False, unique=True)
    prospect_id = Column(String(36), ForeignKey("prospects.id"), nullable=False)
    
    # Engagement Score
    engagement_score = Column(Float)
    turns_count = Column(Integer)
    prospect_words_count = Column(Integer)
    
    # Interest Score
    interest_score = Column(Float)
    demo_requested = Column(Boolean, default=False)
    urgency_detected = Column(Boolean, default=False)
    decision_maker_confirmed = Column(Boolean, default=False)
    
    # Objection Handling
    objection_handling_score = Column(Float)
    objections_count = Column(Integer, default=0)
    objections_overcome = Column(Integer, default=0)
    
    # Composite
    lead_score = Column(Float)  # 0-100
    sentiment_score = Column(Float)  # -1 to +1
    probability_to_close = Column(Float)  # 0-1
    
    # Performance
    response_latency_p50_ms = Column(Integer)
    response_latency_p95_ms = Column(Integer)
    cost_usd = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============= NEXT BEST ACTIONS =============
class NextBestAction(Base):
    __tablename__ = "next_best_actions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    prospect_id = Column(String(36), ForeignKey("prospects.id"), nullable=False)
    
    # Action metadata
    action_type = Column(Enum(
        'send_email_followup',
        'send_whatsapp_offer',
        'schedule_callback',
        'transfer_to_human',
        'send_case_study',
        'send_testimonial',
        'request_referral',
        'flag_for_manual_review',
        'do_not_contact'
    ), nullable=False)
    
    priority = Column(Integer)  # 1-100
    confidence = Column(Float)  # 0-1
    
    # Content
    content = Column(JSON)  # {"template": "...", "vars": {...}}
    channel = Column(Enum('email', 'whatsapp', 'sms', 'voice'))
    scheduled_at = Column(DateTime)
    
    # Status
    status = Column(Enum('pending', 'sent', 'opened', 'clicked', 'failed'), default='pending')
    executed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============= LEARNING LOOP METRICS =============
class LearningLoopMetrics(Base):
    __tablename__ = "learning_loop_metrics"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Window
    window_date = Column(DateTime, nullable=False)
    analysis_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Analysis
    top_winning_arguments = Column(JSON)  # [{argument, win_rate}]
    recurring_objections = Column(JSON)  # {objection: {count, handlers}}
    industry_patterns = Column(JSON)  # {industry: {win_rate, duration}}
    
    # Metrics
    overall_win_rate = Column(Float)
    avg_demo_booking_rate = Column(Float)
    avg_call_duration = Column(Integer)
    avg_lead_score = Column(Float)
    
    # Model
    prompt_version = Column(String(50))
    a_b_test_results = Column(JSON)  # {variant: metrics}
    
    # Recommendations
    recommended_prompt_updates = Column(JSON)  # [recommendations]
    confidence_in_update = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## 2. CALL ROUTER SERVICE

```python
# services/call_router.py

from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio

app = FastAPI()

class CallRequest(BaseModel):
    prospect_id: str
    campaign_id: str
    business_type: str

class CallRouter:
    """Entry point: validates lead, fetches history, routes to HybridSession"""
    
    def __init__(self, db: Session, hybrid_session_factory):
        self.db = db
        self.hybrid_session_factory = hybrid_session_factory
    
    async def route_call(self, request: CallRequest) -> 'HybridSession':
        """Main routing logic"""
        
        # 1. Fetch prospect
        prospect = self.db.query(Prospect).filter(
            Prospect.id == request.prospect_id
        ).first()
        
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect not found")
        
        # 2. Validate DNC
        if prospect.do_not_call:
            return {
                "status": "blocked",
                "reason": "Prospect on DNC list"
            }
        
        # 3. Check for duplicate recent calls
        recent_call = self.db.query(Call).filter(
            Call.prospect_id == request.prospect_id,
            Call.created_at >= datetime.utcnow() - timedelta(hours=1)
        ).first()
        
        if recent_call:
            return {
                "status": "duplicate",
                "reason": "Called within last hour",
                "last_call_id": recent_call.id
            }
        
        # 4. Fetch call history
        call_history = self.db.query(Call).filter(
            Call.prospect_id == request.prospect_id
        ).order_by(Call.created_at.desc()).limit(5).all()
        
        # 5. Create HybridSession
        session = self.hybrid_session_factory.create(
            prospect=prospect,
            campaign_id=request.campaign_id,
            call_history=call_history,
            business_type=request.business_type,
            model_version="gemini-1.5"
        )
        
        return session

@app.post("/api/calls/route")
async def route_call_endpoint(request: CallRequest, db: Session = Depends(get_db)):
    router = CallRouter(db, hybrid_session_factory)
    session = await router.route_call(request)
    return {"session_id": session.id, "status": "ready"}
```

---

## 3. HYBRID SESSION ORCHESTRATION

```python
# services/hybrid_session.py

import asyncio
from typing import Dict, Optional
from datetime import datetime

class HybridSession:
    """Main call orchestration during call"""
    
    def __init__(self, prospect, call_history, business_type, model_version):
        self.prospect = prospect
        self.call_history = call_history
        self.business_type = business_type
        self.model_version = model_version
        
        # Components
        self._state_engine = StateEngine()
        self._voice_llm = VoiceLLM(model_version)
        self._master_llm = MasterLLM(model_version)
        self._classifier = Classifier()
        
        # State
        self._state = {
            'stage': 'greeting',
            'risk_of_loss': 0.95,
            'goal_progress': 0.0,
            'pain_detected': False
        }
        
        self._last_brief = self._generate_initial_brief()
        self._turn_count = 0
        self._history = []  # Last 5 turns
        self._last_classification = None
    
    async def handle_user_input(self, transcript_text: str) -> Dict:
        """Main loop: called for each user turn"""
        
        self._turn_count += 1
        
        # STEP 1: Classify (selective)
        if self._should_classify(self._turn_count):
            classification = await self._classifier.classify(
                text=transcript_text,
                context=self._state,
                business_type=self.business_type
            )  # ~100ms
            self._last_classification = classification
        else:
            classification = self._last_classification or {}
        
        # STEP 2: Update state (instant, <1ms)
        self._state.update(
            self._state_engine.update(classification, self._state)
        )
        
        # STEP 3: Dual-LLM async pattern
        # Voice responds immediately using cached brief
        # Master pre-generates next brief in background
        
        response_task = asyncio.create_task(
            self._voice_llm.generate(
                brief=self._last_brief,
                state=self._state,
                prospect=self.prospect
            )
        )  # ~180ms, runs immediately
        
        brief_task = asyncio.create_task(
            self._master_llm.generate_background(
                state=self._state,
                classification=classification,
                prospect=self.prospect,
                business_type=self.business_type
            )
        )  # ~300-500ms, runs in parallel
        
        # STEP 4: Get response without waiting for new brief
        response = await response_task  # ~180ms total
        
        # STEP 5: Store brief for next turn (don't wait)
        new_brief = await brief_task  # Will be ready before next turn
        self._last_brief = new_brief
        
        # STEP 6: Store in history (last 5 turns only)
        self._history.append({
            'turn': self._turn_count,
            'user_text': transcript_text,
            'agent_response': response,
            'classification': classification,
            'state': self._state.copy(),
            'timestamp': datetime.utcnow()
        })
        
        if len(self._history) > 5:
            self._history.pop(0)
        
        return {
            'response': response,
            'state': self._state,
            'turn': self._turn_count
        }
    
    def _should_classify(self, turn_count: int) -> bool:
        """Decide if we need to classify this turn"""
        
        # Always classify first 2 turns
        if turn_count <= 2:
            return True
        
        # Classify if emotion changed significantly
        if self._emotion_changed():
            return True
        
        # Classify if stalled (no progress 3+ turns)
        if self._turns_without_progress() > 3:
            return True
        
        # Otherwise don't classify (cache last one)
        return False
    
    def _emotion_changed(self) -> bool:
        """Check if prospect's emotion shifted"""
        if len(self._history) < 2:
            return False
        
        last_emotion = self._history[-1].get('classification', {}).get('emotion')
        prev_emotion = self._history[-2].get('classification', {}).get('emotion')
        
        return last_emotion != prev_emotion
    
    def _turns_without_progress(self) -> int:
        """Count turns without progress toward goal"""
        count = 0
        for turn in reversed(self._history[-5:]):
            if turn['state'].get('goal_progress') == self._state['goal_progress']:
                count += 1
            else:
                break
        return count
    
    def _generate_initial_brief(self) -> Dict:
        """Generate initial brief for discovery stage"""
        return {
            'stage': 'greeting',
            'objective': 'Introduce and qualify',
            'strategy': 'Build rapport, ask about business',
            'tone': 'friendly',
            'pacing': 'slow'
        }

# ============= STATE ENGINE =============
class StateEngine:
    """Probabilistic state machine, <1ms"""
    
    def update(self, classification: Dict, current_state: Dict) -> Dict:
        """Update state based on classification"""
        
        updated_state = current_state.copy()
        
        # Update based on classification signals
        if classification.get('pain_detected'):
            updated_state['stage'] = 'problem_aware'
            updated_state['risk_of_loss'] = 0.35
            updated_state['goal_progress'] = 0.4
            updated_state['pain_detected'] = True
        
        if classification.get('demo_interest'):
            updated_state['stage'] = 'demo_interest'
            updated_state['risk_of_loss'] = 0.20
            updated_state['goal_progress'] = 0.7
        
        if classification.get('intent') == 'accept_demo':
            updated_state['stage'] = 'closing'
            updated_state['risk_of_loss'] = 0.05
            updated_state['goal_progress'] = 0.95
        
        return updated_state

# ============= VOICE LLM =============
class VoiceLLM:
    """Fast LLM (Gemini Flash), 180ms"""
    
    def __init__(self, model_version: str):
        self.model_version = model_version
        self.client = genai.Client()
    
    async def generate(self, brief: Dict, state: Dict, prospect) -> str:
        """Generate natural response quickly"""
        
        prompt = f"""
        You are a sales agent calling {prospect.business_name}.
        
        Current brief: {brief}
        Current stage: {state['stage']}
        
        Generate a natural, conversational response (1-3 sentences max).
        Be warm, not pushy.
        """
        
        response = await self.client.messages.create(
            model="gemini-1.5-flash",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text

# ============= MASTER LLM =============
class MasterLLM:
    """Strategic LLM (Gemini Pro), 300-500ms, async background"""
    
    def __init__(self, model_version: str):
        self.model_version = model_version
        self.client = genai.Client()
    
    async def generate_background(self, state: Dict, classification: Dict, 
                                  prospect, business_type: str) -> Dict:
        """Pre-generate brief for NEXT turn, in background"""
        
        # Build strategic prompt
        strategy_map = {
            'veterinaria': 'urgency_and_roi',
            'gym': 'automation_and_staff',
            'yoga': 'community_and_convenience',
            'spa': 'efficiency_and_revenue'
        }
        
        strategy = strategy_map.get(business_type, 'default')
        
        prompt = f"""
        You are a strategic advisor for a sales call.
        
        Prospect: {prospect.business_name} ({business_type})
        Current stage: {state['stage']}
        Classification: {classification}
        Pain detected: {state.get('pain_detected')}
        
        Strategy for {strategy}:
        - What should the agent focus on next?
        - What specific pain point to explore?
        - What outcome should we push for?
        
        Provide a brief with: objective, tone, pacing, key_questions
        """
        
        response = await self.client.messages.create(
            model="gemini-1.5-pro",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return {
            'stage': state['stage'],
            'objective': response.content[0].text,
            'strategy': strategy
        }

# ============= CLASSIFIER =============
class Classifier:
    """Selective classification, ~100ms"""
    
    async def classify(self, text: str, context: Dict, business_type: str) -> Dict:
        """Classify turn based on text and context"""
        
        # Heuristic-based classification
        classification = {
            'turn': context.get('turn_count', 0),
            'intent': self._detect_intent(text),
            'pain_detected': self._detect_pain(text),
            'objections': self._detect_objections(text),
            'demo_interest': self._detect_demo_interest(text),
            'urgency': self._detect_urgency(text),
            'decision_maker': self._detect_decision_maker(text),
            'emotion': self._detect_emotion(text),
            'confidence': 0.75
        }
        
        return classification
    
    def _detect_intent(self, text: str) -> str:
        """Detect what prospect wants"""
        if any(word in text.lower() for word in ['sí', 'dale', 'va', 'claro']):
            return 'positive'
        elif any(word in text.lower() for word in ['no', 'nah', 'nope']):
            return 'negative'
        return 'neutral'
    
    def _detect_pain(self, text: str) -> bool:
        """Detect if pain point mentioned"""
        pain_keywords = ['problema', 'difícil', 'pérdida', 'caro', 'ocupado', 'estrés']
        return any(keyword in text.lower() for keyword in pain_keywords)
    
    def _detect_objections(self, text: str) -> list:
        """Extract objections"""
        objections = []
        if 'caro' in text.lower():
            objections.append('precio_alto')
        if 'ya tenemos' in text.lower():
            objections.append('competidor_existente')
        if 'quiero pensarlo' in text.lower():
            objections.append('necesita_tiempo')
        return objections
    
    def _detect_demo_interest(self, text: str) -> bool:
        """Detect if interested in demo"""
        demo_keywords = ['demo', 'muestrame', 've', 'prueba', 'pruebo']
        return any(keyword in text.lower() for keyword in demo_keywords)
    
    def _detect_urgency(self, text: str) -> bool:
        """Detect if urgent"""
        urgency_keywords = ['hoy', 'mañana', 'urgente', 'ya', 'asap']
        return any(keyword in text.lower() for keyword in urgency_keywords)
    
    def _detect_decision_maker(self, text: str) -> bool:
        """Detect if decision maker"""
        dm_keywords = ['yo decido', 'yo doy permiso', 'soy dueño', 'yo autori']
        return any(keyword in text.lower() for keyword in dm_keywords)
    
    def _detect_emotion(self, text: str) -> str:
        """Simple emotion detection"""
        positive_words = ['perfecto', 'excelente', 'genial', 'me encanta']
        negative_words = ['no', 'oof', 'eh', 'meh']
        
        if any(word in text.lower() for word in positive_words):
            return 'positive'
        elif any(word in text.lower() for word in negative_words):
            return 'negative'
        return 'neutral'
```

---

## 4. POST-CALL PROCESSOR

```python
# services/post_call_processor.py

from sqlalchemy.orm import Session
from datetime import datetime
import asyncio

class PostCallProcessor:
    """Executes after call ends, ~10 seconds"""
    
    def __init__(self, db: Session, dispatcher):
        self.db = db
        self.dispatcher = dispatcher
    
    async def process_call(self, call_id: str):
        """Main post-call orchestration"""
        
        # Fetch call
        call = self.db.query(Call).filter(Call.id == call_id).first()
        prospect = self.db.query(Prospect).filter(Prospect.id == call.prospect_id).first()
        
        # STEP 1: Analyze
        print(f"[PostCall] Analyzing call {call_id}...")
        analysis = await self._analyze_transcript(call.transcript)
        
        # STEP 2: Compute metrics
        print(f"[PostCall] Computing metrics...")
        metrics = CallMetricsComputer().compute(
            transcript_analysis=analysis,
            prospect_history=prospect,
            call=call
        )
        
        # STEP 3: Compute NBA
        print(f"[PostCall] Computing next best actions...")
        nba_list = NBAPipeline().compute_actions(
            metrics=metrics,
            prospect=prospect,
            call_outcome=call.outcome
        )
        
        # STEP 4: Dispatch
        print(f"[PostCall] Dispatching actions...")
        await self.dispatcher.dispatch_all(nba_list)
        
        # STEP 5: Update DB
        print(f"[PostCall] Updating database...")
        await self._update_database(call, prospect, metrics, nba_list)
        
        print(f"[PostCall] Complete! Lead score: {metrics['lead_score']}")
    
    async def _analyze_transcript(self, transcript: list) -> dict:
        """Extract key signals from transcript"""
        
        return {
            'turn_count': len(transcript),
            'prospect_words': sum(len(t['text'].split()) for t in transcript if t['role'] == 'prospect'),
            'agent_words': sum(len(t['text'].split()) for t in transcript if t['role'] == 'agent'),
            'pain_points': self._extract_pain_points(transcript),
            'objections': self._extract_objections(transcript),
            'sentiment_arc': self._compute_sentiment_arc(transcript)
        }
    
    async def _update_database(self, call, prospect, metrics, nba_list):
        """Store everything in DB"""
        
        # Create CallMetrics
        call_metrics = CallMetrics(
            call_id=call.id,
            prospect_id=prospect.id,
            lead_score=metrics['lead_score'],
            sentiment_score=metrics['sentiment'],
            probability_to_close=metrics['p_close'],
            engagement_score=metrics['engagement'],
            interest_score=metrics['interest'],
            objection_handling_score=metrics['objection_handling']
        )
        self.db.add(call_metrics)
        
        # Create NBA records
        for action in nba_list:
            nba = NextBestAction(
                call_id=call.id,
                prospect_id=prospect.id,
                action_type=action['type'],
                priority=action['priority'],
                confidence=action['confidence'],
                channel=action['channel'],
                content=action['content'],
                scheduled_at=action['scheduled_at'],
                status='pending'
            )
            self.db.add(nba)
        
        # Update prospect
        prospect.lifetime_lead_score = max(metrics['lead_score'], prospect.lifetime_lead_score)
        prospect.avg_lead_score = (prospect.avg_lead_score + metrics['lead_score']) / 2
        prospect.lifetime_conversion_probability = metrics['p_close']
        prospect.attempt_count += 1
        prospect.last_attempt_at = datetime.utcnow()
        
        self.db.commit()

# ============= LEAD SCORE COMPUTER =============
class CallMetricsComputer:
    """Computes lead score + related metrics"""
    
    def compute(self, transcript_analysis: dict, prospect_history, call) -> dict:
        """Compute all metrics for a call"""
        
        # Engagement Score
        E = self._compute_engagement(transcript_analysis)
        
        # Interest Score
        I = self._compute_interest(call)
        
        # Objection Handling Score
        O = self._compute_objection_handling(transcript_analysis)
        
        # LEAD SCORE = E(40%) + I(35%) + O(25%)
        lead_score = (E * 0.4) + (I * 0.35) + (O * 0.25)
        
        # Sentiment
        sentiment = transcript_analysis['sentiment_arc'][-1] if transcript_analysis['sentiment_arc'] else 0
        
        # P(close) - Bayesian
        p_close = self._compute_probability_to_close(
            lead_score=lead_score,
            outcome=call.outcome,
            prospect=prospect_history
        )
        
        return {
            'lead_score': min(100, max(0, lead_score)),
            'engagement': E,
            'interest': I,
            'objection_handling': O,
            'sentiment': sentiment,
            'p_close': p_close
        }
    
    def _compute_engagement(self, analysis: dict) -> float:
        """E = 0-100"""
        
        turns = analysis['turn_count']
        words = analysis['prospect_words']
        
        E = min(100,
            (turns * 3) +
            (words * 0.1) +
            (len(analysis.get('pain_points', [])) * 5)
        )
        
        return E
    
    def _compute_interest(self, call: Call) -> float:
        """I = 0-100"""
        
        I = 0
        
        if 'demo_requested' in call.classifications:
            I += 20
        if 'urgency' in call.classifications:
            I += 15
        if 'decision_maker' in call.classifications:
            I += 12
        if 'need_quantified' in call.classifications:
            I += 15
        
        return min(100, I)
    
    def _compute_objection_handling(self, analysis: dict) -> float:
        """O = 0-100"""
        
        objections_count = len(analysis.get('objections', []))
        
        if objections_count == 0:
            return 100  # No objections = perfect
        
        # Assume 50% of objections were overcome (heuristic)
        overcome = objections_count * 0.5
        
        O = (overcome / objections_count) * 100 if objections_count > 0 else 100
        
        return min(100, O)
    
    def _compute_probability_to_close(self, lead_score: float, outcome: str, prospect) -> float:
        """Bayesian P(close)"""
        
        # Base probability from lead_score
        base_prob = lead_score / 100
        
        # Adjust for outcome
        if outcome == 'demo_booked':
            base_prob *= 1.3  # Strong signal
        elif outcome == 'soft_no':
            base_prob *= 0.5  # Weak signal
        elif outcome == 'hard_no':
            base_prob *= 0.1  # Very weak
        
        # Adjust for prospect history
        if prospect.lifetime_conversion_probability > 0:
            base_prob = (base_prob + prospect.lifetime_conversion_probability) / 2
        
        return min(1.0, max(0.0, base_prob))
```

---

## 5. ANALYTICS ENGINE

```python
# services/analytics_engine.py

from sqlalchemy.orm import Session
from datetime import datetime, timedelta

class AnalyticsEngine:
    """Runs nightly, analyzes patterns in 100k+ calls"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def analyze_window(self, start_date: datetime, end_date: datetime) -> dict:
        """Main analytics job"""
        
        # Fetch all calls in window
        calls = self.db.query(Call).filter(
            Call.created_at >= start_date,
            Call.created_at <= end_date
        ).all()
        
        print(f"[Analytics] Analyzing {len(calls)} calls...")
        
        # 1. Extract winning arguments
        winning_calls = [c for c in calls if c.outcome == 'demo_booked']
        win_rate_by_argument = self._analyze_arguments(winning_calls, calls)
        
        # 2. Extract objections
        all_objections = self._extract_all_objections(calls)
        objection_handlers = self._find_best_handlers(all_objections, winning_calls)
        
        # 3. Industry patterns
        industry_patterns = self._compute_industry_patterns(calls)
        
        # 4. Recommendations
        recommendations = self._generate_recommendations(
            win_rate_by_argument=win_rate_by_argument,
            objection_handlers=objection_handlers,
            industry_patterns=industry_patterns
        )
        
        # 5. Store in DB
        metrics = LearningLoopMetrics(
            window_date=start_date,
            top_winning_arguments=win_rate_by_argument,
            recurring_objections=objection_handlers,
            industry_patterns=industry_patterns,
            overall_win_rate=len(winning_calls) / len(calls),
            recommended_prompt_updates=recommendations
        )
        self.db.add(metrics)
        self.db.commit()
        
        print(f"[Analytics] Complete! Win rate: {len(winning_calls)/len(calls):.1%}")
        
        return recommendations
    
    def _analyze_arguments(self, winning_calls: list, all_calls: list) -> list:
        """Extract top winning arguments"""
        
        # Placeholder: would extract from transcripts
        return [
            {
                'argument': 'Recupera 30% de citas perdidas',
                'frequency': 180,
                'win_rate': 0.65,
                'confidence': 0.92
            },
            {
                'argument': 'Ahorras 5 horas semanales',
                'frequency': 156,
                'win_rate': 0.62,
                'confidence': 0.88
            }
        ]
    
    def _compute_industry_patterns(self, calls: list) -> dict:
        """Compute win rate + metrics by industry"""
        
        patterns = {}
        
        for industry in ['veterinaria', 'gym', 'yoga', 'spa']:
            industry_calls = [c for c in calls if c.prospect.industry == industry]
            winning = [c for c in industry_calls if c.outcome == 'demo_booked']
            
            if industry_calls:
                patterns[industry] = {
                    'total_calls': len(industry_calls),
                    'demos_booked': len(winning),
                    'win_rate': len(winning) / len(industry_calls),
                    'avg_duration': sum(c.duration_seconds for c in industry_calls) / len(industry_calls)
                }
        
        return patterns
    
    def _generate_recommendations(self, **analysis_data) -> list:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        # Recommendation 1: Increase mentions of top arguments
        top_arg = analysis_data['win_rate_by_argument'][0]
        if top_arg['win_rate'] > 0.60:
            recommendations.append(
                f"Increase mentions of '{top_arg['argument']}' in first 2 turns (win rate: {top_arg['win_rate']:.0%})"
            )
        
        # Recommendation 2: Handle objections better
        for obj, handler_info in analysis_data['objection_handlers'].items():
            if handler_info['overcome_rate'] < 0.50:
                recommendations.append(
                    f"For objection '{obj}', add: '{handler_info['best_response']}' (current overcome rate: {handler_info['overcome_rate']:.0%})"
                )
        
        return recommendations
```

---

## 6. PROMPT OPTIMIZER

```python
# services/prompt_optimizer.py

class PromptOptimizer:
    """Updates prompts based on analytics recommendations"""
    
    async def create_variant(self, recommendations: list, base_prompt: str) -> str:
        """Create new prompt variant with recommendations"""
        
        new_prompt = base_prompt + "\n\n=== UPDATED STRATEGIES ===\n"
        
        for rec in recommendations:
            new_prompt += f"- {rec}\n"
        
        # Validate
        if not await self._safety_gates.validate(base_prompt, new_prompt):
            return None
        
        # A/B test
        variant_id = await self._create_ab_test(new_prompt)
        
        # Gradual rollout
        await self._rollout(variant_id, initial_traffic=0.10)
        
        return variant_id
    
    async def _safety_gates(self, old_prompt: str, new_prompt: str) -> bool:
        """Ensure no critical changes"""
        
        critical_guards = [
            "GDPR compliance",
            "No aggressive selling",
            "Respect DNC list"
        ]
        
        for guard in critical_guards:
            if guard in old_prompt and guard not in new_prompt:
                return False
        
        # Max word increase 15%
        if len(new_prompt.split()) > len(old_prompt.split()) * 1.15:
            return False
        
        return True
```

---

## SUMMARY

These 6 components form the complete architecture:

1. **Database** - Schema for all data
2. **Call Router** - Entry point
3. **HybridSession** - Real-time orchestration (Dual LLM)
4. **PostCallProcessor** - Analysis + scoring + NBA
5. **AnalyticsEngine** - Nightly pattern detection
6. **PromptOptimizer** - Safe prompt updates

**Next:** Implement services 1-3 first (DB + Router + Session), then add post-call (4), then learning (5-6).

**Expected timeline:** 
- Services 1-3: Week 1-2
- Service 4: Week 3-4
- Services 5-6: Week 5-6

**Result:** Integrated architecture, self-improving, multi-channel, production-ready.
