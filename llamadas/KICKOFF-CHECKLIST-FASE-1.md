# ✅ KICKOFF CHECKLIST - FASE 1 (Prospect Profile Engine)
## Semanas 1-2: Setup + Database + Basic API

**Responsable**: Backend Lead  
**Duración**: 11 días hábiles  
**Status**: 🟡 LISTO PARA EMPEZAR

---

## PRE-KICKOFF TASKS (AHORA)

### Ambiente

- [ ] PostgreSQL 14+ instalado y accesible
- [ ] SQLAlchemy instalado (`pip install sqlalchemy[asyncpg]`)
- [ ] Gemini API key válida
- [ ] Git branch creado: `feature/prospect-profile-phase-1`
- [ ] Environment variables en `.env` (DATABASE_URL, GEMINI_API_KEY)

### Documentación Revisada

- [ ] Leer `/llamadas/PLAN-IMPLEMENTACION-EXHAUSTIVO-4-MESES.md`
- [ ] Entender schema de `prospect_profiles` y `call_turns`
- [ ] Identificar quién será code reviewer

### Decisiones de Diseño

- [ ] ¿Usar Supabase o RDS directo? → **Decision**: ___________
- [ ] ¿Encryption at-rest para PII? → **Decision**: ___________
- [ ] ¿Multi-tenant o single-tenant? → **Decision**: Single-tenant (software_id) ✅

---

## TASK 1: DATABASE SCHEMA (Days 1-2)

### 1.1 Create Migration File

```bash
alembic revision --autogenerate -m "Add prospect_profiles and call_turns tables"
```

Expected files:
- `alembic/versions/001_add_prospect_tables.py`

### 1.2 Implement Schema

In `app/models/prospect.py`:

```python
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, Numeric
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class ProspectProfile(Base):
    __tablename__ = "prospect_profiles"
    
    id = Column(String(36), primary_key=True)
    software_id = Column(String(36), nullable=False, index=True)
    phone = Column(String(20), nullable=False, unique=True)
    lead_id = Column(String(36), nullable=True)
    
    # PROFILE
    name = Column(String(255))
    company = Column(String(255))
    industry = Column(String(50))
    company_size = Column(String(20))
    
    # ENGAGEMENT
    temperature = Column(String(20), default='cold', index=True)
    temperature_score = Column(Float, default=0.0)
    interest_level = Column(Integer, default=1)
    last_called_at = Column(DateTime)
    total_calls = Column(Integer, default=0)
    
    # BUDGET
    stated_budget_min = Column(Numeric(12, 2))
    stated_budget_max = Column(Numeric(12, 2))
    budget_currency = Column(String(3), default='MXN')
    budget_confidence = Column(Float, default=0.0)
    
    # HISTORY (JSON)
    objections = Column(JSON, default=[])
    motivators = Column(JSON, default=[])
    interaction_patterns = Column(JSON, default={})
    
    # DECISION MAKER
    is_decision_maker = Column(Boolean, default=False)
    decision_maker_confidence = Column(Float, default=0.0)
    
    # TIMESTAMPS
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_profile_update_at = Column(DateTime)
    
    # CONSTRAINTS
    __table_args__ = (
        UniqueConstraint('software_id', 'phone', name='uq_software_phone'),
    )


class CallTurns(Base):
    __tablename__ = "call_turns"
    
    id = Column(String(36), primary_key=True)
    software_id = Column(String(36), nullable=False, index=True)
    prospect_id = Column(String(36), ForeignKey("prospect_profiles.id"), nullable=False)
    call_sid = Column(String(255), nullable=False)
    
    # METADATA
    call_number = Column(Integer)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # CONTENT
    turns = Column(JSON, nullable=False, default=[])
    analysis = Column(JSON, default={})
    
    # TIMESTAMPS
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Checklist Task 1

- [ ] Migration file created
- [ ] Schema reviewed and approved
- [ ] Indices defined (software_id, temperature, last_called_at)
- [ ] Foreign keys defined (prospect_id → prospect_profiles)
- [ ] Migration tested locally (`alembic upgrade head`)
- [ ] Data can be inserted without errors
- [ ] Constraints working (unique phone+software_id)

---

## TASK 2: PROSPECT SERVICE (Days 2-3)

### 2.1 Create ProspectService

File: `app/crm/prospect_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.prospect import ProspectProfile, CallTurns
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ProspectService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_profile(self, phone: str, software_id: str) -> dict:
        """Get prospect profile or return 'new' status"""
        stmt = select(ProspectProfile).where(
            (ProspectProfile.phone == phone) &
            (ProspectProfile.software_id == software_id)
        )
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            return {"status": "new", "phone": phone}
        
        return {
            "status": "returning",
            "prospect": {
                "id": profile.id,
                "name": profile.name,
                "company": profile.company,
                "industry": profile.industry,
                "company_size": profile.company_size
            },
            "engagement": {
                "temperature": profile.temperature,
                "interest_level": profile.interest_level,
                "last_called_at": profile.last_called_at.isoformat() if profile.last_called_at else None,
                "total_calls": profile.total_calls
            },
            "history": {
                "budget": {
                    "min": float(profile.stated_budget_min) if profile.stated_budget_min else None,
                    "max": float(profile.stated_budget_max) if profile.stated_budget_max else None,
                    "confidence": profile.budget_confidence
                },
                "objections": profile.objections or [],
                "motivators": profile.motivators or []
            },
            "interaction": profile.interaction_patterns or {}
        }
    
    async def create_or_update_profile(
        self,
        phone: str,
        software_id: str,
        **kwargs
    ) -> ProspectProfile:
        """Create new prospect or update existing"""
        
        stmt = select(ProspectProfile).where(
            (ProspectProfile.phone == phone) &
            (ProspectProfile.software_id == software_id)
        )
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            # CREATE
            profile = ProspectProfile(
                id=str(uuid.uuid4()),
                phone=phone,
                software_id=software_id,
                **kwargs
            )
            self.db.add(profile)
        else:
            # UPDATE
            for key, value in kwargs.items():
                if hasattr(profile, key):
                    setattr(profile, key, value)
        
        profile.updated_at = datetime.utcnow()
        await self.db.commit()
        
        return profile
    
    async def update_profile_after_call(
        self,
        phone: str,
        software_id: str,
        call_data: dict
    ) -> dict:
        """Update prospect after call ends"""
        
        # Get or create
        profile = await self.create_or_update_profile(
            phone=phone,
            software_id=software_id,
            name=call_data.get("name") or profile.name,
            company=call_data.get("company") or profile.company
        )
        
        # Update engagement
        profile.total_calls += 1
        profile.last_called_at = datetime.utcnow()
        
        # Update temperature
        if "temperature_delta" in call_data:
            new_score = min(1.0, profile.temperature_score + call_data["temperature_delta"])
            profile.temperature_score = new_score
            
            if new_score >= 0.7:
                profile.temperature = "hot"
            elif new_score >= 0.4:
                profile.temperature = "warm"
            else:
                profile.temperature = "cold"
        
        # Update budget (only if explicitly mentioned)
        if call_data.get("budget") and call_data["budget"].get("source") == "explicit":
            profile.stated_budget_min = call_data["budget"].get("min")
            profile.stated_budget_max = call_data["budget"].get("max")
            profile.budget_confidence = call_data["budget"].get("confidence", 0.7)
        
        # Append objections
        if call_data.get("objections"):
            existing = profile.objections or []
            existing.extend(call_data["objections"])
            profile.objections = existing
        
        # Update motivators
        if call_data.get("motivators"):
            profile.motivators = call_data.get("motivators")
        
        # Save call transcript
        call_turns = CallTurns(
            id=str(uuid.uuid4()),
            software_id=software_id,
            prospect_id=profile.id,
            call_sid=call_data.get("call_sid", "unknown"),
            call_number=profile.total_calls,
            started_at=datetime.utcnow(),
            duration_seconds=call_data.get("duration_seconds"),
            turns=call_data.get("turns", []),
            analysis=call_data.get("analysis", {})
        )
        
        self.db.add(call_turns)
        profile.last_profile_update_at = datetime.utcnow()
        await self.db.commit()
        
        logger.info(f"Updated prospect {phone}: {profile.temperature} ({profile.total_calls} calls)")
        
        return {
            "status": "success",
            "prospect_id": profile.id,
            "profile": {
                "temperature": profile.temperature,
                "interest_level": profile.interest_level,
                "total_calls": profile.total_calls
            }
        }
```

### Checklist Task 2

- [ ] ProspectService created and imports work
- [ ] get_profile() returns correct format (new vs returning)
- [ ] create_or_update_profile() creates new prospect if needed
- [ ] update_profile_after_call() updates all fields correctly
- [ ] Budget only saved if source="explicit"
- [ ] Objections accumulate (not replace)
- [ ] CallTurns saved correctly
- [ ] All methods tested with mock data

---

## TASK 3: API ENDPOINTS (Days 3-4)

### 3.1 Create FastAPI Router

File: `app/routes/prospects.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.crm.prospect_service import ProspectService
from app.database import get_db
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/v1/prospects", tags=["prospects"])


class GetProfileRequest(BaseModel):
    phone: str
    software_id: str


class UpdateProfileRequest(BaseModel):
    phone: str
    software_id: str
    call_sid: str
    duration_seconds: int
    temperature_delta: Optional[float] = None
    budget: Optional[dict] = None
    objections: Optional[list] = None
    motivators: Optional[list] = None
    turns: Optional[list] = None
    analysis: Optional[dict] = None


@router.post("/profile")
async def get_prospect_profile(
    request: GetProfileRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """GET prospect profile before call"""
    service = ProspectService(db)
    profile = await service.get_profile(request.phone, request.software_id)
    return profile


@router.post("/profile/update")
async def update_prospect_profile(
    request: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """UPDATE prospect profile after call"""
    service = ProspectService(db)
    
    result = await service.update_profile_after_call(
        phone=request.phone,
        software_id=request.software_id,
        call_data=request.dict()
    )
    
    return result


@router.get("/profile/{prospect_id}")
async def get_prospect_by_id(
    prospect_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """GET prospect by ID"""
    service = ProspectService(db)
    
    from sqlalchemy import select
    from app.models.prospect import ProspectProfile
    
    stmt = select(ProspectProfile).where(ProspectProfile.id == prospect_id)
    result = await db.execute(stmt)
    prospect = result.scalar_one_or_none()
    
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    return prospect.to_dict()
```

### 3.2 Register Router in main.py

```python
from app.routes import prospects

app.include_router(prospects.router)
```

### Checklist Task 3

- [ ] FastAPI router created and imported
- [ ] Endpoint POST /api/v1/prospects/profile works
- [ ] Endpoint POST /api/v1/prospects/profile/update works
- [ ] Endpoint GET /api/v1/prospects/profile/{id} works
- [ ] Request validation with Pydantic
- [ ] Error handling (404, 400)
- [ ] Response format matches spec
- [ ] Tested with curl/Postman

---

## TASK 4: INTEGRATION WITH VOICE (Days 4-5)

### 4.1 Modify MasterLLM

File: `app/conversation/master_llm.py` (add to existing class)

```python
async def prepare_call_with_context(self, phone: str, software_id: str) -> str:
    """
    Load prospect profile and inject into system prompt
    Called BEFORE voice call starts
    """
    from app.crm.prospect_service import ProspectService
    
    service = ProspectService(self.db)
    profile_data = await service.get_profile(phone, software_id)
    
    if profile_data["status"] == "new":
        # First call: use default context
        return self.DEFAULT_SYSTEM_PROMPT
    
    # Returning call: build rich context
    prospect = profile_data["prospect"]
    engagement = profile_data["engagement"]
    history = profile_data["history"]
    
    context = f"""
PROSPECT CONTEXT (from call history):
====================================
Name: {prospect['name']}
Company: {prospect['company']}
Industry: {prospect['industry']}
Company Size: {prospect['company_size']}

CALL HISTORY:
- Total calls: {engagement['total_calls']}
- Temperature: {engagement['temperature']}
- Interest Level: {engagement['interest_level']}/5
- Last contact: {engagement['last_called_at']}

BUDGET INFORMATION (if stated):
- Min: ${history['budget']['min'] or 'Not stated'}
- Max: ${history['budget']['max'] or 'Not stated'}
- Confidence: {history['budget']['confidence']*100:.0f}%

PREVIOUS OBJECTIONS & RESPONSES:
"""
    
    for objection in history['objections'][-3:]:  # Last 3
        context += f"""
- "{objection['text']}" (Category: {objection['category']})
  Response used: {objection.get('handler_used', 'N/A')}
  Effectiveness: {objection.get('effectiveness', 'N/A')}
"""
    
    context += f"""

MOTIVATORS MENTIONED:
"""
    
    for motivator in history['motivators'][-3:]:  # Last 3
        context += f"""
- {motivator['keyword']} (mentioned {motivator.get('frequency', 1)}x)
"""
    
    context += """

STRATEGY FOR THIS CALL:
1. Reference previous conversation to build trust
2. Acknowledge budget constraints
3. Focus on stated motivators
4. Use handlers that worked before
5. Avoid repeating ineffective approaches
"""
    
    return context
```

### 4.2 Hook into Call Initialization

In `app/main.py` or `app/telephony/media_stream.py`:

```python
async def on_call_start(phone: str, software_id: str):
    """Called when incoming call arrives"""
    
    # Load context from profile
    master_llm = MasterLLM(db=get_db())
    context = await master_llm.prepare_call_with_context(phone, software_id)
    
    # Pass to voice agent
    return context  # Will be used in voice prompt
```

### Checklist Task 4

- [ ] MasterLLM.prepare_call_with_context() returns string
- [ ] Context injected into system prompt
- [ ] New calls don't break (handle NULL profile)
- [ ] Returning calls show context to LLM
- [ ] No latency increase on call start (profile lookup <500ms)
- [ ] Tested with real phone call
- [ ] Prompt engineering reviewed

---

## TASK 5: POST-CALL EXTRACTION (Days 5-6)

### 5.1 Create Extraction Engine

File: `app/post_call/extraction_engine.py`

```python
from app.gemini.model_provider import get_gemini_client
import json
import logging

logger = logging.getLogger(__name__)


class PostCallExtractionEngine:
    """Extract structured data from call transcript using Gemini"""
    
    def __init__(self, gemini_client):
        self.gemini = gemini_client
    
    async def extract_profile_data(self, transcript: list) -> dict:
        """
        Analyze transcript and extract structured data.
        
        IMPORTANT: Only extract EXPLICITLY mentioned data.
        NO inference, NO probability invention.
        """
        
        transcript_text = "\n".join([
            f"{t['role'].upper()}: {t['text']}"
            for t in transcript
        ])
        
        prompt = f"""Analizar transcript de llamada de ventas.

IMPORTANTE: Extraer SOLO datos mencionados explícitamente por el prospect.
NO inventar probabilidades, NO inferir sin evidencia clara.

TRANSCRIPT:
{transcript_text}

EXTRAER DATOS ESTRUCTURADOS:

1. TEMPERATURA: ¿Cuál es el nivel de interés general?
   - Options: cold, warm, hot
   - Confidence: 0-1
   - Reasoning: ¿Qué dijo el prospect?

2. BUDGET: ¿Mencionó un presupuesto?
   - min, max, confidence (0-1)
   - source: "explicit_mention" o null
   - only if explicitly stated!

3. OBJECTIONS: ¿Qué objeciones planteó?
   - [{text, category (price/timing/need/competitor/other), sentiment (-1 to 1)}]

4. MOTIVATORS: ¿Qué lo motiva?
   - [{keyword, frequency, sentiment}]

5. DECISION MAKER: ¿Es decision maker?
   - is_decision_maker: true/false
   - confidence: 0-1

6. INTEREST LEVEL: Escala 1-5
   - 1: No interested
   - 5: Ready to buy now

7. OVERALL SENTIMENT: -1 (very negative) to +1 (very positive)

8. CALL OUTCOME:
   - Options: soft_no, hard_no, interested, demo_booked, transfer
   - Reasoning

RETORNAR VÁLIDO JSON:
{{
    "temperature": "warm",
    "temperature_confidence": 0.75,
    "budget": {{
        "min": 2000,
        "max": 5000,
        "confidence": 0.8,
        "source": "explicit_mention"
    }},
    "objections": [
        {{
            "text": "es muy caro",
            "category": "price",
            "sentiment": -0.7
        }}
    ],
    "motivators": [
        {{
            "keyword": "aumentar pacientes",
            "frequency": 2,
            "sentiment": 0.9
        }}
    ],
    "decision_maker": {{
        "is_decision_maker": false,
        "confidence": 0.6
    }},
    "interest_level": 3,
    "sentiment": 0.5,
    "outcome": "soft_no",
    "reasoning": "Interested but budget concerns"
}}
"""
        
        try:
            response = await self.gemini.generate_content(prompt)
            
            # Parse JSON
            extracted = json.loads(response.text)
            
            # Validate required fields
            required = ["temperature", "outcome", "interest_level"]
            for field in required:
                if field not in extracted:
                    logger.warning(f"Missing required field: {field}")
                    extracted[field] = None
            
            return extracted
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return {
                "error": "extraction_failed",
                "temperature": "cold",
                "outcome": "error"
            }
        except Exception as e:
            logger.error(f"Extraction error: {e}")
            return {
                "error": str(e),
                "temperature": "cold",
                "outcome": "error"
            }
```

### 5.2 Hook into Call End

In `app/main.py`:

```python
async def on_call_ended(call_data: dict):
    """
    Execute when call ends.
    Extract data and update prospect profile.
    """
    
    phone = call_data["phone"]
    software_id = call_data["software_id"]
    transcript = call_data["transcript"]
    
    # 1. Extract data
    engine = PostCallExtractionEngine(gemini_client)
    extracted = await engine.extract_profile_data(transcript)
    
    # 2. Map extracted data to update payload
    update_payload = {
        "phone": phone,
        "software_id": software_id,
        "call_sid": call_data.get("call_sid", "unknown"),
        "duration_seconds": call_data.get("duration_seconds"),
        "temperature_delta": extracted["temperature_confidence"] * 0.15,
        "budget": extracted.get("budget"),
        "objections": extracted.get("objections", []),
        "motivators": extracted.get("motivators", []),
        "turns": transcript,
        "analysis": {
            "sentiment": extracted.get("sentiment"),
            "outcome": extracted.get("outcome"),
            "interest_level": extracted.get("interest_level")
        }
    }
    
    # 3. Update profile
    service = ProspectService(db)
    result = await service.update_profile_after_call(**update_payload)
    
    logger.info(f"Call ended: {phone} → {result['profile']['temperature']}")
    
    return result
```

### Checklist Task 5

- [ ] Extraction engine created and tested
- [ ] Gemini prompt returns valid JSON
- [ ] Budget only extracted if source="explicit_mention"
- [ ] No data hallucination (confidence scores used)
- [ ] Extraction latency <3 seconds
- [ ] Tested with 10 real transcripts
- [ ] Error handling for malformed responses

---

## TASK 6: TESTING & VALIDATION (Days 6-7)

### 6.1 Unit Tests

File: `tests/test_prospect_service.py`

```python
import pytest
from app.crm.prospect_service import ProspectService
from app.models.prospect import ProspectProfile
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_get_profile_new_prospect(db: AsyncSession):
    """New prospect returns 'new' status"""
    service = ProspectService(db)
    
    result = await service.get_profile("+52-1234567890", "software-123")
    
    assert result["status"] == "new"
    assert result["phone"] == "+52-1234567890"


@pytest.mark.asyncio
async def test_get_profile_returning_prospect(db: AsyncSession):
    """Returning prospect has full context"""
    service = ProspectService(db)
    software_id = "software-123"
    phone = "+52-1234567890"
    
    # Create prospect
    await service.create_or_update_profile(
        phone=phone,
        software_id=software_id,
        name="Juan",
        company="Clínica X",
        temperature="warm",
        total_calls=1
    )
    
    # Get profile
    result = await service.get_profile(phone, software_id)
    
    assert result["status"] == "returning"
    assert result["prospect"]["name"] == "Juan"
    assert result["engagement"]["temperature"] == "warm"
    assert result["engagement"]["total_calls"] == 1


@pytest.mark.asyncio
async def test_update_profile_after_call(db: AsyncSession):
    """Profile updates correctly after call"""
    service = ProspectService(db)
    
    result = await service.update_profile_after_call(
        phone="+52-1234567890",
        software_id="software-123",
        call_data={
            "call_sid": "twilio-123",
            "duration_seconds": 340,
            "temperature_delta": 0.2,
            "budget": {
                "min": 2000,
                "max": 5000,
                "confidence": 0.8,
                "source": "explicit"
            },
            "objections": [
                {"text": "es muy caro", "category": "price", "sentiment": -0.6}
            ]
        }
    )
    
    assert result["status"] == "success"
    assert result["profile"]["temperature"] in ["cold", "warm", "hot"]
    assert result["profile"]["total_calls"] >= 1


@pytest.mark.asyncio
async def test_budget_not_saved_if_not_explicit(db: AsyncSession):
    """Budget only saved if explicitly mentioned"""
    service = ProspectService(db)
    
    # Send budget without explicit source
    await service.update_profile_after_call(
        phone="+52-1234567890",
        software_id="software-123",
        call_data={
            "call_sid": "twilio-123",
            "budget": {
                "min": 2000,
                "max": 5000,
                "confidence": 0.5,
                "source": "inferred"  # Not explicit!
            }
        }
    )
    
    # Check profile - budget should NOT be saved
    profile = await service.get_profile("+52-1234567890", "software-123")
    
    assert profile["history"]["budget"]["min"] is None
```

### 6.2 Integration Tests

```python
@pytest.mark.asyncio
async def test_api_get_profile_endpoint(client):
    """Test GET /api/v1/prospects/profile endpoint"""
    response = await client.post("/api/v1/prospects/profile", json={
        "phone": "+52-1234567890",
        "software_id": "software-123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["new", "returning"]


@pytest.mark.asyncio
async def test_api_update_profile_endpoint(client):
    """Test POST /api/v1/prospects/profile/update endpoint"""
    response = await client.post("/api/v1/prospects/profile/update", json={
        "phone": "+52-1234567890",
        "software_id": "software-123",
        "call_sid": "twilio-123",
        "duration_seconds": 340,
        "temperature_delta": 0.2,
        "budget": {
            "min": 2000,
            "max": 5000,
            "source": "explicit"
        }
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
```

### 6.3 Data Validation Tests

```python
@pytest.mark.asyncio
async def test_extraction_engine_only_explicit_budget():
    """Extraction engine respects explicit data rule"""
    engine = PostCallExtractionEngine(gemini_client)
    
    transcript = [
        {"role": "agent", "text": "¿Cuál es tu presupuesto?"},
        {"role": "prospect", "text": "Alrededor de $2000 a $5000"}
    ]
    
    extracted = await engine.extract_profile_data(transcript)
    
    assert extracted["budget"]["source"] == "explicit_mention"
    assert extracted["budget"]["confidence"] > 0.7
    
    # No hallucination
    assert "probability_to_close" not in extracted


@pytest.mark.asyncio
async def test_no_data_loss_on_multiple_calls():
    """Objections/motivators accumulate, not replace"""
    service = ProspectService(db)
    
    # Call 1
    await service.update_profile_after_call(
        phone="+52-123",
        software_id="soft-1",
        call_data={
            "call_sid": "call-1",
            "objections": [{"text": "expensive", "category": "price"}]
        }
    )
    
    # Call 2
    await service.update_profile_after_call(
        phone="+52-123",
        software_id="soft-1",
        call_data={
            "call_sid": "call-2",
            "objections": [{"text": "timing", "category": "timing"}]
        }
    )
    
    profile = await service.get_profile("+52-123", "soft-1")
    
    # Should have both objections
    assert len(profile["history"]["objections"]) == 2
    assert profile["history"]["objections"][0]["text"] == "expensive"
    assert profile["history"]["objections"][1]["text"] == "timing"
```

### Checklist Task 6

- [ ] All unit tests pass (>90% coverage)
- [ ] Integration tests pass
- [ ] Data validation tests pass
- [ ] No data loss on edge cases
- [ ] Performance: profile lookup <500ms
- [ ] Database query plan reviewed (indices working)
- [ ] Load tested: 100 concurrent profile lookups
- [ ] Code reviewed by backend peer

---

## TASK 7: DOCUMENTATION (Days 7-8)

### 7.1 Create API Documentation

File: `docs/PHASE1_API.md`

```markdown
# Phase 1: Prospect Profile API

## Endpoints

### GET Profile
```
POST /api/v1/prospects/profile

Request:
{
  "phone": "+52-1234567890",
  "software_id": "uuid-xxx"
}

Response (New):
{
  "status": "new",
  "phone": "+52-1234567890"
}

Response (Returning):
{
  "status": "returning",
  "prospect": {...},
  "engagement": {...},
  "history": {...}
}
```

### Update Profile
```
POST /api/v1/prospects/profile/update

Request:
{
  "phone": "+52-1234567890",
  "software_id": "uuid-xxx",
  "call_sid": "twilio-xxx",
  "duration_seconds": 340,
  "temperature_delta": 0.15,
  "budget": {
    "min": 2000,
    "max": 5000,
    "source": "explicit_mention"
  },
  ...
}

Response:
{
  "status": "success",
  "prospect_id": "uuid-xxx",
  "profile": {...}
}
```
```

### 7.2 Create Database Documentation

File: `docs/PHASE1_DATABASE.md`

```markdown
# Phase 1: Database Schema

## Tables

### prospect_profiles
- Stores persistent profile of each prospect
- Key: software_id + phone
- Temperature: cold → warm → hot
- Objections/motivators: JSONB for flexibility

### call_turns
- Complete transcript of each call
- Linked to prospect_id
- Supports future analytics
```

### 7.3 Create Developer Guide

File: `docs/PHASE1_DEVELOPER.md`

```markdown
# Phase 1: Developer Guide

## Architecture

1. ProspectService: Business logic for profile management
2. API endpoints: HTTP interface
3. PostCallExtractionEngine: Data extraction from transcripts
4. Integration hooks: on_call_start, on_call_ended

## To Add a New Prospect Field

1. Add column to ProspectProfile model
2. Update ProspectService methods
3. Update API request/response schemas
4. Add unit tests
5. Document in PHASE1_API.md
```

### Checklist Task 7

- [ ] API documentation complete
- [ ] Database documentation complete
- [ ] Developer guide complete
- [ ] README updated
- [ ] Deployment guide created
- [ ] Troubleshooting guide created

---

## TASK 8: STAGING DEPLOYMENT (Day 8-9)

### 8.1 Deploy to Staging

```bash
# 1. Create staging database
createdb silxarcrm_staging

# 2. Run migrations
DATABASE_URL="postgresql://..." alembic upgrade head

# 3. Build Docker image
docker build -t silxarcrm:phase1-staging -f Dockerfile.staging .

# 4. Push to registry
docker push gcr.io/project/silxarcrm:phase1-staging

# 5. Deploy to staging k8s
kubectl apply -f k8s/staging/deployment.yaml

# 6. Run smoke tests
pytest tests/integration/ -m staging
```

### 8.2 Smoke Tests

- [ ] API endpoints respond
- [ ] Database connections work
- [ ] Profile extraction works on 10 real transcripts
- [ ] No errors in logs
- [ ] Performance metrics acceptable

### Checklist Task 8

- [ ] Deployed to staging without errors
- [ ] All endpoints responding (200 OK)
- [ ] Database synced
- [ ] Health checks passing
- [ ] Monitoring alerts working
- [ ] Logs clean (no errors)

---

## TASK 9: FINAL REVIEW & DELIVERY (Days 9-10)

### 9.1 Code Review Checklist

- [ ] All code reviewed by peer
- [ ] No security vulnerabilities (no hardcoded secrets)
- [ ] No SQL injection risks
- [ ] PII not logged
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Tests comprehensive (>85% coverage)

### 9.2 Deployment Checklist

- [ ] Staging deployment successful
- [ ] Smoke tests pass
- [ ] Load tests pass (100 concurrent users)
- [ ] Backup strategy documented
- [ ] Rollback plan documented
- [ ] Monitoring/alerting configured

### 9.3 Handoff Checklist

- [ ] Run kickoff review meeting
- [ ] Demo Phase 1 to stakeholders
- [ ] Gather feedback
- [ ] Address critical bugs
- [ ] Prepare for Phase 2 kickoff

### Checklist Task 9

- [ ] Phase 1 complete and tested
- [ ] Ready to deploy to production
- [ ] Team trained on new API
- [ ] Documentation published
- [ ] Next phase planning ready

---

## TIMELINE SUMMARY

```
Week 1 (Days 1-5):
  Day 1-2: Database schema
  Day 3-4: ProspectService + API
  Day 5: Voice integration + extraction

Week 2 (Days 6-10):
  Day 6-7: Testing + validation
  Day 8-9: Staging deployment
  Day 10: Final review + handoff
```

**Status**: 🟢 READY TO START  
**Estimated Completion**: June 28, 2026 (Week 2)  
**Owner**: Backend Lead  
**Next Phase Kickoff**: July 1, 2026
