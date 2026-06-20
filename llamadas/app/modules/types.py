"""Tipos de datos para la configuracion modular del agente de voz.

AgentConfig ya NO es un God Object. Ahora delega en sub-configs especializadas:
- IdentityConfig: quien es el agente
- ProductConfig: que se vende
- SalesPlaybook: como se vende (funnel, scripts, objeciones)
- ComplianceConfig: reglas legales
- VoiceConfig: telefonia/voz
- CaseStudyRepository: casos de exito (fuera de config)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.modules.case_study_repository import CaseStudyRepository
    from app.modules.config_compliance import ComplianceConfig
    from app.modules.config_identity import IdentityConfig
    from app.modules.config_product import ProductConfig
    from app.modules.config_voice import VoiceConfig
    from app.modules.sales_playbook import SalesPlaybook


@dataclass
class AgentConfig:
    """Configuracion completa de un agente de voz para un software especifico.

    NO ES un God Object. Es un contenedor ligero que agrupa sub-configs.
    Cada sub-config tiene su propia responsabilidad.

    Uso:
        config = AgentConfig(
            identity=IdentityConfig(agent_name="Carlos", ...),
            product=ProductConfig(company_name="SmartDental", ...),
            playbook=playbook_free_value_first(),
            compliance=ComplianceConfig(timezone="Europe/Madrid", ...),
            voice=VoiceConfig(twilio_cnam_name="SmartDental"),
        )
    """

    # ── Sub-configs (la magia del sistema LEGO) ──
    identity: "IdentityConfig" = field(default_factory=lambda: __import__("app.modules.config_identity", fromlist=["IdentityConfig"]).IdentityConfig())
    product: "ProductConfig" = field(default_factory=lambda: __import__("app.modules.config_product", fromlist=["ProductConfig"]).ProductConfig())
    playbook: "SalesPlaybook" = field(default_factory=lambda: __import__("app.modules.sales_playbook", fromlist=["playbook_free_value_first"]).playbook_free_value_first())
    compliance: "ComplianceConfig" = field(default_factory=lambda: __import__("app.modules.config_compliance", fromlist=["ComplianceConfig"]).ComplianceConfig())
    voice: "VoiceConfig" = field(default_factory=lambda: __import__("app.modules.config_voice", fromlist=["VoiceConfig"]).VoiceConfig())

    # ── Repositorios externos (no viven en config) ──
    case_study_repo: "CaseStudyRepository | None" = None

    # ── Metadatos para vinculacion ──
    software_id: str = ""
    playbook_id: str = ""  # Referencia al playbook (para A/B testing)
    activo: bool = True

    # ── Propiedades de conveniencia (delegan a sub-configs) ──

    @property
    def agent_name(self) -> str:
        return self.identity.agent_name

    @property
    def agent_gender(self) -> str:
        return self.identity.agent_gender

    @property
    def agent_accent(self) -> str:
        return self.identity.agent_accent

    @property
    def company_name(self) -> str:
        return self.product.company_name

    @property
    def product_name(self) -> str:
        return self.product.product_name

    @property
    def target_vertical(self) -> str:
        return self.product.target_vertical

    @property
    def currency(self) -> str:
        return self.product.currency

    @property
    def currency_symbol(self) -> str:
        return self.product.currency_symbol

    @property
    def market_country(self) -> str:
        return self.product.market_country

    @property
    def price_monthly(self) -> int:
        return self.product.price_monthly

    @property
    def disclosure_text(self) -> str:
        return self.compliance.disclosure_text.format(company_name=self.company_name)

    # ── Metodos utilitarios ──

    def format_text(self, text: str, **extra_vars) -> str:
        """Reemplaza placeholders tipo {company_name}, {agent_name}, etc."""
        vars_dict = {
            "company_name": self.company_name,
            "product_name": self.product_name,
            "agent_name": self.agent_name,
            "currency_symbol": self.currency_symbol,
            "price_monthly": str(self.price_monthly),
            "target_vertical": self.target_vertical,
            **extra_vars,
        }
        result = text
        for key, value in vars_dict.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result

    def get_script(self, stage_id: str, fallback: str = "") -> str:
        """Obtiene un script del playbook por stage_id."""
        return self.playbook.get_random_script(stage_id) or fallback

    def get_whatsapp_template(self, key: str, fallback: str = "") -> str:
        """Obtiene un template de WhatsApp por clave."""
        templates: dict[str, str] = self.playbook.scripts.get("whatsapp", {})
        return templates.get(key, fallback)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AgentConfig":
        """Crea un AgentConfig desde un dict (respuesta JSON del backend)."""
        from app.modules.case_study_repository import CaseStudyRepository
        from app.modules.config_compliance import ComplianceConfig
        from app.modules.config_identity import IdentityConfig
        from app.modules.config_product import ProductConfig
        from app.modules.config_voice import VoiceConfig
        from app.modules.sales_playbook import SalesPlaybook

        # Extraer sub-configs del dict
        identity_data = data.get("identity", {})
        product_data = data.get("product", {})
        playbook_data = data.get("playbook", {})
        compliance_data = data.get("compliance", {})
        voice_data = data.get("voice", {})

        # Crear playbook desde dict o usar default
        playbook = SalesPlaybook.from_dict(playbook_data) if playbook_data else playbook_free_value_first()

        # Crear case study repo desde dict si existe
        case_studies_raw = data.get("case_studies", [])
        case_repo = CaseStudyRepository.from_dicts(case_studies_raw) if case_studies_raw else None

        return cls(
            identity=IdentityConfig(**{k: v for k, v in identity_data.items() if k in IdentityConfig.__dataclass_fields__}),
            product=ProductConfig(**{k: v for k, v in product_data.items() if k in ProductConfig.__dataclass_fields__}),
            playbook=playbook,
            compliance=ComplianceConfig(**{k: v for k, v in compliance_data.items() if k in ComplianceConfig.__dataclass_fields__}),
            voice=VoiceConfig(**{k: v for k, v in voice_data.items() if k in VoiceConfig.__dataclass_fields__}),
            case_study_repo=case_repo,
            software_id=data.get("software_id", ""),
            playbook_id=data.get("playbook_id", ""),
            activo=data.get("activo", True),
        )


def _to_snake(name: str) -> str:
    """Convierte camelCase o kebab-case a snake_case."""
    import re
    name = name.replace("-", "_")
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()
