"""Integración de 6 mejoras en HybridSession - Minimal + funcional"""
import logging
from app.six_improvements_integration import SixImprovementsOrchestrator
from app.config import settings

logger = logging.getLogger(__name__)


class HybridSessionWith6Improvements:
    """Mixin que inyecta 6 mejoras en HybridSession"""

    def __init__(self, db_client, twilio_client=None, sendgrid_client=None):
        """Inicializar mejoras"""
        self.improvements = SixImprovementsOrchestrator(db_client, twilio_client, sendgrid_client)

    async def on_call_start(self, prospect_id: str, metadata: dict):
        """Hook: Primera llamada - Preparar brief con contexto"""
        try:
            # Cargar perfil si existe
            profile = await self.improvements.profile_engine.load_profile(prospect_id)

            # Si NO existe perfil (primera llamada)
            if not profile:
                logger.info(f"First call for {prospect_id} - using default brief")
                return

            # Si existe: inyectar en brief del Maestro
            logger.info(f"Call 2+ for {prospect_id} - loading profile (confidence: {profile.engagement_confidence:.0%})")

            # TODO: Inyectar profile en self._master.generate_brief()
            self._prospect_profile = profile

        except Exception as e:
            logger.error(f"Error loading profile: {e}")

    async def on_call_end(self, transcript: str, outcome: str):
        """Hook: Fin de llamada - Análisis + acciones automáticas"""
        try:
            # 1. Análisis post-llamada
            analysis = await self.improvements.process_post_call_analysis(
                call_id=self.ctx.call_sid,
                transcript=transcript,
                outcome=outcome
            )

            logger.info(
                f"Call analysis: score={analysis.post_call_analysis.lead_score.score}, "
                f"next_action={analysis.post_call_analysis.next_action.channel}"
            )

            # 2. Guardar profile si no existe (primera llamada)
            if outcome == "cierre":
                profile = await self.improvements.process_first_call(
                    prospect_id=self.ctx.prospect_id,
                    transcript=transcript,
                    metadata={"industry": self.ctx.industry, "company_size": self.ctx.company_size}
                )
                logger.info(f"Profile created for {self.ctx.prospect_id}")

            # 3. Ejecutar follow-up automático
            await self.improvements.execute_follow_up_action(
                prospect_id=self.ctx.prospect_id,
                next_action=analysis.post_call_analysis.next_action.__dict__
            )

        except Exception as e:
            logger.error(f"Error in call analysis: {e}")


# ponytail: Integración minimal - add full when needed
