"""
Thompson Sampling para A/B testing de argumentos de venta.

Implementa Bayesian updating con Beta distributions para:
- 8 opening arguments (discovery questions)
- Thompson Sampling: tilt probability hacia best performer
- Weekly performance reports

USO:
    sampler = ThompsonSampler(num_arguments=8)

    # Registrar outcome de argumento
    sampler.update_with_outcome(argument_id=0, conversion=True)

    # Obtener argumento recomendado (Thompson Sampling)
    best_arg = sampler.get_best_argument()

    # Reporte semanal
    report = sampler.get_weekly_report()
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional
import json
from datetime import datetime, timedelta
import numpy as np
from pathlib import Path


@dataclass
class BetaDistribution:
    """Beta distribution parametrizado por (alpha, beta)."""

    alpha: float = 1.0  # Prior: successes + 1
    beta: float = 1.0   # Prior: failures + 1

    def sample(self) -> float:
        """Sample de la posterior Beta(alpha, beta)."""
        return np.random.beta(self.alpha, self.beta)

    def mean(self) -> float:
        """Expected value E[X] = alpha / (alpha + beta)."""
        return self.alpha / (self.alpha + self.beta)

    def variance(self) -> float:
        """Varianza Var[X] = alpha*beta / ((alpha+beta)^2 * (alpha+beta+1))."""
        ab = self.alpha + self.beta
        return (self.alpha * self.beta) / (ab ** 2 * (ab + 1))

    def update(self, success: bool) -> None:
        """Bayesian update: incrementar alpha o beta según outcome."""
        if success:
            self.alpha += 1
        else:
            self.beta += 1

    def to_dict(self) -> Dict:
        """Serializar para persistencia."""
        return {"alpha": self.alpha, "beta": self.beta}

    @staticmethod
    def from_dict(data: Dict) -> "BetaDistribution":
        """Deserializar desde dict."""
        return BetaDistribution(alpha=data["alpha"], beta=data["beta"])


@dataclass
class ArgumentMetrics:
    """Métricas por argumento."""

    id: int
    name: str
    distribution: BetaDistribution = field(default_factory=BetaDistribution)
    total_trials: int = 0
    successes: int = 0
    failures: int = 0
    last_updated: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def conversion_rate(self) -> float:
        """Tasa de conversión empírica."""
        if self.total_trials == 0:
            return 0.0
        return self.successes / self.total_trials

    def posterior_mean(self) -> float:
        """Media posterior E[X]."""
        return self.distribution.mean()

    def posterior_variance(self) -> float:
        """Varianza posterior."""
        return self.distribution.variance()

    def to_dict(self) -> Dict:
        """Serializar para persistencia."""
        return {
            "id": self.id,
            "name": self.name,
            "distribution": self.distribution.to_dict(),
            "total_trials": self.total_trials,
            "successes": self.successes,
            "failures": self.failures,
            "last_updated": self.last_updated,
        }

    @staticmethod
    def from_dict(data: Dict) -> "ArgumentMetrics":
        """Deserializar desde dict."""
        metrics = ArgumentMetrics(
            id=data["id"],
            name=data["name"],
            total_trials=data["total_trials"],
            successes=data["successes"],
            failures=data["failures"],
            last_updated=data["last_updated"],
        )
        metrics.distribution = BetaDistribution.from_dict(data["distribution"])
        return metrics


class ThompsonSampler:
    """
    Thompson Sampling para A/B testing bayesiano de argumentos de venta.

    Mantiene Beta distributions por argumento y usa Thompson Sampling
    para balancear exploration/exploitation.
    """

    # 8 opening arguments predefinidos
    DEFAULT_ARGUMENTS = [
        "Pregunta de descubrimiento: ¿Cuál es tu mayor desafío actual?",
        "Pregunta de descubrimiento: ¿Cómo está manejando tu equipo esto hoy?",
        "Pregunta de descubrimiento: ¿Cuál sería el impacto ideal para tu negocio?",
        "Pregunta de descubrimiento: ¿Quién más está involucrado en esta decisión?",
        "Pregunta de descubrimiento: ¿Cuál es tu timeline para resolver esto?",
        "Pregunta de descubrimiento: ¿Ya has explorado soluciones alternativas?",
        "Pregunta de descubrimiento: ¿Cómo medirías el éxito?",
        "Pregunta de descubrimiento: ¿Hay restricciones presupuestarias que deba conocer?",
    ]

    def __init__(
        self,
        num_arguments: int = 8,
        argument_names: Optional[List[str]] = None,
        persistence_path: Optional[str] = None,
    ):
        """
        Inicializar Thompson Sampler.

        Args:
            num_arguments: Número de argumentos a comparar (default 8)
            argument_names: Lista de nombres para argumentos. Si None, usar defaults.
            persistence_path: Path para guardar/cargar estado (JSON)
        """
        self.num_arguments = num_arguments
        self.persistence_path = persistence_path

        # Inicializar métricas por argumento
        names = argument_names or self.DEFAULT_ARGUMENTS[:num_arguments]
        self.arguments: List[ArgumentMetrics] = [
            ArgumentMetrics(id=i, name=names[i])
            for i in range(num_arguments)
        ]

        # Cargar estado anterior si existe
        if self.persistence_path and Path(self.persistence_path).exists():
            self.load_state()

    def update_with_outcome(self, argument_id: int, conversion: bool) -> None:
        """
        Registrar outcome de un argumento.

        Args:
            argument_id: ID del argumento (0 a num_arguments-1)
            conversion: True si el argumento llevó a conversión/siguiente paso

        Raises:
            IndexError si argument_id out of range
        """
        if not (0 <= argument_id < self.num_arguments):
            raise IndexError(f"argument_id {argument_id} out of range [0, {self.num_arguments})")

        arg = self.arguments[argument_id]
        arg.distribution.update(conversion)
        arg.total_trials += 1

        if conversion:
            arg.successes += 1
        else:
            arg.failures += 1

        arg.last_updated = datetime.utcnow().isoformat()

    def sample_posterior(self) -> int:
        """
        Thompson Sampling: sample de cada posterior y retornar argumento con max.

        Esto implementa el balance exploration/exploitation automáticamente:
        - Argumentos con más éxito tienen distribucion más concentrada en valores altos
        - Argumentos con menos éxito tienen distribucion más amplia
        - Sampling favorece naturalmente los mejores pero explora alternativas

        Returns:
            argument_id con highest posterior sample
        """
        samples = [arg.distribution.sample() for arg in self.arguments]
        return int(np.argmax(samples))

    def get_best_argument(self, method: str = "thompson") -> Tuple[int, str, float]:
        """
        Obtener recomendación de mejor argumento.

        Args:
            method: "thompson" (sampling), "mean" (posterior mean), o "empirical" (tasa observada)

        Returns:
            Tuple[argument_id, argument_name, score]
        """
        if method == "thompson":
            best_id = self.sample_posterior()
            best_arg = self.arguments[best_id]
            score = best_arg.posterior_mean()
        elif method == "mean":
            best_arg = max(self.arguments, key=lambda a: a.posterior_mean())
            best_id = best_arg.id
            score = best_arg.posterior_mean()
        elif method == "empirical":
            best_arg = max(self.arguments, key=lambda a: a.conversion_rate())
            best_id = best_arg.id
            score = best_arg.conversion_rate()
        else:
            raise ValueError(f"Unknown method: {method}")

        return best_id, best_arg.name, score

    def get_all_posteriors(self) -> List[Dict]:
        """
        Obtener estado actual de todas las posteriors.

        Returns:
            Lista de dicts con id, name, posterior_mean, posterior_variance, etc.
        """
        return [
            {
                "id": arg.id,
                "name": arg.name,
                "posterior_mean": arg.posterior_mean(),
                "posterior_variance": arg.posterior_variance(),
                "empirical_conversion_rate": arg.conversion_rate(),
                "total_trials": arg.total_trials,
                "successes": arg.successes,
                "failures": arg.failures,
            }
            for arg in self.arguments
        ]

    def get_weekly_report(self) -> Dict:
        """
        Generar reporte semanal de performance.

        Returns:
            Dict con summary stats, ranking, recomendación, y trend analysis
        """
        posteriors = self.get_all_posteriors()

        # Ranking por posterior mean
        ranked = sorted(posteriors, key=lambda x: x["posterior_mean"], reverse=True)

        # Argumento recomendado
        best_id, best_name, best_score = self.get_best_argument(method="thompson")

        # Estadísticas agregadas
        total_trials = sum(p["total_trials"] for p in posteriors)
        total_conversions = sum(p["successes"] for p in posteriors)
        overall_rate = total_conversions / total_trials if total_trials > 0 else 0.0

        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "week_ending": (datetime.utcnow() + timedelta(days=1)).date().isoformat(),
            "summary": {
                "total_trials": total_trials,
                "total_conversions": total_conversions,
                "overall_conversion_rate": overall_rate,
                "num_arguments_tested": self.num_arguments,
            },
            "recommendation": {
                "argument_id": best_id,
                "argument_name": best_name,
                "posterior_mean": best_score,
                "method": "thompson_sampling",
            },
            "performance_ranking": ranked,
            "insights": self._generate_insights(ranked, total_trials),
        }

        return report

    def _generate_insights(self, ranked: List[Dict], total_trials: int) -> List[str]:
        """Generar insights automáticos del reporte."""
        insights = []

        if total_trials == 0:
            insights.append("⚠️ No hay datos aún. Necesita al menos 10 trials por argumento.")
            return insights

        # Top performer
        if ranked[0]["total_trials"] >= 10:
            top_arg = ranked[0]
            insights.append(
                f"✅ TOP PERFORMER: '{top_arg['name'][:50]}...' "
                f"con {top_arg['posterior_mean']:.1%} posterior mean "
                f"({top_arg['successes']}/{top_arg['total_trials']} trials)"
            )

        # Underperformer
        bottom_arg = ranked[-1]
        if bottom_arg["total_trials"] >= 10 and bottom_arg["posterior_mean"] < 0.2:
            insights.append(
                f"⚠️ UNDERPERFORMER: '{bottom_arg['name'][:50]}...' "
                f"con {bottom_arg['posterior_mean']:.1%} posterior mean. "
                f"Considera pausar o iterar."
            )

        # Confidence
        args_with_data = [p for p in ranked if p["total_trials"] >= 20]
        if args_with_data:
            insights.append(
                f"📊 {len(args_with_data)} argumento(s) con >20 trials "
                f"(suficiente para decisión confiable)"
            )
        else:
            min_trials = min(p["total_trials"] for p in ranked) if ranked else 0
            insights.append(
                f"📈 Continúa recolectando datos. Min trials: {min_trials}"
            )

        # Variance analysis
        variances = [p["posterior_variance"] for p in ranked]
        avg_variance = np.mean(variances)
        insights.append(
            f"🎯 Varianza promedio posterior: {avg_variance:.4f} "
            f"(menor = más confident)"
        )

        return insights

    def save_state(self, path: Optional[str] = None) -> str:
        """
        Guardar estado actual a JSON.

        Args:
            path: Path a guardar. Si None, usar self.persistence_path.

        Returns:
            Path guardado
        """
        path = path or self.persistence_path
        if not path:
            raise ValueError("No persistence_path configured")

        state = {
            "timestamp": datetime.utcnow().isoformat(),
            "num_arguments": self.num_arguments,
            "arguments": [arg.to_dict() for arg in self.arguments],
        }

        path_obj = Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

        return str(path)

    def load_state(self, path: Optional[str] = None) -> None:
        """
        Cargar estado desde JSON.

        Args:
            path: Path a cargar. Si None, usar self.persistence_path.
        """
        path = path or self.persistence_path
        if not path:
            raise ValueError("No persistence_path configured")

        path_obj = Path(path)
        if not path_obj.exists():
            raise FileNotFoundError(f"State file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            state = json.load(f)

        # Restaurar argumentos
        self.arguments = [
            ArgumentMetrics.from_dict(arg_data)
            for arg_data in state["arguments"]
        ]

    def reset_all(self) -> None:
        """Reset todas las distribuciones a prior vacío."""
        for arg in self.arguments:
            arg.distribution = BetaDistribution()
            arg.total_trials = 0
            arg.successes = 0
            arg.failures = 0
            arg.last_updated = datetime.utcnow().isoformat()


# ============================================================================
# EJEMPLO DE USO
# ============================================================================

if __name__ == "__main__":
    import tempfile

    # Crear sampler con 8 argumentos
    sampler = ThompsonSampler(
        num_arguments=8,
        persistence_path=None,  # En producción: usar path real
    )

    print("=" * 70)
    print("THOMPSON SAMPLING PARA A/B TESTING DE ARGUMENTOS DE VENTA")
    print("=" * 70)

    # Simular 100 trials aleatorios
    np.random.seed(42)
    for _ in range(100):
        # Favorecemos argumentos 0, 1, 2 (setear tasas conversión más altas)
        arg_id = sampler.sample_posterior()

        # Simular outcome con bias hacia top performers
        true_rates = [0.7, 0.65, 0.6, 0.4, 0.35, 0.3, 0.25, 0.2]
        success = np.random.rand() < true_rates[arg_id]

        sampler.update_with_outcome(arg_id, success)

    print("\n📊 POSTERIOR DISTRIBUTIONS (después de 100 trials):\n")
    for post in sampler.get_all_posteriors():
        print(
            f"[{post['id']}] {post['name'][:50]:<50} | "
            f"Mean: {post['posterior_mean']:.2%} | "
            f"Conversions: {post['successes']}/{post['total_trials']}"
        )

    print("\n" + "=" * 70)
    print("REPORTE SEMANAL\n")
    report = sampler.get_weekly_report()

    print(f"📅 Timestamp: {report['timestamp']}\n")
    print(f"Summary:")
    for k, v in report["summary"].items():
        print(f"  {k}: {v}")

    print(f"\nRecommendation:")
    rec = report["recommendation"]
    print(f"  🎯 Use argument {rec['argument_id']}: {rec['argument_name'][:60]}")
    print(f"  Expected conversion rate: {rec['posterior_mean']:.2%}")

    print(f"\nTop 3 performers:")
    for i, perf in enumerate(report["performance_ranking"][:3], 1):
        print(f"  {i}. {perf['name'][:50]}: {perf['posterior_mean']:.2%}")

    print(f"\nKey Insights:")
    for insight in report["insights"]:
        print(f"  {insight}")

    print("\n" + "=" * 70)
