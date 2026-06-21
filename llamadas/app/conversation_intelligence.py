"""MEJORA 4: Conversation Intelligence Layer - Aprender de cada conversación"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ConversationMoment:
    """Momento crítico en una conversación"""
    type: str  # "interest_triggered", "objection_encountered", "deal_closed"
    timestamp: int
    prospect_said: str
    agent_said: str
    preceding_context: str
    outcome: str  # "success", "failure", "ongoing"


@dataclass
class ArgumentInsight:
    """Insight sobre un argumento"""
    argument: str
    uses: int
    closes: int
    close_rate: float  # 0-1: histórico de cierre
    sample_size: int  # Número de datos


@dataclass
class ObjectionPlaybook:
    """Cómo manejar una objeción específica"""
    objection: str
    best_rebuttal: str
    overcome_rate: float  # 0-1: qué % de veces se supera
    times_encountered: int
    times_overcome: int


class ConversationIntelligenceEngine:
    """Engine que aprende de todas las conversaciones"""

    def __init__(self, db_client):
        self.db = db_client

    async def extract_insights_from_call(
        self,
        call_id: str,
        transcript: str,
        outcome: str
    ) -> List[ConversationMoment]:
        """Extraer momentos críticos de una conversación"""

        moments = []

        # Simular parsing de transcript (TODO: implementar real parsing)
        lines = transcript.split("\n")

        for i, line in enumerate(lines):
            # Detectar momento tipo
            moment_type = self._detect_moment_type(line)

            if moment_type:
                context = "\n".join(lines[max(0, i-3):i])
                moment = ConversationMoment(
                    type=moment_type,
                    timestamp=i,
                    prospect_said=line,
                    agent_said=lines[i-1] if i > 0 else "",
                    preceding_context=context,
                    outcome=outcome
                )
                moments.append(moment)

        logger.info(f"Extracted {len(moments)} critical moments from call {call_id}")

        # Guardar en BD
        await self._save_moments(call_id, moments)

        return moments

    def _detect_moment_type(self, text: str) -> str:
        """Detectar si es un momento crítico"""
        text_lower = text.lower()

        if any(w in text_lower for w in ["me interesa", "cuándo", "precio"]):
            return "interest_triggered"

        if any(w in text_lower for w in ["pero", "es caro", "ya tenemos"]):
            return "objection_encountered"

        if any(w in text_lower for w in ["vamos", "adelante", "perfecto"]):
            return "deal_closed"

        return None

    async def build_winning_arguments_playbook(
        self,
        industry: str = None,
        min_sample_size: int = 20
    ) -> List[ArgumentInsight]:
        """Construir playbook de argumentos ganadores"""

        # TODO: Implementar query real a BD
        # Retornar ejemplos simulados

        return [
            ArgumentInsight(
                argument="Automatizamos 80% del trabajo",
                uses=47,
                closes=34,
                close_rate=0.72,
                sample_size=47
            ),
            ArgumentInsight(
                argument="ROI en 3 meses",
                uses=62,
                closes=42,
                close_rate=0.68,
                sample_size=62
            ),
            ArgumentInsight(
                argument="Reducimos costos 40%",
                uses=38,
                closes=22,
                close_rate=0.58,
                sample_size=38
            ),
        ]

    async def build_objection_handling_playbook(
        self,
        industry: str = None,
        min_sample_size: int = 15
    ) -> List[ObjectionPlaybook]:
        """Construir playbook de manejo de objeciones"""

        # TODO: Implementar query real a BD
        # Retornar ejemplos simulados

        return [
            ObjectionPlaybook(
                objection="Es muy caro",
                best_rebuttal="Recuperas inversión en 3 meses",
                overcome_rate=0.71,
                times_encountered=47,
                times_overcome=33
            ),
            ObjectionPlaybook(
                objection="Ya tenemos una solución",
                best_rebuttal="Nuestro sistema integra con lo que tienes",
                overcome_rate=0.65,
                times_encountered=31,
                times_overcome=20
            ),
            ObjectionPlaybook(
                objection="No tengo tiempo para implementar",
                best_rebuttal="Implementación toma solo 2 semanas",
                overcome_rate=0.58,
                times_encountered=24,
                times_overcome=14
            ),
        ]

    async def build_segment_playbook(
        self,
        industry: str,
        company_size: int
    ) -> dict:
        """Playbook completo para segmento específico"""

        arguments = await self.build_winning_arguments_playbook(industry)
        objections = await self.build_objection_handling_playbook(industry)

        playbook = {
            "segment": f"{industry}_{company_size}",
            "generated_at": datetime.now().isoformat(),
            "winning_arguments": arguments,
            "objection_handling": objections,
            "confidence": "MEDIUM",  # Depende de sample size
            "recommendations": {
                "primary_argument": arguments[0].argument if arguments else None,
                "primary_objection": objections[0].objection if objections else None,
            }
        }

        logger.info(f"Built playbook for {industry}_{company_size}")

        return playbook

    async def validate_agent_argument_quality(
        self,
        argument: str,
        industry: str = None
    ) -> dict:
        """Validar que agente está usando argumentos que funcionan"""

        playbook = await self.build_winning_arguments_playbook(industry)

        # Buscar argumento en playbook
        for insight in playbook:
            if argument.lower() in insight.argument.lower():
                return {
                    "found": True,
                    "quality": "HIGH" if insight.close_rate > 0.65 else "MEDIUM" if insight.close_rate > 0.5 else "LOW",
                    "close_rate": insight.close_rate,
                    "uses": insight.uses,
                }

        # Argumento no encontrado en histórico
        return {
            "found": False,
            "quality": "UNKNOWN",
            "recommendation": "This argument has no historical data. Recommend testing first."
        }

    async def _save_moments(self, call_id: str, moments: List[ConversationMoment]):
        """Guardar momentos en BD"""
        # TODO: Implementar persistencia
        logger.info(f"[TODO] Save {len(moments)} moments for call {call_id}")


class PromptOptimizer:
    """Actualizar prompts automáticamente basados en aprendizajes"""

    def __init__(self, conv_intel: ConversationIntelligenceEngine):
        self.conv_intel = conv_intel

    async def generate_optimized_master_prompt(
        self,
        industry: str,
        company_size: int
    ) -> str:
        """Generar prompt del Maestro con aprendizajes"""

        playbook = await self.conv_intel.build_segment_playbook(industry, company_size)

        arguments = playbook.get("winning_arguments", [])
        objections = playbook.get("objection_handling", [])

        prompt = f"""
        You are a sales strategist.

        WINNING ARGUMENTS (ranked by effectiveness):
        """

        for arg in arguments[:3]:
            prompt += f"""
        - "{arg.argument}" (close rate: {arg.close_rate:.0%} from {arg.uses} uses)"""

        prompt += """

        Use these arguments in priority order. They have been proven effective.

        COMMON OBJECTIONS & HOW TO HANDLE:
        """

        for obj in objections[:3]:
            prompt += f"""
        - Objection: "{obj.objection}"
          Best rebuttal: "{obj.best_rebuttal}"
          Success rate: {obj.overcome_rate:.0%}"""

        prompt += """

        CRITICAL: These recommendations are based on REAL sales data from your segment,
        not general best practices. Use them.
        """

        logger.info(f"Generated optimized Master prompt for {industry}_{company_size}")

        return prompt
