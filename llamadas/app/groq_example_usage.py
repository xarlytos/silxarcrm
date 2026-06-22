"""Real-world usage examples para GroqAgent.

Cómo usar GroqAgent en diferentes escenarios dentro del sistema de llamadas.
"""
from __future__ import annotations

import asyncio
from app.groq_client import GroqAgent
from app.groq_integration import GroqVoicePipeline
from app.groq_niche_prompts import enrich_system_prompt_with_niche


# Example 1: Simple synchronous wrapper
async def example_single_response():
    """Generar una respuesta SDR simple."""

    # Initialize agent (typically done once at app startup)
    agent = GroqAgent(api_key="gsk_test_key_here")

    # Context from your call system
    context = {
        "prospect_name": "Juan García",
        "company": "Clínica Dental Sonrisa",
        "niche": "dentista",
        "call_duration_ms": 45000,  # 45 seconds into call
        "sentiment": "positive",    # user seems interested
        "pain_identified": False,   # still in discovery
    }

    user_message = "Sí, eso nos pasa todo el tiempo"

    # Generate response
    response_text, metrics = await agent.generate_response(
        user_message=user_message,
        context=context,
        stage="discovery",
    )

    print(f"Prospect: {user_message}")
    print(f"SDR: {response_text}")
    print(f"Latency: TTFT={metrics.ttft_ms:.0f}ms, Total={metrics.total_time_ms:.0f}ms")

    await agent.close()


# Example 2: Full conversation flow
async def example_conversation_flow():
    """Simular una conversación completa (greeting → discovery → budget → demo)."""

    agent = GroqAgent(api_key="gsk_test_key")

    # Simulated conversation turns
    turns = [
        {
            "stage": "greeting",
            "user_message": "Hola, quién eres?",
        },
        {
            "stage": "discovery",
            "user_message": "Sí, perdemos muchas citas",
            "pain_identified": False,
        },
        {
            "stage": "discovery",
            "user_message": "No sé, como 10-15 a la semana",
            "pain_identified": True,
        },
        {
            "stage": "budget",
            "user_message": "¿Cuánto cuesta?",
        },
        {
            "stage": "demo",
            "user_message": "Me parece bien, pero tengo que consultarlo",
        },
    ]

    context = {
        "prospect_name": "María López",
        "company": "Clínica ABC",
        "niche": "dentista",
        "call_duration_ms": 0,
        "sentiment": "neutral",
        "pain_identified": False,
        "previous_messages": [],
    }

    for turn in turns:
        # Update context
        context["stage"] = turn.get("stage")
        context["call_duration_ms"] += 10000
        context["pain_identified"] = turn.get("pain_identified", context["pain_identified"])
        context["previous_messages"].append(turn["user_message"])

        # Generate response
        response_text, metrics = await agent.generate_response(
            user_message=turn["user_message"],
            context=context,
            stage=turn["stage"],
        )

        print(f"\n[{turn['stage'].upper()}]")
        print(f"Prospect: {turn['user_message']}")
        print(f"SDR: {response_text}")
        print(f"TTFT: {metrics.ttft_ms:.0f}ms")

    await agent.close()


# Example 3: WebSocket handler integration
async def example_websocket_integration():
    """Cómo integrar en el handler de WebSocket de Twilio."""

    from fastapi import WebSocket

    class TwilioVoiceHandler:
        def __init__(self):
            # Initialize once per app startup
            self.groq_agent = GroqAgent(api_key="gsk_test_key")
            self.groq_pipeline = GroqVoicePipeline(self.groq_agent)

        async def handle_websocket(self, websocket: WebSocket):
            """Handle incoming Twilio media stream."""
            await websocket.accept()

            # Simulated call context (would come from your state management)
            class MockCallContext:
                prospect_name = "Test Prospect"
                company_name = "Test Company"
                niche = "dentista"
                call_duration_seconds = 0.0
                sentiment = "neutral"
                pain_points = None
                budget_range = None
                current_stage = "greeting"
                recent_messages = []

            call_context = MockCallContext()

            try:
                async for message in websocket.iter_json():
                    if message.get("event") == "media":
                        # 1. Receive audio from Twilio
                        audio_payload = message["media"]["payload"]

                        # 2. STT: transcribe audio to text
                        # (using ElevenLabs, Gemini, or your STT service)
                        user_message = await self.transcribe_audio(audio_payload)

                        # 3. Update call context
                        call_context.call_duration_seconds += 0.02
                        call_context.recent_messages.append(user_message)

                        # 4. Generate SDR response via Groq
                        response_text = await self.groq_pipeline.process_user_message(
                            user_message=user_message,
                            call_context=call_context,
                        )

                        # 5. TTS: synthesize response to audio
                        audio = await self.synthesize_audio(response_text)

                        # 6. Send back to Twilio
                        await self.send_audio_to_twilio(websocket, audio)

                        # 7. Log latency
                        stats = self.groq_pipeline.get_latency_stats()
                        print(f"Call latency: {stats['avg_ttft_ms']:.0f}ms TTFT")

            finally:
                await self.groq_agent.close()

        async def transcribe_audio(self, payload: str) -> str:
            """Transcribe audio using ElevenLabs or Gemini STT."""
            # Placeholder
            return "Hola, ¿cuánto cuesta?"

        async def synthesize_audio(self, text: str) -> str:
            """Synthesize audio using ElevenLabs TTS."""
            # Placeholder
            return "base64_encoded_audio"

        async def send_audio_to_twilio(self, websocket, audio: str):
            """Send audio back to Twilio stream."""
            await websocket.send_json({
                "event": "media",
                "media": {
                    "payload": audio,
                },
            })

    # Usage
    handler = TwilioVoiceHandler()
    # await handler.handle_websocket(websocket)


# Example 4: Niche-specific response
async def example_niche_specific():
    """Usar prompts específicos por nicho (dentista vs. peluquería)."""

    from app.groq_niche_prompts import (
        get_niche_discovery_prompt,
        get_niche_pain_points,
    )

    agent = GroqAgent(api_key="gsk_test_key")

    niches_to_test = ["dentista", "peluqueria_canina", "gimnasio"]

    for niche in niches_to_test:
        context = {
            "prospect_name": "Test User",
            "company": "Test Company",
            "niche": niche,
            "call_duration_ms": 30000,
            "sentiment": "neutral",
            "pain_identified": False,
        }

        # Get niche-specific pain points
        pain_points = get_niche_pain_points(niche)
        print(f"\n=== {niche.upper()} ===")
        print(f"Typical pain points:")
        for pain in pain_points[:2]:
            print(f"  • {pain}")

        # Generate response
        response_text, metrics = await agent.generate_response(
            user_message="Cuéntame sobre tu negocio",
            context=context,
            stage="discovery",
        )

        print(f"SDR: {response_text}")

    await agent.close()


# Example 5: Error handling and fallback
async def example_error_handling():
    """Demostrar error handling y fallback automático."""

    agent = GroqAgent(
        api_key="gsk_invalid_key",  # This will fail
        timeout_seconds=2,           # Tight timeout
    )

    context = {
        "prospect_name": "Test",
        "company": "Test",
        "niche": "dentista",
        "call_duration_ms": 10000,
        "sentiment": "neutral",
        "pain_identified": False,
    }

    try:
        response_text, metrics = await agent.generate_response(
            user_message="Hola!",
            context=context,
            stage="greeting",
        )

        print(f"Response: {response_text}")

        # If we get here, it used the fallback (no crash!)
        if metrics.ttft_ms >= 2000:
            print(f"WARNING: Used fallback due to timeout/error (latency was {metrics.ttft_ms:.0f}ms)")
        else:
            print(f"Success! TTFT: {metrics.ttft_ms:.0f}ms")

    finally:
        await agent.close()


# Example 6: Batch processing (analyze multiple call transcripts)
async def example_batch_processing():
    """Procesar múltiples transcripciones de llamadas."""

    agent = GroqAgent(api_key="gsk_test_key")

    # Simulated call transcripts
    calls = [
        {
            "prospect_name": "Clínica A",
            "niche": "dentista",
            "messages": [
                "Sí, perdemos pacientes constantemente",
                "Unos 20 al mes que no regresan",
                "Pues unos 80-100 EUR por cita",
            ],
        },
        {
            "prospect_name": "Peluquería B",
            "niche": "peluqueria_canina",
            "messages": [
                "Las cancelaciones son un problema",
                "5-6 por día en promedio",
                "Cada corte son 45 EUR",
            ],
        },
    ]

    for call in calls:
        print(f"\n=== {call['prospect_name']} ({call['niche']}) ===")

        context = {
            "prospect_name": call["prospect_name"],
            "company": call["prospect_name"],
            "niche": call["niche"],
            "call_duration_ms": 0,
            "sentiment": "neutral",
            "pain_identified": False,
            "previous_messages": [],
        }

        for message in call["messages"]:
            # Determine stage based on message content
            if "perdemos" in message or "cancelaciones" in message:
                stage = "discovery"
            elif "euros" in message or "cuesta" in message:
                stage = "quantification"
            else:
                stage = "discovery"

            response_text, metrics = await agent.generate_response(
                user_message=message,
                context=context,
                stage=stage,
            )

            print(f"Prospect: {message}")
            print(f"SDR: {response_text}")
            context["previous_messages"].append(message)
            context["call_duration_ms"] += 10000

    await agent.close()


# Example 7: Async context manager
async def example_context_manager():
    """Usar GroqAgent como async context manager (cleanup automático)."""

    async with GroqAgent(api_key="gsk_test_key") as agent:
        context = {
            "prospect_name": "John",
            "company": "Company",
            "niche": "dentista",
            "call_duration_ms": 10000,
            "sentiment": "positive",
            "pain_identified": True,
        }

        response_text, metrics = await agent.generate_response(
            user_message="¿Puedo hablar con el gerente?",
            context=context,
            stage="closing",
        )

        print(f"Response: {response_text}")

    # Agent automatically closed (no need for await agent.close())


# Run examples
if __name__ == "__main__":
    print("Example 1: Single Response")
    asyncio.run(example_single_response())

    print("\n" + "="*50)
    print("Example 2: Conversation Flow")
    asyncio.run(example_conversation_flow())

    print("\n" + "="*50)
    print("Example 4: Niche-Specific")
    asyncio.run(example_niche_specific())

    print("\n" + "="*50)
    print("Example 6: Batch Processing")
    asyncio.run(example_batch_processing())
