"""ElevenLabs Optimizations Configuration — production-ready settings.

Maps optimization strategies to different use cases and integrates with
existing groq_client.py + router.py + media_stream.py infrastructure.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.elevenlabs_streaming_optimizer import (
    ElevenLabsStreamingOptimizer,
    OptimizationConfig,
)


@dataclass
class OptimizationProfile:
    """A preset optimization profile for different scenarios."""

    name: str
    config: OptimizationConfig
    description: str


# ════════════════════════════════════════════════════════════════════════════════
# PRESET OPTIMIZATION PROFILES
# ════════════════════════════════════════════════════════════════════════════════

PROFILE_ULTRA_FAST = OptimizationProfile(
    name="ultra_fast",
    config=OptimizationConfig(
        voice_id="ErXwobaYiN019PkySvjV",
        model_id="eleven_flash_v2_5",
        optimize_streaming_latency=4,  # Maximum speed (1-4)
        stability=0.5,
        similarity_boost=0.75,
        use_voice_clone=False,  # Default voice (faster)
        chunk_by_sentence=True,  # Sentence-level streaming
        chunk_buffer_ms=30,  # Aggressive (30ms buffer)
        cache_enabled=True,  # Cache common phrases
    ),
    description="🚀 Ultra-low latency for cold outbound. ~75ms TTFA. Speed > quality.",
)

PROFILE_BALANCED = OptimizationProfile(
    name="balanced",
    config=OptimizationConfig(
        voice_id="ErXwobaYiN019PkySvjV",
        model_id="eleven_flash_v2_5",
        optimize_streaming_latency=3,  # Speed-first (but balanced)
        stability=0.6,
        similarity_boost=0.8,
        use_voice_clone=False,  # Default voice
        chunk_by_sentence=True,
        chunk_buffer_ms=50,  # Balanced (50ms buffer)
        cache_enabled=True,
    ),
    description="⚖️ Balanced latency/quality for inbound calls. ~100ms TTFA.",
)

PROFILE_PREMIUM = OptimizationProfile(
    name="premium",
    config=OptimizationConfig(
        voice_id="ErXwobaYiN019PkySvjV",
        model_id="eleven_multilingual_v3",  # Higher quality model
        optimize_streaming_latency=2,  # Quality-first
        stability=0.7,
        similarity_boost=0.85,
        use_voice_clone=False,  # Could use PVC here if quality needed
        chunk_by_sentence=True,
        chunk_buffer_ms=100,  # Conservative (100ms buffer)
        cache_enabled=True,
    ),
    description="👑 Premium quality for demos/enterprise. ~250ms TTFA. Quality > speed.",
)

PROFILE_DEMO = OptimizationProfile(
    name="demo",
    config=OptimizationConfig(
        voice_id="ErXwobaYiN019PkySvjV",
        model_id="eleven_multilingual_v3",
        optimize_streaming_latency=1,  # No optimization (best quality)
        stability=0.75,
        similarity_boost=0.9,
        use_voice_clone=False,
        chunk_by_sentence=False,  # Wait for full response
        chunk_buffer_ms=200,
        cache_enabled=False,  # Don't cache (fresh response)
    ),
    description="🎬 Highest quality for investor demos. Speed not critical.",
)


PROFILES = {
    "ultra_fast": PROFILE_ULTRA_FAST,
    "balanced": PROFILE_BALANCED,
    "premium": PROFILE_PREMIUM,
    "demo": PROFILE_DEMO,
}


# ════════════════════════════════════════════════════════════════════════════════
# DYNAMIC PROFILE SELECTION
# ════════════════════════════════════════════════════════════════════════════════

def select_profile(call_context: dict) -> str:
    """
    Intelligently select optimization profile based on call context.

    Inputs:
    - customer_tier: "standard" | "premium" | "enterprise"
    - call_type: "cold_outbound" | "inbound" | "demo" | "support"
    - priority: "speed" | "balanced" | "quality"
    """

    customer_tier = call_context.get("customer_tier", "standard")
    call_type = call_context.get("call_type", "inbound")
    priority = call_context.get("priority", "balanced")

    # Rule 1: Demos always use highest quality
    if call_type == "demo":
        return "demo"

    # Rule 2: Enterprise customers get premium
    if customer_tier == "enterprise":
        return "premium"

    # Rule 3: Cold outbound prioritizes speed
    if call_type == "cold_outbound":
        return "ultra_fast"

    # Rule 4: User-specified priority
    if priority == "speed":
        return "ultra_fast"
    elif priority == "quality":
        return "premium"

    # Default: balanced
    return "balanced"


# ════════════════════════════════════════════════════════════════════════════════
# INTEGRATION WITH EXISTING PIPELINE
# ════════════════════════════════════════════════════════════════════════════════

async def get_optimizer_for_call(
    api_key: str,
    call_context: dict,
) -> ElevenLabsStreamingOptimizer:
    """
    Factory: create optimizer instance for a specific call.

    Usage:
    ```python
    optimizer = await get_optimizer_for_call(
        api_key=settings.elevenlabs_api_key,
        call_context={
            "customer_tier": "premium",
            "call_type": "inbound",
        }
    )
    async for audio_chunk in optimizer.synthesize_stream(text):
        await websocket.send_bytes(audio_chunk)
    ```
    """

    profile_name = select_profile(call_context)
    profile = PROFILES[profile_name]

    logger.info(f"Selected profile: {profile_name} — {profile.description}")

    return ElevenLabsStreamingOptimizer(api_key=api_key, config=profile.config)


# ════════════════════════════════════════════════════════════════════════════════
# INTEGRATION WITH media_stream.py
# ════════════════════════════════════════════════════════════════════════════════

"""
Example integration in media_stream.py:

    async def handle_media_stream(websocket: WebSocket):
        context = extract_context_from_params(websocket)

        # Get optimized TTS
        tts_optimizer = await get_optimizer_for_call(
            api_key=settings.elevenlabs_api_key,
            call_context={
                "customer_tier": context.get("tier", "standard"),
                "call_type": "inbound",
            }
        )

        # Process message
        transcript = await stt.transcribe(audio)

        # Generate response with Groq
        response = await groq_client.generate(transcript)

        # Stream audio (sentence by sentence, with caching)
        async for audio_chunk in tts_optimizer.synthesize_stream(response):
            await websocket.send_bytes(audio_chunk)
"""


# ════════════════════════════════════════════════════════════════════════════════
# METRICS & MONITORING
# ════════════════════════════════════════════════════════════════════════════════

@dataclass
class OptimizationMetrics:
    """Track optimization effectiveness."""

    profile_used: str
    cache_hits: int = 0
    cache_misses: int = 0
    total_ttfa_ms: float = 0
    chunks_streamed: int = 0

    @property
    def cache_hit_rate(self) -> float:
        """Percentage of cache hits."""
        total = self.cache_hits + self.cache_misses
        return (self.cache_hits / total * 100) if total > 0 else 0

    @property
    def avg_ttfa_ms(self) -> float:
        """Average time-to-first-audio."""
        return self.total_ttfa_ms / self.chunks_streamed if self.chunks_streamed > 0 else 0


class MetricsCollector:
    """Collect optimization metrics for monitoring."""

    def __init__(self):
        self.metrics: dict[str, OptimizationMetrics] = {}

    def record_call(
        self,
        profile: str,
        cache_hits: int,
        cache_misses: int,
        ttfa_ms: float,
        chunks: int,
    ):
        """Record metrics for a call."""

        if profile not in self.metrics:
            self.metrics[profile] = OptimizationMetrics(profile_used=profile)

        m = self.metrics[profile]
        m.cache_hits += cache_hits
        m.cache_misses += cache_misses
        m.total_ttfa_ms += ttfa_ms
        m.chunks_streamed += chunks

    def report(self) -> dict:
        """Generate report of optimization effectiveness."""

        return {
            profile: {
                "cache_hit_rate": f"{m.cache_hit_rate:.1f}%",
                "avg_ttfa_ms": f"{m.avg_ttfa_ms:.0f}ms",
                "total_hits": m.cache_hits,
                "total_misses": m.cache_misses,
                "chunks_streamed": m.chunks_streamed,
            }
            for profile, m in self.metrics.items()
        }


# ════════════════════════════════════════════════════════════════════════════════
# CONFIGURATION FOR config.py
# ════════════════════════════════════════════════════════════════════════════════

"""
Add these settings to config.py (pydantic Settings):

class Settings(BaseSettings):
    # ElevenLabs optimizations
    elevenlabs_optimization_profile: str = "balanced"  # ultra_fast | balanced | premium | demo
    elevenlabs_optimize_streaming_latency: int = 3  # 1-4 (higher = faster)
    elevenlabs_chunk_by_sentence: bool = True
    elevenlabs_chunk_buffer_ms: int = 50
    elevenlabs_cache_enabled: bool = True

    model_config = SettingsConfigDict(env_prefix="ELEVENLABS_")

Then in .env:
    ELEVENLABS_OPTIMIZATION_PROFILE=balanced
    ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=3
    ELEVENLABS_CHUNK_BY_SENTENCE=true
    ELEVENLABS_CHUNK_BUFFER_MS=50
    ELEVENLABS_CACHE_ENABLED=true
"""

import logging

logger = logging.getLogger(__name__)
