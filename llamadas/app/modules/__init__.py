"""Sistema de modulos LEGO para el agente de voz AI.

Cada software (SmartDental, Peluguau, Groomly...) conecta su propio "kit de
personalizacion" que el motor generico consume dinamicamente.

Nueva arquitectura (v2.0):
- AgentConfig: contenedor ligero (NO God Object)
- IdentityConfig: quien es el agente
- ProductConfig: que se vende
- SalesPlaybook: como se vende (funnel, scripts, objeciones)
- ComplianceConfig: reglas legales
- VoiceConfig: telefonia/voz
- CaseStudyRepository: casos de exito (fuera de config)

Uso:
    from app.modules import load_agent_config

    config = await load_agent_config(software_id="smartdental")
    print(config.identity.agent_name)      # "Carlos"
    print(config.product.company_name)     # "SmartDental"
    print(config.playbook.name)            # "Free Value First → Demo"
    print(config.case_study_repo.find_best_case("dentista", "es"))
"""
from __future__ import annotations

from app.modules.case_study_repository import CaseStudy, CaseStudyRepository
from app.modules.config_compliance import ComplianceConfig
from app.modules.config_identity import IdentityConfig
from app.modules.config_product import ProductConfig
from app.modules.config_voice import VoiceConfig
from app.modules.loader import clear_cache, get_cached_config, load_agent_config
from app.modules.sales_playbook import (
    PlaybookStage,
    SalesPlaybook,
    playbook_direct_demo,
    playbook_free_value_first,
    playbook_roi_first,
)
from app.modules.types import AgentConfig

__all__ = [
    # Config principal
    "AgentConfig",
    # Sub-configs
    "IdentityConfig",
    "ProductConfig",
    "ComplianceConfig",
    "VoiceConfig",
    # Playbook
    "SalesPlaybook",
    "PlaybookStage",
    "playbook_free_value_first",
    "playbook_direct_demo",
    "playbook_roi_first",
    # Case Studies
    "CaseStudy",
    "CaseStudyRepository",
    # Loader
    "load_agent_config",
    "get_cached_config",
    "clear_cache",
]
