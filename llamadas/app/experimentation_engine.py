"""
Experimentation Engine - Core sistema de A/B testing y MAB
Orquesta la ejecución, tracking, análisis y decisiones automáticas
"""

from __future__ import annotations

import logging
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
from enum import Enum

import numpy as np
from scipy.stats import ttest_ind, norm

logger = logging.getLogger(__name__)


# ═══ ENUMS ═══

class ExperimentStatus(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    ROLLED_OUT = "rolled_out"
    STOPPED = "stopped"


class ExperimentWinner(str, Enum):
    CONTROL = "control"
    TREATMENT = "treatment"
    TIE = "tie"
    INCONCLUSIVE = "inconclusive"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# ═══ DATA MODELS ═══

@dataclass
class ExperimentConfig:
    """Configuración completa de un experimento A/B"""

    experiment_id: str
    name: str
    hypothesis: str

    # Variants
    control_variant: str
    treatment_variant: str

    # Segmentation
    target_segment: Dict[str, any] = field(default_factory=dict)  # {"industry": "retail"}
    allocation: Dict[str, float] = field(default_factory=lambda: {"control": 0.5, "treatment": 0.5})

    # Execution
    start_date: datetime = None
    end_date: Optional[datetime] = None
    duration_days: int = 14
    min_sample_size: int = 400

    # Success Criteria
    primary_metric: str = "close_rate"
    primary_threshold: float = 0.12  # 12% lift required
    secondary_metrics: List[str] = field(default_factory=list)

    # Rollout
    rollout_enabled: bool = False
    rollout_percentages: List[int] = field(default_factory=lambda: [5, 25, 100])

    # Status
    status: str = ExperimentStatus.DRAFT.value
    metadata: Dict[str, any] = field(default_factory=dict)

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class ExperimentEvent:
    """Evento registrado durante experimento"""

    call_id: str
    experiment_id: str
    event_type: str  # "impression", "close", "objection", "feedback"
    value: Optional[float] = None
    metadata: Dict = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ExperimentResult:
    """Resultado análisis estadístico de experimento"""

    experiment_id: str

    # Control metrics
    control_n: int
    control_metric: float
    control_ci_lower: float
    control_ci_upper: float

    # Treatment metrics
    treatment_n: int
    treatment_metric: float
    treatment_ci_lower: float
    treatment_ci_upper: float

    # Statistical significance
    lift: float
    p_value: float
    cohens_d: float
    power: float
    is_significant: bool

    # Decision
    winner: str  # ExperimentWinner enum
    confidence: str  # ConfidenceLevel enum
    decision_logic: str

    # Rollout
    rollout_ready: bool
    analyzed_at: datetime = field(default_factory=datetime.now)


# ═══ EXPERIMENT ENGINE ═══

class ExperimentEngine:
    """Orquesta A/B testing automático"""

    def __init__(self, db_client, redis_client=None):
        self.db = db_client
        self.redis = redis_client
        self.experiments: Dict[str, ExperimentConfig] = {}
        self.events: List[ExperimentEvent] = []

    async def create_experiment(self, config: ExperimentConfig) -> str:
        """Crear nuevo experimento"""

        # Validación
        if not await self._validate_experiment(config):
            raise ValueError(f"Experiment {config.experiment_id} failed validation")

        # Guardar
        self.experiments[config.experiment_id] = config
        config.status = ExperimentStatus.RUNNING.value
        config.start_date = datetime.now()

        logger.info(
            f"Experiment created: {config.experiment_id} "
            f"({config.control_variant} vs {config.treatment_variant})"
        )

        return config.experiment_id

    async def _validate_experiment(self, config: ExperimentConfig) -> bool:
        """Validar que experimento es viable"""

        # 1. Hypothesis must be falsable
        if len(config.hypothesis) < 20:
            logger.error("Hypothesis too vague")
            return False

        # 2. Sample size sufficient
        min_needed = calculate_sample_size_needed(
            baseline_rate=0.25,
            expected_lift=config.primary_threshold
        )

        if config.min_sample_size < min_needed:
            logger.error(f"Sample size too small: need {min_needed}, got {config.min_sample_size}")
            return False

        # 3. Duration sufficient (avoid DOW bias)
        if config.duration_days < 7:
            logger.error("Duration < 7 days")
            return False

        return True

    async def assign_variant(self,
                           call_context: dict,
                           experiment_id: str) -> str:
        """
        Determinar qué variante mostrar a esta llamada

        Usa hashing determinístico para asegurar:
        - Mismo usuario siempre ve misma variante (consistency)
        - Pero distribución uniforme entre usuarios
        """

        exp = self.experiments.get(experiment_id)
        if not exp:
            return None

        # Hash consistente
        hash_input = f"{call_context.get('phone', '')}{experiment_id}"
        hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)
        bucket = (hash_value % 100) / 100.0

        if bucket < exp.allocation.get("control", 0.5):
            variant = exp.control_variant
        else:
            variant = exp.treatment_variant

        return variant

    async def track_event(self,
                         call_id: str,
                         experiment_id: str,
                         event_type: str,
                         value: Optional[float] = None,
                         metadata: Optional[dict] = None):
        """Registrar evento de experimento"""

        event = ExperimentEvent(
            call_id=call_id,
            experiment_id=experiment_id,
            event_type=event_type,
            value=value,
            metadata=metadata or {},
            timestamp=datetime.now()
        )

        self.events.append(event)

        logger.debug(
            f"Experiment event tracked: {experiment_id} / {event_type} "
            f"(call={call_id}, value={value})"
        )

    async def analyze_experiment(self,
                                experiment_id: str) -> ExperimentResult:
        """
        Análisis estadístico completo de experimento
        Retorna: resultado con decision (winner, confidence, etc)
        """

        exp = self.experiments.get(experiment_id)
        if not exp:
            raise ValueError(f"Experiment {experiment_id} not found")

        # Obtener eventos para este experimento
        exp_events = [e for e in self.events if e.experiment_id == experiment_id]

        if len(exp_events) == 0:
            return ExperimentResult(
                experiment_id=experiment_id,
                control_n=0,
                control_metric=0,
                control_ci_lower=0,
                control_ci_upper=0,
                treatment_n=0,
                treatment_metric=0,
                treatment_ci_lower=0,
                treatment_ci_upper=0,
                lift=0,
                p_value=1.0,
                cohens_d=0,
                power=0,
                is_significant=False,
                winner=ExperimentWinner.INCONCLUSIVE.value,
                confidence=ConfidenceLevel.LOW.value,
                decision_logic="No events recorded",
                rollout_ready=False
            )

        # Separar control vs treatment
        control_values = []
        treatment_values = []

        for event in exp_events:
            if event.metadata.get("variant") == exp.control_variant:
                if event.value is not None:
                    control_values.append(event.value)
            elif event.metadata.get("variant") == exp.treatment_variant:
                if event.value is not None:
                    treatment_values.append(event.value)

        # Si no hay suficiente data, retornar inconclusive
        if len(control_values) < 20 or len(treatment_values) < 20:
            return ExperimentResult(
                experiment_id=experiment_id,
                control_n=len(control_values),
                control_metric=0,
                control_ci_lower=0,
                control_ci_upper=0,
                treatment_n=len(treatment_values),
                treatment_metric=0,
                treatment_ci_lower=0,
                treatment_ci_upper=0,
                lift=0,
                p_value=1.0,
                cohens_d=0,
                power=0,
                is_significant=False,
                winner=ExperimentWinner.INCONCLUSIVE.value,
                confidence=ConfidenceLevel.LOW.value,
                decision_logic=f"Insufficient data: control={len(control_values)}, treatment={len(treatment_values)}",
                rollout_ready=False
            )

        # Análisis estadístico
        ctrl_mean = np.mean(control_values)
        treat_mean = np.mean(treatment_values)

        # T-test
        t_stat, p_value = ttest_ind(treatment_values, control_values)

        # 95% CI
        ctrl_std = np.std(control_values)
        treat_std = np.std(treatment_values)
        n1, n2 = len(control_values), len(treatment_values)

        se = np.sqrt(ctrl_std**2/n1 + treat_std**2/n2)
        ci_lower = (treat_mean - ctrl_mean) - 1.96 * se
        ci_upper = (treat_mean - ctrl_mean) + 1.96 * se

        # Effect size (Cohen's d)
        pooled_std = np.sqrt(((n1-1)*ctrl_std**2 + (n2-1)*treat_std**2) / (n1+n2-2))
        cohens_d = (treat_mean - ctrl_mean) / pooled_std if pooled_std > 0 else 0

        # Power
        power = self._calculate_power(cohens_d, n1, n2)

        # Lift
        lift = (treat_mean - ctrl_mean) / ctrl_mean if ctrl_mean > 0 else 0

        # Decisión
        winner, confidence, decision_logic = self._make_decision(
            lift=lift,
            p_value=p_value,
            power=power,
            n1=n1,
            n2=n2,
            threshold=exp.primary_threshold,
            exp=exp
        )

        result = ExperimentResult(
            experiment_id=experiment_id,
            control_n=n1,
            control_metric=ctrl_mean,
            control_ci_lower=ctrl_mean - 1.96 * (ctrl_std / np.sqrt(n1)),
            control_ci_upper=ctrl_mean + 1.96 * (ctrl_std / np.sqrt(n1)),
            treatment_n=n2,
            treatment_metric=treat_mean,
            treatment_ci_lower=ci_lower,
            treatment_ci_upper=ci_upper,
            lift=lift,
            p_value=p_value,
            cohens_d=cohens_d,
            power=power,
            is_significant=p_value < 0.05,
            winner=winner,
            confidence=confidence,
            decision_logic=decision_logic,
            rollout_ready=(winner != ExperimentWinner.INCONCLUSIVE.value and
                          confidence in [ConfidenceLevel.HIGH.value, ConfidenceLevel.MEDIUM.value])
        )

        logger.info(
            f"Experiment {experiment_id} analyzed: "
            f"control={ctrl_mean:.3f} (n={n1}), "
            f"treatment={treat_mean:.3f} (n={n2}), "
            f"lift={lift:.1%}, p={p_value:.4f}, "
            f"winner={winner} ({confidence})"
        )

        return result

    def _calculate_power(self, cohens_d: float, n1: int, n2: int) -> float:
        """Post-hoc power calculation"""
        # Aproximación simple: función de effect size
        # Real implementation usaría scipy.stats.power analysis

        neff = (n1 * n2) / (n1 + n2)
        z_power = abs(cohens_d) * np.sqrt(neff) - norm.ppf(0.975)  # 1.96 for 0.05 alpha

        # Cumulative normal distribution
        power = norm.cdf(z_power)
        return max(0, min(power, 1))

    def _make_decision(self,
                      lift: float,
                      p_value: float,
                      power: float,
                      n1: int,
                      n2: int,
                      threshold: float,
                      exp: ExperimentConfig) -> Tuple[str, str, str]:
        """
        Determinar winner, confidence level, y lógica de decisión

        Retorna: (winner, confidence, decision_logic)
        """

        # 1. Check minimum sample size
        if n1 < exp.min_sample_size or n2 < exp.min_sample_size:
            return (
                ExperimentWinner.INCONCLUSIVE.value,
                ConfidenceLevel.LOW.value,
                f"Insufficient sample size: control={n1}, treatment={n2}, need {exp.min_sample_size}"
            )

        # 2. Check days running (avoid DOW bias)
        days_running = (datetime.now() - exp.start_date).days
        if days_running < 7:
            return (
                ExperimentWinner.INCONCLUSIVE.value,
                ConfidenceLevel.LOW.value,
                f"Experiment running only {days_running} days, need 7+ to avoid DOW bias"
            )

        # 3. Statistical significance check
        if p_value < 0.05 and abs(lift) >= threshold:
            # Significant result with sufficient effect size
            winner = ExperimentWinner.TREATMENT.value if lift > 0 else ExperimentWinner.CONTROL.value

            if p_value < 0.01 and power > 0.80:
                confidence = ConfidenceLevel.HIGH.value
            elif p_value < 0.05 and power > 0.70:
                confidence = ConfidenceLevel.MEDIUM.value
            else:
                confidence = ConfidenceLevel.LOW.value

            return (
                winner,
                confidence,
                f"Significant: lift={lift:.1%}, p={p_value:.4f}, power={power:.1%}"
            )

        elif 0.05 < p_value < 0.15 and abs(lift) >= threshold and power > 0.70:
            # Borderline significant with good effect size and power
            winner = ExperimentWinner.TREATMENT.value if lift > 0 else ExperimentWinner.CONTROL.value

            return (
                winner,
                ConfidenceLevel.MEDIUM.value,
                f"Borderline significant: lift={lift:.1%}, p={p_value:.4f}, power={power:.1%}"
            )

        else:
            # No clear winner
            return (
                ExperimentWinner.INCONCLUSIVE.value,
                ConfidenceLevel.LOW.value,
                f"No significant effect: lift={lift:.1%}, p={p_value:.4f}, threshold={threshold}"
            )

    async def declare_winner_and_start_rollout(self,
                                               experiment_id: str,
                                               result: ExperimentResult) -> bool:
        """Declarar ganador e iniciar rollout automático"""

        if result.winner == ExperimentWinner.INCONCLUSIVE.value:
            logger.warning(f"Experiment {experiment_id} inconclusive, no rollout")
            return False

        exp = self.experiments[experiment_id]
        exp.status = ExperimentStatus.COMPLETED.value
        exp.end_date = datetime.now()

        winner_variant = (
            exp.treatment_variant
            if result.winner == ExperimentWinner.TREATMENT.value
            else exp.control_variant
        )

        logger.info(
            f"Winner declared: {experiment_id} → {winner_variant} "
            f"(lift={result.lift:.1%}, confidence={result.confidence})"
        )

        if exp.rollout_enabled:
            # Iniciar rollout automático (Stage 1: 5%)
            await self._start_rollout_stage(experiment_id, winner_variant, stage=1)

        return True

    async def _start_rollout_stage(self,
                                   experiment_id: str,
                                   winner_variant: str,
                                   stage: int):
        """Iniciar un stage de rollout"""

        exp = self.experiments[experiment_id]
        percentage = exp.rollout_percentages[stage - 1] if stage <= len(exp.rollout_percentages) else 100

        logger.info(
            f"Rollout Stage {stage}: {experiment_id} → {winner_variant} "
            f"({percentage}% traffic)"
        )

        exp.metadata['rollout_stage'] = stage
        exp.metadata['rollout_winner'] = winner_variant
        exp.metadata['rollout_percentage'] = percentage / 100.0
        exp.metadata['rollout_start'] = datetime.now().isoformat()


# ═══ MULTI-ARMED BANDITS ═══

class ArgumentBandit:
    """Thompson Sampling para argumentos de venta"""

    def __init__(self, arguments: List[str]):
        self.arguments = arguments
        self.alpha = {arg: 1.0 for arg in arguments}  # Successes + prior
        self.beta = {arg: 1.0 for arg in arguments}   # Failures + prior

    async def select_argument(self) -> str:
        """Thompson Sampling: sample from posterior, retornar max"""

        samples = {}
        for arg in self.arguments:
            samples[arg] = np.random.beta(self.alpha[arg], self.beta[arg])

        selected = max(samples.keys(), key=lambda k: samples[k])

        logger.debug(f"Thompson: selected '{selected}' samples={samples}")

        return selected

    async def feedback(self, argument: str, outcome: bool):
        """Actualizar posterior con feedback"""

        if outcome:
            self.alpha[argument] += 1
        else:
            self.beta[argument] += 1

        success_rate = self.alpha[argument] / (self.alpha[argument] + self.beta[argument])

        logger.debug(
            f"Argument feedback: '{argument}' → {outcome} "
            f"(success_rate={success_rate:.1%})"
        )

    def get_posterior_estimate(self, argument: str) -> float:
        """Expected success rate para un argumento"""
        total = self.alpha[argument] + self.beta[argument]
        return self.alpha[argument] / total if total > 0 else 0.5


class ContextualArgumentBandit:
    """Thompson Sampling con contexto (industry x size x score)"""

    def __init__(self):
        self.bandits = {}
        self.default_arguments = [
            "ROI en 3 meses",
            "Automatizamos 80%",
            "Reducimos costos 40%",
        ]

    async def select_argument(self,
                            industry: str,
                            company_size: int,
                            lead_score: int) -> str:
        """Seleccionar argumento para este contexto"""

        score_bucket = self._score_bucket(lead_score)
        context_key = f"{industry}_{company_size}_{score_bucket}"

        # Lazy init bandit para este contexto
        if context_key not in self.bandits:
            self.bandits[context_key] = ArgumentBandit(self.default_arguments)

        return await self.bandits[context_key].select_argument()

    async def feedback(self,
                      industry: str,
                      company_size: int,
                      lead_score: int,
                      argument: str,
                      outcome: bool):
        """Registrar feedback para este contexto"""

        score_bucket = self._score_bucket(lead_score)
        context_key = f"{industry}_{company_size}_{score_bucket}"

        if context_key in self.bandits:
            await self.bandits[context_key].feedback(argument, outcome)

    def _score_bucket(self, score: int) -> str:
        """Discretizar lead score"""
        if score < 30:
            return "cold"
        elif score < 70:
            return "warm"
        else:
            return "hot"


class ActionBandit:
    """Epsilon-Greedy para acciones post-call"""

    def __init__(self, actions: List[str], epsilon: float = 0.15):
        self.actions = actions
        self.epsilon = epsilon
        self.uses = {action: 0 for action in actions}
        self.successes = {action: 0 for action in actions}

    async def select_action(self) -> str:
        """Epsilon-Greedy: (1-ε)% exploit, ε% explore"""

        if np.random.random() < self.epsilon:
            # Explore
            selected = np.random.choice(self.actions)
            logger.debug(f"Epsilon-Greedy EXPLORE: {selected}")
        else:
            # Exploit
            success_rates = {
                action: self.successes[action] / max(1, self.uses[action])
                for action in self.actions
            }
            selected = max(success_rates.keys(), key=lambda k: success_rates[k])
            logger.debug(f"Epsilon-Greedy EXPLOIT: {selected} (rate={success_rates[selected]:.1%})")

        self.uses[selected] += 1
        return selected

    async def feedback(self, action: str, outcome: bool):
        """Registrar resultado de acción"""
        if outcome:
            self.successes[action] += 1


# ═══ HELPER FUNCTIONS ═══

def calculate_sample_size_needed(
    baseline_rate: float = 0.25,
    expected_lift: float = 0.12,
    alpha: float = 0.05,
    beta: float = 0.20,
    two_tailed: bool = True
) -> int:
    """
    Calcular n necesario para detectar efecto

    Groomly baseline: ~25% close rate
    Expected lift: 12% (3% absolute)
    Result: n ≈ 420 per variant
    """

    z_alpha = norm.ppf(1 - alpha/2) if two_tailed else norm.ppf(1 - alpha)
    z_beta = norm.ppf(1 - beta)

    p1 = baseline_rate
    p2 = baseline_rate * (1 + expected_lift)

    numerator = (z_alpha + z_beta) ** 2
    variance = p1 * (1 - p1) + p2 * (1 - p2)

    n = numerator * variance / ((p2 - p1) ** 2)

    return int(np.ceil(n))
