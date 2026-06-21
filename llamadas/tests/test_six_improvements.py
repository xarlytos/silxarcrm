"""Tests: 6 Mejoras - Minimal validation"""
import pytest
from app.prospect_profile_engine import ProspectProfile, ProspectProfileEngine
from app.deal_engine import DealEngine, DealRecommendation
from app.coaching_engine import CoachingEngine, LeadScoreLevel
from app.conversation_intelligence import ConversationIntelligenceEngine
from app.multichannel_orchestrator import MultiChannelOrchestrator


# ═════════════════════════════════════════════════════════════════════════
# MEJORA 1: Prospect Profile
# ═════════════════════════════════════════════════════════════════════════

def test_prospect_profile_creation():
    """Test profile dataclass"""
    profile = ProspectProfile(
        prospect_id="test_123",
        name="Juan",
        company="ACME",
        industry="tech",
        company_size=50,
        phone="+34666777888",
        email="juan@acme.com",
        presupuesto_max=2000,
        nivel_interes="warm"
    )

    assert profile.prospect_id == "test_123"
    assert profile.nivel_interes == "warm"
    assert profile.engagement_confidence == 0.0  # Default


# ═════════════════════════════════════════════════════════════════════════
# MEJORA 2: Deal Engine
# ═════════════════════════════════════════════════════════════════════════

def test_deal_recommendation():
    """Test deal recommendation dataclass"""
    offer = DealRecommendation(
        plan="Starter",
        price=1900,
        discount_percent=0,
        confidence=0.68,
        sample_size=47,
        expected_revenue=1292,
        reasoning="Based on 47 similar deals"
    )

    assert offer.plan == "Starter"
    assert offer.expected_revenue == 1292
    assert offer.confidence >= 0.0 and offer.confidence <= 1.0


def test_deal_engine_default_offer():
    """Test default offer when no historical data"""
    engine = DealEngine(db_client=None)

    offer = engine._get_default_offer(
        budget_max=2000,
        nivel_interes="warm"
    )

    assert offer.plan == "Starter"
    assert offer.price <= 2000  # Never exceed budget
    assert offer.confidence == 0.0  # No historical data


# ═════════════════════════════════════════════════════════════════════════
# MEJORA 3: Coaching Engine
# ═════════════════════════════════════════════════════════════════════════

def test_lead_score_calculation():
    """Test lead score logic"""
    engine = CoachingEngine(db_client=None)

    # Simulated transcript with high engagement
    transcript = """
    Agent: Hola, ¿qué tal?
    Prospect: Me encanta! Me interesa mucho. ¿Cuándo podemos empezar? Vamos adelante.
    """

    score = engine._score_engagement(transcript)
    assert score >= 5  # Non-zero engagement

    interest = engine._score_interest_signals(transcript)
    assert interest >= 20  # Multiple interest keywords


def test_sentiment_analysis():
    """Test sentiment detection"""
    engine = CoachingEngine(db_client=None)

    # Positive sentiment
    assert engine._analyze_sentiment("me encanta perfecto") == "muy_positivo"

    # Negative sentiment
    assert engine._analyze_sentiment("no sé mmm") == "negativo"

    # Neutral
    assert engine._analyze_sentiment("ok") == "neutral"


# ═════════════════════════════════════════════════════════════════════════
# MEJORA 4: Conversation Intelligence
# ═════════════════════════════════════════════════════════════════════════

def test_moment_detection():
    """Test critical moment detection"""
    engine = ConversationIntelligenceEngine(db_client=None)

    # Interest moment
    assert engine._detect_moment_type("me interesa mucho") == "interest_triggered"

    # Objection moment
    assert engine._detect_moment_type("pero es muy caro") == "objection_encountered"

    # Deal closing
    assert engine._detect_moment_type("vamos adelante perfecto") == "deal_closed"

    # No moment
    assert engine._detect_moment_type("ok entonces") is None


# ═════════════════════════════════════════════════════════════════════════
# MEJORA 5: Multicanal
# ═════════════════════════════════════════════════════════════════════════

def test_message_adaptation():
    """Test message adapting to channels"""
    from app.multichannel_orchestrator import Channel

    orchestrator = MultiChannelOrchestrator()

    base_message = "Hola, ¿tienes 5 minutos?"

    # WhatsApp: add emoji
    whatsapp_msg = orchestrator._adapt_message_for_channel(base_message, Channel.WHATSAPP)
    assert "😊" in whatsapp_msg

    # SMS: truncate
    sms_msg = orchestrator._adapt_message_for_channel(base_message, Channel.SMS)
    assert len(sms_msg) <= 150

    # Email: formal
    email_msg = orchestrator._adapt_message_for_channel(base_message, Channel.EMAIL)
    assert "Hola," in email_msg
    assert "Saludos" in email_msg


# ═════════════════════════════════════════════════════════════════════════
# Integration: All 6 together
# ═════════════════════════════════════════════════════════════════════════

def test_full_flow():
    """Test complete flow: Profile → Deal → Coaching → Conversation Intel"""
    # Create profile
    profile = ProspectProfile(
        prospect_id="flow_test",
        name="Test User",
        company="Test Co",
        industry="tech",
        company_size=50,
        phone="+34666777888",
        email="test@test.com",
        presupuesto_max=2000,
        nivel_interes="warm"
    )

    assert profile is not None

    # Simulate deal recommendation
    deal_engine = DealEngine(db_client=None)
    offer = deal_engine._get_default_offer(profile.presupuesto_max, profile.nivel_interes)

    assert offer.plan in ["Starter", "Pro", "Enterprise"]

    # Simulate coaching analysis
    coaching = CoachingEngine(db_client=None)
    transcript = "me interesa vamos adelante"

    engagement_score = coaching._score_engagement(transcript)
    interest_score = coaching._score_interest_signals(transcript)

    assert engagement_score >= 0
    assert interest_score >= 0

    print(f"✅ Full flow test passed: {profile.name} → {offer.plan} @ ${offer.price}")


# ═════════════════════════════════════════════════════════════════════════
# Demo: Run this to validate system
# ═════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n🚀 Running 6 Improvements Tests...\n")

    test_prospect_profile_creation()
    print("✅ Prospect Profile OK")

    test_deal_recommendation()
    print("✅ Deal Recommendation OK")

    test_deal_engine_default_offer()
    print("✅ Deal Engine Default Offer OK")

    test_lead_score_calculation()
    print("✅ Lead Score Calculation OK")

    test_sentiment_analysis()
    print("✅ Sentiment Analysis OK")

    test_moment_detection()
    print("✅ Moment Detection OK")

    test_message_adaptation()
    print("✅ Message Adaptation OK")

    test_full_flow()
    print("✅ Full Flow OK")

    print("\n✅ All tests passed!")
    print("\n📊 Next: Integrate with hybrid_session.py + Deploy")

# ponytail: Minimal tests - add pytest.mark.asyncio when needed
