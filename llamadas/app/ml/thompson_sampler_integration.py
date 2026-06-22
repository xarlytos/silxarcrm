"""
Integración de Thompson Sampling con Experimentation Engine.

Conecta el algoritmo bayesiano con:
- Conversation Intelligence Engine (para seleccionar opening arguments)
- Experimentation Framework (para tracking y reporting)
- Weekly analytics dashboard

USO en experimentation_engine.py:
    from app.ml.thompson_sampler_integration import ThompsonSamplerIntegration

    integration = ThompsonSamplerIntegration(
        num_arguments=8,
        persistence_path="/tmp/thompson_state.json"
    )

    # En cada llamada
    call_id = "call_123"
    arg_id = integration.select_argument(call_context={"customer_profile": "..."}

    # Después de llamada
    conversion = determine_if_successful(call)
    integration.record_outcome(call_id, arg_id, conversion)

    # Reporte semanal
    weekly_report = integration.get_weekly_report()
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple, Any
from dataclasses import dataclass
from pathlib import Path

from app.ml.thompson_sampler import ThompsonSampler

logger = logging.getLogger(__name__)


@dataclass
class CallRecord:
    """Record de una llamada individual."""

    call_id: str
    timestamp: str
    argument_id: int
    argument_name: str
    conversion: bool
    context: Dict[str, Any]

    def to_dict(self) -> Dict:
        return {
            "call_id": self.call_id,
            "timestamp": self.timestamp,
            "argument_id": self.argument_id,
            "argument_name": self.argument_name,
            "conversion": self.conversion,
            "context": self.context,
        }


class ThompsonSamplerIntegration:
    """
    Integración de Thompson Sampling con experimentation framework.

    Maneja:
    1. Selección de argumentos usando Thompson Sampling
    2. Recording de outcomes
    3. Weekly reports
    4. Integración con Conversation Intelligence
    """

    def __init__(
        self,
        num_arguments: int = 8,
        argument_names: Optional[list] = None,
        persistence_path: Optional[str] = None,
    ):
        """
        Inicializar integración.

        Args:
            num_arguments: Número de argumentos a comparar
            argument_names: Nombres personalizados para argumentos
            persistence_path: Path para guardar estado (JSON)
        """
        self.sampler = ThompsonSampler(
            num_arguments=num_arguments,
            argument_names=argument_names,
            persistence_path=persistence_path,
        )
        self.persistence_path = persistence_path
        self.call_records: list[CallRecord] = []

        logger.info(
            f"Thompson Sampler integration initialized with {num_arguments} arguments"
        )

    def select_argument(
        self,
        call_id: str,
        call_context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[int, str]:
        """
        Seleccionar argumento para una llamada usando Thompson Sampling.

        Args:
            call_id: ID único de la llamada
            call_context: Context dict (customer_profile, industry, etc.)

        Returns:
            Tuple[argument_id, argument_name]
        """
        arg_id = self.sampler.sample_posterior()
        arg_name = self.sampler.arguments[arg_id].name

        logger.info(
            f"Call {call_id}: selected argument {arg_id} "
            f"('{arg_name[:50]}') using Thompson Sampling"
        )

        return arg_id, arg_name

    def record_outcome(
        self,
        call_id: str,
        argument_id: int,
        conversion: bool,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Registrar outcome de una llamada.

        Args:
            call_id: ID de la llamada
            argument_id: ID del argumento usado
            conversion: True si llevó a conversión/siguiente paso
            context: Context dict para análisis (opcional)
        """
        # Actualizar sampler
        self.sampler.update_with_outcome(argument_id, conversion)

        # Registrar call
        arg_name = self.sampler.arguments[argument_id].name
        record = CallRecord(
            call_id=call_id,
            timestamp=datetime.utcnow().isoformat(),
            argument_id=argument_id,
            argument_name=arg_name,
            conversion=conversion,
            context=context or {},
        )
        self.call_records.append(record)

        logger.info(
            f"Call {call_id}: recorded outcome "
            f"(argument_id={argument_id}, conversion={conversion})"
        )

    def get_current_recommendation(
        self,
        method: str = "thompson",
    ) -> Dict[str, Any]:
        """
        Obtener recomendación actual.

        Args:
            method: "thompson" (sampling), "mean" (posterior mean), o "empirical"

        Returns:
            Dict con recomendación y métricas
        """
        best_id, best_name, score = self.sampler.get_best_argument(method=method)

        return {
            "argument_id": best_id,
            "argument_name": best_name,
            f"{method}_score": score,
            "posterior_mean": self.sampler.arguments[best_id].posterior_mean(),
            "conversion_rate": self.sampler.arguments[best_id].conversion_rate(),
            "trials": self.sampler.arguments[best_id].total_trials,
        }

    def get_weekly_report(self) -> Dict[str, Any]:
        """
        Generar reporte semanal completo.

        Returns:
            Dict con stats, ranking, insights, y recomendaciones
        """
        # Obtener reporte base de sampler
        base_report = self.sampler.get_weekly_report()

        # Agregar analytics de call records
        this_week = datetime.utcnow() - timedelta(days=7)
        weekly_calls = [
            r
            for r in self.call_records
            if datetime.fromisoformat(r.timestamp) >= this_week
        ]

        # Análisis por argumento esta semana
        call_by_arg = {}
        for call in weekly_calls:
            if call.argument_id not in call_by_arg:
                call_by_arg[call.argument_id] = {
                    "total": 0,
                    "conversions": 0,
                    "calls": [],
                }
            call_by_arg[call.argument_id]["total"] += 1
            if call.conversion:
                call_by_arg[call.argument_id]["conversions"] += 1
            call_by_arg[call.argument_id]["calls"].append(call.to_dict())

        # Enriquecer reporte con call analytics
        base_report["this_week_analytics"] = {
            "period": "last_7_days",
            "total_calls": len(weekly_calls),
            "by_argument": call_by_arg,
            "calls_per_argument": {
                str(k): len(v["calls"]) for k, v in call_by_arg.items()
            },
        }

        # Agregar recomendación accionable
        base_report["action_items"] = self._generate_action_items(
            base_report,
            call_by_arg,
        )

        return base_report

    def _generate_action_items(
        self,
        report: Dict,
        call_by_arg: Dict,
    ) -> list[str]:
        """Generar items accionables basados en datos."""
        actions = []

        # Top performer
        ranking = report["performance_ranking"]
        if ranking:
            top = ranking[0]
            actions.append(
                f"🎯 PRIORITIZAR argumento {top['id']}: "
                f"{top['name'][:40]}... ({top['posterior_mean']:.1%} expected)"
            )

        # Underperformer
        bottom = ranking[-1] if ranking else None
        if bottom and bottom["total_trials"] >= 15:
            if bottom["posterior_mean"] < 0.2:
                actions.append(
                    f"⚠️ REVISAR argumento {bottom['id']}: "
                    f"bajo performance ({bottom['posterior_mean']:.1%}). "
                    f"Considera reescribir o pausar."
                )

        # Confidence interval
        high_confidence = [
            a for a in ranking if a["total_trials"] >= 20
        ]
        if high_confidence:
            actions.append(
                f"✅ {len(high_confidence)} argumento(s) con "
                f"suficiente confianza (>20 trials)"
            )
        else:
            min_trials = min(
                (a["total_trials"] for a in ranking),
                default=0,
            )
            actions.append(
                f"📈 Continúa recolectando data. "
                f"Mínimo: {min_trials} trials. Meta: 20 por argumento."
            )

        # Explorer vs exploiter tradeoff
        this_week = call_by_arg
        if this_week:
            total_this_week = sum(a["total"] for a in this_week.values())
            if total_this_week >= 20:
                # Check si estamos explorando suficientemente
                best_arg_calls = max(
                    (a["total"] for a in this_week.values()),
                    default=0,
                )
                concentration = best_arg_calls / total_this_week if total_this_week > 0 else 0

                if concentration > 0.7:
                    actions.append(
                        f"💡 Considerando aumentar exploración: "
                        f"{concentration:.0%} de calls al top argument. "
                        f"Thompson Sampling está en modo 'exploit'."
                    )

        return actions

    def get_all_arguments_status(self) -> list[Dict]:
        """Obtener status actual de todos los argumentos."""
        return self.sampler.get_all_posteriors()

    def save_state(self, path: Optional[str] = None) -> str:
        """Guardar estado actual."""
        path = path or self.persistence_path
        if path:
            self.sampler.save_state(path)
            logger.info(f"State saved to {path}")
        return path

    def load_state(self, path: Optional[str] = None) -> None:
        """Cargar estado anterior."""
        path = path or self.persistence_path
        if path:
            self.sampler.load_state(path)
            logger.info(f"State loaded from {path}")

    def reset_all(self) -> None:
        """Reset todas las distribuciones."""
        self.sampler.reset_all()
        self.call_records = []
        logger.warning("All Thompson Sampler state reset")


# ============================================================================
# INTEGRACIÓN CON CONVERSATION INTELLIGENCE ENGINE
# ============================================================================


class ConversationArgumentSelector:
    """
    Selector de argumentos para Conversation Intelligence Engine.

    Usa Thompson Sampling para elegir el mejor opening argument.
    """

    def __init__(self, thompson_integration: ThompsonSamplerIntegration):
        self.integration = thompson_integration

    def select_opening_argument(
        self,
        call_id: str,
        customer_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Seleccionar opening argument para una llamada.

        Args:
            call_id: ID de la llamada
            customer_context: Contexto del cliente (industria, tamaño, etc.)

        Returns:
            Opening argument (string)
        """
        arg_id, arg_name = self.integration.select_argument(
            call_id=call_id,
            call_context=customer_context,
        )
        return arg_name

    def record_call_outcome(
        self,
        call_id: str,
        argument_id: int,
        call_successful: bool,
    ) -> None:
        """
        Registrar resultado de una llamada.

        Args:
            call_id: ID de la llamada
            argument_id: ID del argumento usado
            call_successful: True si la llamada fue exitosa
        """
        self.integration.record_outcome(
            call_id=call_id,
            argument_id=argument_id,
            conversion=call_successful,
        )


if __name__ == "__main__":
    # Ejemplo de uso
    integration = ThompsonSamplerIntegration(
        num_arguments=8,
        persistence_path=None,
    )

    print("=" * 70)
    print("THOMPSON SAMPLER INTEGRATION - EXAMPLE")
    print("=" * 70)

    # Simular 50 llamadas
    import numpy as np

    np.random.seed(42)
    true_rates = [0.7, 0.65, 0.6, 0.4, 0.35, 0.3, 0.25, 0.2]

    for call_num in range(50):
        call_id = f"call_{call_num:03d}"

        # Seleccionar argumento
        arg_id, arg_name = integration.select_argument(call_id)

        # Simular resultado
        success = np.random.rand() < true_rates[arg_id]

        # Registrar
        integration.record_outcome(
            call_id=call_id,
            argument_id=arg_id,
            conversion=success,
        )

    print("\n📊 WEEKLY REPORT:\n")
    report = integration.get_weekly_report()

    print(f"Total calls this week: {report['this_week_analytics']['total_calls']}")
    print(f"\nTop 3 arguments:")
    for i, arg in enumerate(report["performance_ranking"][:3], 1):
        print(
            f"  {i}. {arg['name'][:50]}: "
            f"{arg['posterior_mean']:.1%} (n={arg['total_trials']})"
        )

    print(f"\nAction Items:")
    for action in report["action_items"]:
        print(f"  {action}")
