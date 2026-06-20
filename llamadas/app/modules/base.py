"""Configuracion base generica (fallback).

Cuando no hay config especifica para un software, se usa esta.
El agente habla como un asesor generico sin marca propia.
"""
from __future__ import annotations

from app.modules.case_study_repository import CaseStudyRepository
from app.modules.config_compliance import ComplianceConfig
from app.modules.config_identity import IdentityConfig
from app.modules.config_product import ProductConfig
from app.modules.config_voice import VoiceConfig
from app.modules.sales_playbook import playbook_free_value_first
from app.modules.types import AgentConfig


def get_config() -> AgentConfig:
    """Devuelve la configuracion base generica."""
    return AgentConfig(
        identity=IdentityConfig(
            agent_name="Asesor",
            agent_gender="masculino",
            agent_accent="es-ES",
            agent_tone="profesional_cercano",
            agent_experience_years=3,
        ),
        product=ProductConfig(
            company_name="Nuestra Empresa",
            product_name="Nuestro Sistema",
            product_description="Software de gestion para negocios de servicios",
            target_vertical="negocios de servicios",
            target_audience="duenos de negocios",
            currency="EUR",
            currency_symbol="EUR",
            market_country="es",
            market_city_examples="Madrid, Barcelona, Valencia",
            price_monthly=39,
        ),
        playbook=playbook_free_value_first(),
        compliance=ComplianceConfig(),
        voice=VoiceConfig(),
        case_study_repo=CaseStudyRepository(),
    )
