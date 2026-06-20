"""Estado de la conversación: CallContext + SalesState.

CallContext vive en memoria durante la llamada y se persiste en Redis.
SalesState (de state_engine) dirige la estrategia comercial.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import asdict, dataclass, field
from typing import TYPE_CHECKING, Any

from app.conversation.state_engine import CallGoal, SalesState

if TYPE_CHECKING:
    from app.modules.types import AgentConfig

logger = logging.getLogger(__name__)


@dataclass
class CallContext:
    call_sid: str
    phone: str
    business_type: str = "generico"
    business_name: str = ""
    city: str = ""

    # Vinculación con CRM Maestro
    software_id: str = ""
    lead_id: str = ""
    spech_id: str = ""
    agente_id: int = 0

    # Configuración modular del agente (sistema LEGO)
    agent_config: "AgentConfig | None" = None

    # Capa 3: datos del prospecto (CRM).
    prospect: dict[str, Any] = field(default_factory=dict)

    # Capa 2: estado de la conversación.
    turns: int = 0
    objections_handled: list[str] = field(default_factory=list)
    transcript: list[dict[str, str]] = field(default_factory=list)

    # Capa 4: fallback / señales.
    transfer_requested: bool = False
    transfer_reason: str = ""
    frustration: int = 0  # 0-10 heurístico
    emotion: str = "neutro"  # última emoción detectada del prospecto
    outcome: str = "en_curso"  # en_curso, demo_agendada, transferido, rechazado, optout

    started_at: float = field(default_factory=time.time)

    # Capa 5: Sales State Engine (reemplaza briefing + memoria)
    sales_state: SalesState = field(default_factory=SalesState)
    call_goal: CallGoal = field(default_factory=CallGoal)
    last_emotion: str = "neutro"   # emoción previa para detectar cambios

    # Metadata extra para tools y post-call workflow
    metadata: dict[str, Any] = field(default_factory=dict)

    def add_turn(self, role: str, text: str) -> None:
        self.turns += 1
        self.transcript.append({"role": role, "text": text})

    def apply_frustration(self, delta: int) -> int:
        """Ajusta y acota la frustración a [0, 10]; devuelve el nuevo valor."""
        self.frustration = max(0, min(10, self.frustration + delta))
        return self.frustration

    def elapsed_s(self) -> float:
        return time.time() - self.started_at

    def to_redis(self) -> str:
        d = asdict(self)
        # Convertir SalesState a dict
        d["sales_state"] = {
            "stage": self.sales_state.stage,
            "confidence": self.sales_state.confidence,
            "tags": self.sales_state.tags,
            "pain_detected": self.sales_state.pain_detected,
            "has_software": self.sales_state.has_software,
            "is_decision_maker": self.sales_state.is_decision_maker,
            "wants_demo": self.sales_state.wants_demo,
            "is_rejecting": self.sales_state.is_rejecting,
            "needs_human": self.sales_state.needs_human,
            "objecion_activa": self.sales_state.objecion_activa,
            "stage_history": self.sales_state.stage_history,
            "turnos_en_stage": self.sales_state.turnos_en_stage,
            "objeciones_count": self.sales_state.objeciones_count,
        }
        return json.dumps(d, ensure_ascii=False)


class ConversationStore:
    """Persiste CallContext en Redis (o memoria si Redis no está disponible)."""

    def __init__(self, redis_url: str) -> None:
        self._redis = None
        self._mem: dict[str, str] = {}
        try:
            import redis.asyncio as redis

            self._redis = redis.from_url(redis_url, decode_responses=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis no disponible (%s); usando memoria local", exc)

    async def save(self, ctx: CallContext) -> None:
        payload = ctx.to_redis()
        if self._redis is not None:
            try:
                await self._redis.set(f"call:{ctx.call_sid}", payload, ex=86400)
                return
            except Exception as exc:  # noqa: BLE001
                logger.warning("Fallo guardando en Redis (%s); memoria local", exc)
        self._mem[ctx.call_sid] = payload

    async def load_raw(self, call_sid: str) -> str | None:
        if self._redis is not None:
            try:
                return await self._redis.get(f"call:{call_sid}")
            except Exception:  # noqa: BLE001
                pass
        return self._mem.get(call_sid)
