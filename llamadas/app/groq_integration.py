"""Integration example: GroqAgent + Twilio voice pipeline.

Cómo usar GroqAgent en el flujo de llamadas:

1. Voice STT (Twilio/ElevenLabs) → transcribe user_message
2. GroqAgent.generate_response() → genera respuesta SDR
3. Voice TTS (ElevenLabs) → sintetiza respuesta en audio
4. Back to step 1 (loop conversacional)
"""
from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from app.groq_client import GroqAgent, LatencyMetrics

if TYPE_CHECKING:
    from app.conversation.state import CallContext

logger = logging.getLogger(__name__)


class GroqVoicePipeline:
    """Wrapper: GroqAgent + metrics + fallback integration."""

    def __init__(self, groq_agent: GroqAgent):
        """Initialize pipeline with configured GroqAgent."""
        self.groq = groq_agent
        self.latency_history: list[LatencyMetrics] = []

    async def process_user_message(
        self,
        user_message: str,
        call_context: CallContext,
    ) -> str:
        """Process transcribed user message through Groq.

        Args:
            user_message: Transcribed text from Twilio STT
            call_context: Conversation state (prospect, stage, history, etc)

        Returns:
            SDR response text (ready for TTS)
        """
        context = {
            "prospect_name": call_context.prospect_name,
            "company": call_context.company_name,
            "niche": call_context.niche,
            "call_duration_ms": int(call_context.call_duration_seconds * 1000),
            "previous_messages": call_context.recent_messages[-5:],  # last 5 turns
            "sentiment": call_context.sentiment,  # positive, neutral, negative
            "pain_identified": call_context.pain_points is not None,
            "budget_range": call_context.budget_range,
        }

        response_text, metrics = await self.groq.generate_response(
            user_message=user_message,
            context=context,
            stage=call_context.current_stage,
        )

        # Track latency for observability
        self.latency_history.append(metrics)
        self._log_latency_alert(metrics)

        return response_text

    def _log_latency_alert(self, metrics: LatencyMetrics):
        """Log warning if TTFT exceeds target (<50ms)."""
        if metrics.ttft_ms > GroqAgent.TARGET_TTFT_MS:
            logger.warning(
                f"TTFT alert: {metrics.ttft_ms:.0f}ms (target: <{GroqAgent.TARGET_TTFT_MS}ms)"
            )

    def get_latency_stats(self) -> dict:
        """Return aggregated latency statistics for monitoring."""
        if not self.latency_history:
            return {}

        ttft_values = [m.ttft_ms for m in self.latency_history]
        total_values = [m.total_time_ms for m in self.latency_history]
        tps_values = [m.tokens_per_second for m in self.latency_history]

        return {
            "avg_ttft_ms": sum(ttft_values) / len(ttft_values),
            "max_ttft_ms": max(ttft_values),
            "min_ttft_ms": min(ttft_values),
            "avg_total_ms": sum(total_values) / len(total_values),
            "avg_tps": sum(tps_values) / len(tps_values),
            "samples": len(self.latency_history),
        }


# Example usage (no ejecutar, solo referencia)
async def example_usage():
    """Example: how to integrate GroqAgent into voice pipeline."""
    from app.config import settings

    # Initialize
    groq_api_key = settings.groq_api_key  # from .env or AWS Secrets Manager
    groq_agent = GroqAgent(api_key=groq_api_key, model="mixtral-8x7b-32768")
    pipeline = GroqVoicePipeline(groq_agent)

    # In real flow (inside WebSocket handler):
    # 1. Twilio sends: {"event": "media", "media": {"payload": "<audio_chunk>"}}
    # 2. STT (ElevenLabs or Gemini): audio_chunk → user_message (transcribed)
    # 3. Call pipeline:
    user_message = "Sí, nos pasa todas las semanas"
    call_context = None  # get from session state

    response_text = await pipeline.process_user_message(user_message, call_context)
    print(f"SDR: {response_text}")

    # 4. TTS (ElevenLabs): response_text → audio → Twilio stream
    # 5. Loop back to step 2

    # Check latency
    stats = pipeline.get_latency_stats()
    print(f"Latency stats: {stats}")

    # Cleanup
    await groq_agent.close()


# --- Config extension (add to config.py settings) ---
"""
Add to app/config.py Settings class:

    # --- Groq ---
    groq_api_key: str = ""
    groq_model: str = "mixtral-8x7b-32768"
    groq_timeout_seconds: int = 8
    groq_enabled: bool = False  # fallback to Gemini if disabled
"""
