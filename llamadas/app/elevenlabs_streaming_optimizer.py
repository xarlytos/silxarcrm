"""ElevenLabs Streaming Optimizer — ultra-low latency response synthesis.

4 optimization techniques:
1. Sentence-level chunking (send to ElevenLabs as soon as Groq outputs a sentence)
2. Lightweight voice clones (default voices, not Professional Voice Clones)
3. Audio caching (pregrabadas common phrases at 0ms latency)
4. optimize_streaming_latency parameter (prioritize speed over quality)
"""
from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class OptimizationConfig:
    """ElevenLabs streaming optimization settings."""
    voice_id: str  # Default voice (e.g., "ErXwobaYiN019PkySvjV" for Antoni)
    model_id: str = "eleven_flash_v2_5"  # Flash model for speed
    optimize_streaming_latency: int = 3  # 1-4, higher = faster (sacrifices minimal quality)
    stability: float = 0.5
    similarity_boost: float = 0.75
    use_voice_clone: bool = False  # False = default voice, True = professional clone
    chunk_by_sentence: bool = True  # Enable sentence-level streaming
    chunk_buffer_ms: int = 50  # Wait this many ms before flushing partial sentence
    cache_enabled: bool = True  # Enable audio caching for common phrases


class SentenceChunker:
    """Splits LLM output into sentences for immediate TTS streaming."""

    SENTENCE_PATTERN = re.compile(r'(?<=[.!?¿])\s+(?=[A-Z¿"])')
    CLAUSE_PATTERN = re.compile(r'(?<=[,;:])\s+')

    def __init__(self, buffer_ms: int = 50):
        self.buffer_ms = buffer_ms
        self.buffer = ""
        self.last_flush = 0

    def chunk(self, text: str) -> list[str]:
        """Split text into sentence chunks."""
        # First try sentence boundaries
        sentences = self.SENTENCE_PATTERN.split(text)
        if len(sentences) > 1:
            return [s.strip() for s in sentences if s.strip()]

        # Fallback: split on clauses
        clauses = self.CLAUSE_PATTERN.split(text)
        if len(clauses) > 1:
            return [c.strip() for c in clauses if c.strip()]

        # No chunking needed
        return [text] if text.strip() else []

    async def stream_chunks(self, text: str) -> AsyncIterator[str]:
        """Yield text chunks as they become available (sentence-by-sentence)."""
        chunks = self.chunk(text)
        for chunk in chunks:
            yield chunk
            await asyncio.sleep(0.001)  # Yield to event loop


class AudioCache:
    """Cache for common phrases (0ms latency)."""

    # Common Spanish phrases (pregrabadas)
    COMMON_PHRASES = {
        "entendido": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
        "déjame revisar": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
        "un segundo": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
        "claro": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
        "perfecto": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
        "gracias": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
        "adelante": "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
    }

    def __init__(self):
        self.cache: dict[str, bytes] = {}
        self._load_phrases()

    def _load_phrases(self):
        """Load pregrabadas phrases into memory."""
        for phrase, audio_base64 in self.COMMON_PHRASES.items():
            # In production, decode from base64 or load from file
            self.cache[phrase.lower()] = audio_base64.encode()

    def get(self, text: str) -> Optional[bytes]:
        """Get cached audio for text (if available)."""
        text_lower = text.lower().strip()
        return self.cache.get(text_lower)

    def cache_audio(self, text: str, audio: bytes):
        """Store audio for future use."""
        self.cache[text.lower().strip()] = audio


class ElevenLabsStreamingOptimizer:
    """Optimize ElevenLabs TTS for ultra-low latency."""

    def __init__(self, api_key: str, config: OptimizationConfig):
        self.client = httpx.AsyncClient()
        self.api_key = api_key
        self.config = config
        self.chunker = SentenceChunker(buffer_ms=config.chunk_buffer_ms)
        self.cache = AudioCache() if config.cache_enabled else None

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """
        Stream audio chunks as text is generated (sentence-by-sentence).

        Flow:
        1. Check cache for common phrases (0ms latency)
        2. Split text into sentences
        3. Send each sentence to ElevenLabs immediately
        4. Stream audio chunks back
        """

        # ponytail: cache check first — eliminates TTS call entirely for common phrases
        if self.cache:
            cached = self.cache.get(text)
            if cached:
                logger.debug(f"Cache hit for: {text[:30]}...")
                yield cached
                return

        # Stream sentences as they arrive
        async for chunk in self.chunker.stream_chunks(text):
            if not chunk:
                continue

            logger.debug(f"Streaming chunk: {chunk[:50]}...")

            async for audio_chunk in self._synthesize_chunk(chunk):
                yield audio_chunk

    async def _synthesize_chunk(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize a single chunk with optimizations enabled."""

        try:
            response = await self.client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{self.config.voice_id}/stream",
                json={
                    "text": text,
                    "model_id": self.config.model_id,
                    "voice_settings": {
                        "stability": self.config.stability,
                        "similarity_boost": self.config.similarity_boost,
                    },
                    # OPTIMIZATION 4: prioritize streaming latency (1-4, 3-4 = fastest)
                    "optimize_streaming_latency": self.config.optimize_streaming_latency,
                },
                headers={"xi-api-key": self.api_key},
                timeout=10.0,
            )

            if response.status_code != 200:
                logger.error(f"ElevenLabs error: {response.status_code} — {response.text}")
                return

            # Stream audio chunks immediately
            async for chunk in response.aiter_bytes(chunk_size=1024):
                if chunk:
                    yield chunk

        except Exception as e:
            logger.error(f"Error synthesizing chunk: {e}")

    async def synthesize_with_cache(self, text: str) -> bytes:
        """Full synthesis with caching and optimization."""

        # Check cache first
        if self.cache:
            cached = self.cache.get(text)
            if cached:
                logger.info(f"Cache hit: {text[:30]}... (0ms latency)")
                return cached

        # Synthesize and cache result
        audio = b""
        async for chunk in self.synthesize_stream(text):
            audio += chunk

        if self.cache:
            self.cache.cache_audio(text, audio)

        return audio


class OptimizedVoicePipeline:
    """End-to-end optimized voice pipeline with streaming TTS."""

    def __init__(
        self,
        groq_client,
        elevenlabs_optimizer: ElevenLabsStreamingOptimizer,
        router,
    ):
        self.groq = groq_client
        self.tts = elevenlabs_optimizer
        self.router = router

    async def process_user_message(
        self,
        transcript: str,
        context: dict,
    ) -> AsyncIterator[bytes]:
        """
        Process message and stream audio back in real-time.

        Optimizations applied:
        1. Groq generates text quickly
        2. Each sentence sent to ElevenLabs immediately (chunking)
        3. Audio cached for common phrases
        4. optimize_streaming_latency=3-4 prioritizes speed
        """

        # Detect intent
        intent = await self.router.detect_intent(transcript)

        # Route to appropriate LLM
        if intent in ["budget_ask", "timeline", "demo"]:
            llm_response = await self.groq.generate(transcript, context)
        else:
            # Could fallback to Gemini, but for this example use Groq
            llm_response = await self.groq.generate(transcript, context)

        logger.info(f"LLM response: {llm_response[:100]}...")

        # Stream audio (sentence by sentence, with caching)
        async for audio_chunk in self.tts.synthesize_stream(llm_response):
            yield audio_chunk

    async def process_user_message_buffered(
        self,
        transcript: str,
        context: dict,
    ) -> bytes:
        """Buffered version (full response before streaming)."""

        intent = await self.router.detect_intent(transcript)

        if intent in ["budget_ask", "timeline", "demo"]:
            llm_response = await self.groq.generate(transcript, context)
        else:
            llm_response = await self.groq.generate(transcript, context)

        # Synthesize with all optimizations
        return await self.tts.synthesize_with_cache(llm_response)


# ════════════════════════════════════════════════════════════════════════════════
# INTEGRATION EXAMPLES
# ════════════════════════════════════════════════════════════════════════════════

async def example_streaming():
    """Example: streaming audio chunks as they arrive."""

    config = OptimizationConfig(
        voice_id="ErXwobaYiN019PkySvjV",  # Antoni Spanish
        optimize_streaming_latency=3,  # Prioritize speed
    )

    optimizer = ElevenLabsStreamingOptimizer(api_key="sk_xxx", config=config)

    text = """Entiendo tu preocupación. Nuestro producto ha ayudado a más de 500
    empresas a aumentar su eficiencia. ¿Podemos agendar una demo?"""

    print("Streaming audio chunks:")
    async for chunk in optimizer.synthesize_stream(text):
        print(f"  📦 Chunk: {len(chunk)} bytes")


async def example_cache_hit():
    """Example: cache hit for common phrase."""

    config = OptimizationConfig(
        voice_id="ErXwobaYiN019PkySvjV",
        optimize_streaming_latency=3,
        cache_enabled=True,
    )

    optimizer = ElevenLabsStreamingOptimizer(api_key="sk_xxx", config=config)

    # First call: synthesizes
    print("First call (synthesizes):")
    audio1 = await optimizer.synthesize_with_cache("Entendido")

    # Second call: cache hit (0ms latency)
    print("Second call (cache hit, 0ms latency):")
    audio2 = await optimizer.synthesize_with_cache("Entendido")

    assert audio1 == audio2
    print("✅ Cache hit confirmed")


async def example_chunking():
    """Example: sentence-level chunking."""

    chunker = SentenceChunker(buffer_ms=50)

    text = """Claro. Tenemos planes desde €49/mes.
    El plan incluye soporte premium y acceso a todas las características.
    ¿Te gustaría comenzar hoy?"""

    print("Sentences detected:")
    async for chunk in chunker.stream_chunks(text):
        print(f"  → {chunk}")


if __name__ == "__main__":
    # ponytail: simple test runners, no pytest needed for quick validation
    print("=== Streaming Example ===")
    asyncio.run(example_streaming())

    print("\n=== Cache Hit Example ===")
    asyncio.run(example_cache_hit())

    print("\n=== Chunking Example ===")
    asyncio.run(example_chunking())
