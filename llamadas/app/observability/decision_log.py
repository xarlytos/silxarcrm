"""Decision Logger — event log completo de cada turno de decisión.

Guarda en cada turno:
- input del prospecto
- clasificación del classifier
- estado antes/después
- probabilidades de próximos estados
- call_goal
- reasoning de la transición
- latencias
- flags (classifier_invoked, etc.)

Esto permite:
- Debugging en tiempo real
- Training dataset para fine-tuning
- Análisis de conversión por stage
- Detección de comportamiento "nervioso"
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

# Directorio de logs (puede ser volátil o persistente)
LOG_DIR = Path(__file__).parent.parent.parent / "logs" / "decisions"


@dataclass
class DecisionEvent:
    """Un evento de decisión por turno."""

    # Identificación
    call_sid: str = ""
    turn: int = 0
    timestamp: str = ""
    elapsed_ms: int = 0  # latencia total del turno

    # Input
    input_text: str = ""
    input_truncated: bool = False

    # Clasificación
    classifier_invoked: bool = False
    classification: dict[str, Any] = field(default_factory=dict)
    classifier_latency_ms: int = 0

    # Estado
    state_before: dict[str, Any] = field(default_factory=dict)
    state_after: dict[str, Any] = field(default_factory=dict)
    transition_reason: str = ""

    # Meta
    call_goal: dict[str, Any] = field(default_factory=dict)

    # Estrategia final
    strategy_prompt_hash: str = ""  # hash del prompt enviado al LLM (para debug)

    # Respuesta del agente (se llena después de que el LLM responda)
    agent_response: str = ""
    agent_response_truncated: bool = False

    # Tools usadas
    tools_used: list[str] = field(default_factory=list)

    # Metadata
    pipeline: str = "elevenlabs"
    version: str = "3.0"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, default=str)


class DecisionLogger:
    """Logger de decisiones estructurado.

    Guarda cada turno como un JSON line en un archivo rotativo.
    """

    def __init__(self, call_sid: str) -> None:
        self.call_sid = call_sid
        self._events: list[DecisionEvent] = []
        self._current: DecisionEvent | None = None
        self._turn_start_ts: float = 0.0
        LOG_DIR.mkdir(parents=True, exist_ok=True)

    def start_turn(self, turn: int, input_text: str) -> None:
        """Inicia el logging de un nuevo turno."""
        self._turn_start_ts = time.perf_counter()
        self._current = DecisionEvent(
            call_sid=self.call_sid,
            turn=turn,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            input_text=input_text[:500],  # truncar input largo
            input_truncated=len(input_text) > 500,
        )

    def log_classification(
        self,
        classification,
        invoked: bool,
        latency_ms: int = 0,
    ) -> None:
        """Registra la clasificación del classifier."""
        if self._current is None:
            return
        self._current.classifier_invoked = invoked
        self._current.classifier_latency_ms = latency_ms
        if classification:
            self._current.classification = {
                "intencion": classification.intencion,
                "tags": classification.tags,
                "confidence": round(classification.confidence, 3),
                "nueva_objecion": classification.nueva_objecion,
                "emocion": classification.emocion,
            }

    def log_state_transition(
        self,
        state_before,
        state_after,
        call_goal,
        reason: str = "",
    ) -> None:
        """Registra la transición de estado."""
        if self._current is None:
            return

        self._current.state_before = {
            "stage": state_before.stage,
            "confidence": round(state_before.confidence, 3),
            "tags": state_before.tags,
            "pain_detected": state_before.pain_detected,
            "has_software": state_before.has_software,
            "is_decision_maker": state_before.is_decision_maker,
            "wants_demo": state_before.wants_demo,
            "is_rejecting": state_before.is_rejecting,
            "needs_human": state_before.needs_human,
            "objecion_activa": state_before.objecion_activa,
            "turnos_en_stage": state_before.turnos_en_stage,
        }

        self._current.state_after = {
            "stage": state_after.stage,
            "confidence": round(state_after.confidence, 3),
            "tags": state_after.tags,
            "pain_detected": state_after.pain_detected,
            "has_software": state_after.has_software,
            "is_decision_maker": state_after.is_decision_maker,
            "wants_demo": state_after.wants_demo,
            "is_rejecting": state_after.is_rejecting,
            "needs_human": state_after.needs_human,
            "objecion_activa": state_after.objecion_activa,
            "turnos_en_stage": state_after.turnos_en_stage,
            "next_stages": {k: round(v, 3) for k, v in (state_after.next_stages or {}).items()},
            "stage_history": state_after.stage_history[-5:],  # últimos 5
        }

        self._current.call_goal = {
            "goal": call_goal.goal,
            "progress": round(call_goal.progress, 3),
            "risk_of_loss": round(call_goal.risk_of_loss, 3),
            "turns_without_progress": call_goal.turns_without_progress,
            "total_value_signals": call_goal.total_value_signals,
        }

        self._current.transition_reason = reason

    def log_agent_response(self, response: str, tools_used: list[str] | None = None) -> None:
        """Registra la respuesta del agente."""
        if self._current is None:
            return
        self._current.agent_response = response[:500]
        self._current.agent_response_truncated = len(response) > 500
        if tools_used:
            self._current.tools_used = tools_used

    def end_turn(self) -> None:
        """Finaliza el turno, calcula latencia y guarda el evento."""
        if self._current is None:
            return

        self._current.elapsed_ms = int((time.perf_counter() - self._turn_start_ts) * 1000)
        self._events.append(self._current)

        # Guardar en disco (append)
        try:
            log_path = LOG_DIR / f"{self.call_sid}.jsonl"
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(self._current.to_json() + "\n")
        except Exception as exc:
            logger.warning("No se pudo guardar decision log: %s", exc)

        self._current = None

    def get_events(self) -> list[DecisionEvent]:
        """Devuelve todos los eventos acumulados."""
        return self._events[:]

    def get_summary(self) -> dict[str, Any]:
        """Resumen de la llamada para análisis rápido."""
        if not self._events:
            return {}

        total_turns = len(self._events)
        avg_confidence = sum(e.classification.get("confidence", 0) for e in self._events) / max(total_turns, 1)
        stages_visited = list(dict.fromkeys(
            e.state_after.get("stage", "") for e in self._events
        ))
        classifier_invocations = sum(1 for e in self._events if e.classifier_invoked)
        avg_latency = sum(e.elapsed_ms for e in self._events) / max(total_turns, 1)
        final_goal = self._events[-1].call_goal if self._events else {}

        return {
            "call_sid": self.call_sid,
            "total_turns": total_turns,
            "avg_confidence": round(avg_confidence, 3),
            "stages_visited": stages_visited,
            "classifier_invocations": classifier_invocations,
            "classifier_skip_rate": round(1 - (classifier_invocations / max(total_turns, 1)), 3),
            "avg_turn_latency_ms": round(avg_latency, 1),
            "final_progress": final_goal.get("progress", 0),
            "final_risk": final_goal.get("risk_of_loss", 0),
        }
