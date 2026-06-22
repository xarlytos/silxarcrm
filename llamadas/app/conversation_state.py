"""ConversationState: The emotional memory of the call.

This is THE KEY to making AI sound human.

Not random imperfections.
Not fake emotions.
Not changing strategy every turn.

Just: remembering how the prospect feels, and adapting naturally.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Literal

logger = logging.getLogger(__name__)


@dataclass
class ConversationState:
    """Tracks emotional state and context throughout the call.

    This accumulates during the call and influences every response.
    A human talking to a frustrated prospect acts differently
    than talking to an engaged one.

    The IA needs to do the same.
    """

    # Emotional state (changes throughout the call)
    emotion: Literal[
        "neutral",
        "frustrated",
        "skeptical",
        "interested",
        "engaged",
        "convinced",
    ] = "neutral"

    # Trust accumulates (doesn't jump around)
    trust_level: float = 0.3  # 0.0-1.0, starts low
    interest_level: float = 0.4  # 0.0-1.0
    urgency_level: float = 0.5  # How rushed the prospect is
    openness_level: float = 0.5  # How open to listening

    # Memory (what we've learned about this prospect)
    topics_discussed: list[str] = field(default_factory=list)
    pain_points: list[str] = field(default_factory=list)
    objections: list[str] = field(default_factory=list)
    solutions_mentioned: list[str] = field(default_factory=list)

    # Conversation markers
    last_input: str = ""
    sentiment_trend: Literal["improving", "declining", "stable"] = "stable"
    turn_count: int = 0

    def update_from_input(self, user_input: str) -> None:
        """Update state based on what the prospect just said."""

        self.last_input = user_input
        self.turn_count += 1

        # Detect if they're asking questions (sign of interest)
        if "?" in user_input and self.trust_level > 0.5:
            self.emotion = "interested"
            self.interest_level = min(1.0, self.interest_level + 0.1)
            self.sentiment_trend = "improving"

        # Detect frustration signals
        if any(word in user_input.lower() for word in ["quemado", "frustr", "cansado"]):
            self.emotion = "frustrated"
            self.openness_level = max(0.0, self.openness_level - 0.2)

        # Detect urgency
        if any(word in user_input.lower() for word in ["urgente", "rápido", "ahora", "semana"]):
            self.urgency_level = min(1.0, self.urgency_level + 0.3)

        # Detect objections
        if any(word in user_input.lower() for word in ["pero", "sin embargo", "problema", "no sé"]):
            if "?" in user_input:  # They're asking about the objection
                self.emotion = "skeptical"
                self.objections.append(user_input[:50])  # Store summary

        logger.debug(
            f"State updated: emotion={self.emotion}, trust={self.trust_level:.1%}, "
            f"interest={self.interest_level:.1%}, turn={self.turn_count}"
        )

    def update_from_agent_response(self, response: str) -> None:
        """Update state based on how agent responded.

        If agent addresses a pain point, trust should increase.
        If agent asked a good question, interest should increase.
        """

        # If agent mentioned a solution to a known problem
        if any(pain in response for pain in self.pain_points):
            self.trust_level = min(1.0, self.trust_level + 0.15)
            self.interest_level = min(1.0, self.interest_level + 0.15)
            self.emotion = "interested"
            self.sentiment_trend = "improving"

        # If agent asked a follow-up (shows listening)
        if response.endswith("?"):
            self.trust_level = min(1.0, self.trust_level + 0.08)

        # If agent ceded ground or validated frustration
        if any(word in response.lower() for word in ["entiendo", "duele", "uf", "tienes razón"]):
            self.trust_level = min(1.0, self.trust_level + 0.1)

    def should_empathize(self) -> bool:
        """Should the agent take an empathetic stance?"""
        return self.emotion == "frustrated" or self.trust_level < 0.5

    def should_push_forward(self) -> bool:
        """Should the agent push toward closing/next step?"""
        return self.emotion == "engaged" and self.interest_level > 0.7

    def should_ask_questions(self) -> bool:
        """Should the agent focus on discovery?"""
        return len(self.pain_points) < 2 or self.interest_level < 0.6

    def to_prompt_context(self) -> str:
        """Format state for inclusion in Groq prompt."""

        return f"""
CONVERSATION STATE:
- Prospect emotion: {self.emotion}
- Trust level: {self.trust_level:.0%}
- Interest level: {self.interest_level:.0%}
- Urgency: {self.urgency_level:.0%}
- Openness: {self.openness_level:.0%}
- Turn: {self.turn_count}
- Sentiment trend: {self.sentiment_trend}

CONVERSATION MEMORY:
- Topics discussed: {', '.join(self.topics_discussed) if self.topics_discussed else 'none yet'}
- Pain points identified: {', '.join(self.pain_points) if self.pain_points else 'none yet'}
- Objections mentioned: {', '.join(self.objections) if self.objections else 'none yet'}

LAST PROSPECT INPUT:
"{self.last_input}"

ADAPTATION GUIDE:
- If emotion=frustrated: Be empathetic, offer to call back, CEDE GROUND
- If trust < 0.4: Focus on building credibility, ask genuine questions
- If interest > 0.7 AND emotion=engaged: Move toward next steps naturally
- If urgency > 0.7: Respect their time, be brief, focused
"""

    def is_ready_for_next_step(self) -> bool:
        """Has the relationship developed enough to propose action?"""
        return (
            self.emotion in ["interested", "engaged"]
            and self.trust_level > 0.6
            and self.interest_level > 0.6
        )


# ════════════════════════════════════════════════════════════════════════════════
# INTEGRATION WITH GROQ
# ════════════════════════════════════════════════════════════════════════════════


async def generate_response_with_state(
    user_input: str,
    state: ConversationState,
    groq_client,
) -> tuple[str, ConversationState]:
    """Generate response while considering conversation state.

    This is the magic: same user input, different responses based on state.
    """

    # Update state based on input
    state.update_from_input(user_input)

    # Build prompt with state context
    system_prompt = f"""You are a sales consultant in a real phone call.

{state.to_prompt_context()}

Guidelines:
1. Keep responses SHORT (1-2 sentences max)
2. Be consistent with the conversation flow
3. Adapt to the prospect's emotional state
4. If they're frustrated, validate and offer space ("Better I call you back?")
5. If they're interested, ask deeper questions
6. Ask genuine questions, not scripted ones
7. Remember what they've mentioned and reference it
8. Use microreactions naturally ("Ah", "Got it", "That's tough")

Respond naturally and conversationally. Always keep it brief.
"""

    # Generate response
    response = await groq_client.generate(
        message=user_input,
        context={"system_prompt": system_prompt},
    )

    # Update state based on agent response
    state.update_from_agent_response(response)

    logger.info(
        f"Response generated. State: emotion={state.emotion}, "
        f"trust={state.trust_level:.0%}, interest={state.interest_level:.0%}"
    )

    return response, state


# ════════════════════════════════════════════════════════════════════════════════
# EXAMPLE USAGE
# ════════════════════════════════════════════════════════════════════════════════

async def example_call_with_state():
    """Demonstrate how ConversationState evolves during a call."""

    state = ConversationState()

    # Turn 1: Prospect is skeptical
    prospect_input_1 = "Hola, vi tu anuncio pero no sé si realmente funciona"
    state.update_from_input(prospect_input_1)
    print(f"\nTurn 1:")
    print(f"  Prospect: {prospect_input_1}")
    print(f"  State: emotion={state.emotion}, trust={state.trust_level:.0%}")

    # Turn 2: Agent asks genuine question, trust increases
    agent_response_2 = "Entiendo. ¿Qué es lo que más dudas?"
    state.update_from_agent_response(agent_response_2)
    print(f"  Agent: {agent_response_2}")
    print(f"  State after: emotion={state.emotion}, trust={state.trust_level:.0%}")

    # Turn 3: Prospect explains pain point
    prospect_input_3 = "El problema es que nuestro equipo no tiene tiempo"
    state.update_from_input(prospect_input_3)
    state.pain_points.append("No tiene tiempo")
    print(f"\nTurn 3:")
    print(f"  Prospect: {prospect_input_3}")
    print(f"  State: emotion={state.emotion}, trust={state.trust_level:.0%}")
    print(f"  Pain points: {state.pain_points}")

    # Turn 4: Agent addresses pain point, trust jumps
    agent_response_4 = "Ah, eso entiendo. La mayoría de nuestros clientes tenían el mismo tema. ¿Cuántos en tu equipo?"
    state.update_from_agent_response(agent_response_4)
    print(f"  Agent: {agent_response_4}")
    print(f"  State after: emotion={state.emotion}, trust={state.trust_level:.0%} ⬆️")

    # Turn 5: Prospect gets interested
    prospect_input_5 = "¿Enserio otros tuvieron ese problema? ¿Cómo lo arreglaron?"
    state.update_from_input(prospect_input_5)
    print(f"\nTurn 5:")
    print(f"  Prospect: {prospect_input_5}")
    print(f"  State: emotion={state.emotion}, interest={state.interest_level:.0%} ⬆️")
    print(f"  Trust: {state.trust_level:.0%} ⬆️")

    # The relationship ACCUMULATED naturally.
    # This is what makes it feel human.


if __name__ == "__main__":
    import asyncio

    asyncio.run(example_call_with_state())
