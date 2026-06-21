"""MEJORA 1: Prospect Profile Engine - Memoria persistente de prospects"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, asdict
import json

logger = logging.getLogger(__name__)


@dataclass
class ProspectProfile:
    """Perfil de un prospect entre llamadas"""
    prospect_id: str
    name: str
    company: str
    industry: str
    company_size: Optional[int]
    phone: str
    email: str

    # Profile attributes (extraído de llamada 1)
    presupuesto_min: Optional[float] = None
    presupuesto_max: Optional[float] = None
    nivel_interes: str = "cold"  # cold/warm/hot
    objeciones: list = None  # ["precio alto", "ya tenemos"]
    motivadores: list = None  # ["automatización", "reducir costos"]
    budget_owner: bool = False
    decision_timeline: Optional[str] = None

    # Interaction history
    interaction_history: list = None
    last_contact: Optional[datetime] = None
    engagement_confidence: float = 0.0  # 0-1: cómo de seguro estamos del perfil

    def __post_init__(self):
        if self.objeciones is None:
            self.objeciones = []
        if self.motivadores is None:
            self.motivadores = []
        if self.interaction_history is None:
            self.interaction_history = []


class ProspectProfileEngine:
    """Engine que extrae y almacena perfiles de prospects"""

    def __init__(self, db_client):
        self.db = db_client

    async def extract_profile_from_transcript(
        self,
        prospect_id: str,
        transcript: str,
        metadata: dict
    ) -> ProspectProfile:
        """Analizar transcripción de llamada 1 y extraer perfil"""

        from app.config import settings
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""
        Analiza esta conversación de venta. Extrae SOLO lo que se mencionó explícitamente.

        NO inventes datos. Si algo no se menciona, retorna null.

        Extrae:
        1. presupuesto_min: rango presupuesto si se menciona
        2. presupuesto_max: rango presupuesto si se menciona
        3. nivel_interes: cold (0-20%), warm (20-70%), hot (70%+) basado en señales reales
        4. objeciones: lista de objeciones REALES mencionadas
        5. motivadores: qué beneficios mencionó que le interesan
        6. budget_owner: ¿es quien decide presupuesto? (true/false/null si no se sabe)
        7. decision_timeline: cuándo toma decisión (inmediato/30_días/Q4/null)

        IMPORTANTE: Si no lo mencionó, retorna null. NO especules.

        Transcript:
        {transcript}

        Retorna SOLO JSON sin explicaciones.
        """

        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        extracted = json.loads(response.text)

        # Crear profile
        profile = ProspectProfile(
            prospect_id=prospect_id,
            name=metadata.get("name", ""),
            company=metadata.get("company", ""),
            industry=metadata.get("industry", ""),
            company_size=metadata.get("company_size"),
            phone=metadata.get("phone", ""),
            email=metadata.get("email", ""),

            presupuesto_min=extracted.get("presupuesto_min"),
            presupuesto_max=extracted.get("presupuesto_max"),
            nivel_interes=extracted.get("nivel_interes", "cold"),
            objeciones=extracted.get("objeciones", []),
            motivadores=extracted.get("motivadores", []),
            budget_owner=extracted.get("budget_owner", False),
            decision_timeline=extracted.get("decision_timeline"),

            last_contact=datetime.now(),
            engagement_confidence=self._calculate_confidence(extracted),
        )

        logger.info(f"Profile extracted for {prospect_id}: confidence={profile.engagement_confidence:.0%}")

        # Guardar en BD
        await self._save_profile(profile)

        return profile

    async def load_profile(self, prospect_id: str) -> Optional[ProspectProfile]:
        """Cargar perfil existente de BD"""

        # TODO: Implementar con Supabase/PostgreSQL
        # Por ahora retornar None para compatibilidad
        return None

    async def update_profile(self, prospect_id: str, updates: dict) -> ProspectProfile:
        """Actualizar perfil con nueva información"""

        profile = await self.load_profile(prospect_id)
        if not profile:
            return None

        # Actualizar campos
        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)

        profile.last_contact = datetime.now()

        await self._save_profile(profile)

        return profile

    def _calculate_confidence(self, extracted: dict) -> float:
        """Calcular confianza en el perfil basado en datos extraídos"""

        confidence = 0.0
        max_points = 0

        # Puntos por cada dato extraído
        if extracted.get("presupuesto_min") or extracted.get("presupuesto_max"):
            confidence += 0.2
        max_points += 0.2

        if extracted.get("nivel_interes") != "cold":
            confidence += 0.2
        max_points += 0.2

        if extracted.get("objeciones"):
            confidence += 0.2
        max_points += 0.2

        if extracted.get("motivadores"):
            confidence += 0.2
        max_points += 0.2

        if extracted.get("decision_timeline"):
            confidence += 0.2
        max_points += 0.2

        # Normalizar
        return confidence / max_points if max_points > 0 else 0.0

    async def _save_profile(self, profile: ProspectProfile):
        """Guardar profile en BD (implementar con Supabase)"""

        # TODO: Implementar persistencia real
        logger.info(f"[TODO] Guardar profile {profile.prospect_id} en BD")


class ProfileInjectionMixin:
    """Mixin para inyectar profile en Maestro"""

    async def generate_brief_with_profile(
        self,
        prospect_id: str,
        profile: Optional[ProspectProfile],
        call_context: dict
    ) -> str:
        """Generar brief del Maestro inyectando contexto del profile"""

        if not profile:
            # Sin profile, usar prompt estándar
            return await self._generate_standard_brief(call_context)

        # CON PROFILE: inyectar contexto
        context_section = f"""
        === PROSPECT PROFILE (from previous call) ===
        Budget: ${profile.presupuesto_min}-{profile.presupuesto_max} if mentioned
        Interest Level: {profile.nivel_interes}
        Previous Objections: {', '.join(profile.objeciones) if profile.objeciones else 'None'}
        Motivators: {', '.join(profile.motivadores) if profile.motivadores else 'None'}
        Decision Timeline: {profile.decision_timeline or 'Not mentioned'}
        Confidence in this profile: {profile.engagement_confidence:.0%}

        TASK: Generate brief knowing this context. DO NOT assume beyond what was mentioned.
        """

        # Agregar a standard brief
        standard_brief = await self._generate_standard_brief(call_context)

        return context_section + "\n" + standard_brief

    async def _generate_standard_brief(self, call_context: dict) -> str:
        """Brief estándar sin profile"""
        return "Standard brief (TODO)"
