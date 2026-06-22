# Experimentation Framework 2026
## Diseño de Sistema de Aprendizaje Automático para Groomly

**Status**: Core Design Document  
**Version**: 2.0 (Finalized)  
**Date**: 2026-06-21  
**Author**: Growth Engineering + Experimentation Lead  

---

## TABLA CONTENIDOS

1. [Rating Capacidad Experimentación](#rating-capacidad)
2. [A/B Testing Framework](#ab-testing-framework)
3. [Multi-Armed Bandits (MAB)](#mab-design)
4. [5 Tipos Experimentos Base](#tipos-experimentos)
5. [Experiment Velocity Target](#velocity-target)
6. [ROI Proyectado](#roi-proyectado)
7. [Roadmap 6 Meses](#roadmap)
8. [Infraestructura Necesaria](#infraestructura)
9. [Safety & Guardrails](#safety)

---

## RATING CAPACIDAD EXPERIMENTACIÓN

### Scoring Actual (Pre-Framework)
- **Capacidad de Experimentación: 3/10**

**Reasoning:**
- ✅ Bases presentes: Deal Engine + Conversation Intelligence
- ✅ Histórico de datos: 47+ usos de argumentos, tasa de cierre documentada
- ✅ Tracking básico: Lead scores, objection handling metrics
- ❌ Sin A/B testing estructura
- ❌ Sin winner selection automática
- ❌ Sin experimentation cadence
- ❌ Sin rollout strategy
- ❌ Sin Multi-Armed Bandits
- ❌ Sin experiment registry
- ❌ Sin safety guardrails

### Scoring Post-Framework Implementation
- **Capacidad de Experimentación: 8.5/10**

**Alcanzable en T+6 meses con roadmap propuesto**

---

## A/B TESTING FRAMEWORK

### 1. Experiment Structure

```python
# Core data model
@dataclass
class ExperimentConfig:
    """Configuración de experimento A/B"""
    experiment_id: str              # "exp_argue_roi_001"
    name: str                       # "ROI Argument vs Automation"
    hypothesis: str                 # "ROI arg cierra 12% más que automation arg"
    
    # Variants
    control_variant: str            # "automation_80"
    treatment_variant: str          # "roi_3months"
    
    # Segmentation
    target_segment: dict            # {"industry": "retail", "company_size": "10-50"}
    allocation: dict                # {"control": 0.50, "treatment": 0.50}
    
    # Execution
    start_date: datetime
    end_date: datetime              # None = running
    duration_days: int              # 7, 14, 21, 30
    min_sample_size: int            # Mínimo n para decisión
    
    # Success Criteria
    primary_metric: str             # "close_rate"
    primary_threshold: float        # 0.12 (12% lift)
    secondary_metrics: List[str]    # ["deal_value", "engagement"]
    
    # Rollout Strategy
    rollout_enabled: bool           # Post-winner
    rollout_percentages: List[int]  # [5, 25, 50, 100]
    
    status: str                     # "draft" | "running" | "completed" | "rolled_out"
    metadata: dict                  # Custom fields


@dataclass
class ExperimentResult:
    """Resultado de experimento después de análisis"""
    experiment_id: str
    
    # Control metrics
    control_n: int
    control_metric: float           # e.g., close_rate
    control_ci_lower: float         # 95% CI
    control_ci_upper: float
    
    # Treatment metrics
    treatment_n: int
    treatment_metric: float
    treatment_ci_lower: float
    treatment_ci_upper: float
    
    # Statistical Test
    lift: float                     # (treatment - control) / control
    p_value: float                  # Statistical significance (t-test or equiv)
    power: float                    # 1 - beta: probabilidad de detectar efecto real
    is_significant: bool            # p_value < 0.05
    
    # Decision
    winner: str                     # "control" | "treatment" | "tie" | "inconclusive"
    confidence_recommendation: str  # "HIGH" | "MEDIUM" | "LOW"
    decision_logic: str             # Explicación
    
    # Rollout readiness
    rollout_ready: bool
    rollout_start_date: Optional[datetime]


# Core execution engine
class ExperimentEngine:
    """Orquesta ejecución de experimentos A/B"""
    
    async def create_experiment(self, config: ExperimentConfig) -> str:
        """Crear nuevo experimento"""
        # Validar hypothesis (debe ser falsable)
        # Validar sample size requerido
        # Guardar en experiment_registry
        # Retornar experiment_id
        pass
    
    async def assign_variant(self, 
                           call_context: dict,
                           experiment_id: str) -> str:
        """Determinar qué variante mostrar a este call"""
        # Acceso a redis cache para randomización consistente
        # Hash determinístico: sha256(phone + experiment_id + date) % 100
        # Esto asegura: mismo usuario siempre ve misma variante
        # Pero permite cambiar de grupo post-experiment si es necesario
        
        bucket = hash_consistent(call_context['phone'], experiment_id)
        
        if bucket < self.config.allocation['control'] * 100:
            return self.config.control_variant
        else:
            return self.config.treatment_variant
    
    async def track_event(self,
                         call_id: str,
                         experiment_id: str,
                         event_type: str,  # "impression", "close", "objection_raised"
                         value: float = None,
                         metadata: dict = None):
        """Registrar evento de experimento"""
        # Almacenar en experiment_events table
        # event_type + experiment_id + call_id = unique key
        # Usar append-only log pattern
        
        event = {
            "timestamp": datetime.now(),
            "call_id": call_id,
            "experiment_id": experiment_id,
            "event_type": event_type,
            "value": value,
            "metadata": metadata or {}
        }
        
        await self.db.experiment_events.insert_one(event)
    
    async def analyze_experiment(self, 
                                experiment_id: str) -> ExperimentResult:
        """Análisis estadístico A/B completo"""
        # Ejecutar post-hoc análisis usando scipy.stats.ttest_ind
        # Calcular 95% confidence intervals
        # Determinar power (probabilidad de haber detectado efecto real si existe)
        # Aplicar Bayesian decision rule:
        #   - Si p < 0.05 Y winner_effect > threshold: "HIGH"
        #   - Si 0.05 < p < 0.10 Y winner_effect > threshold: "MEDIUM"
        #   - Si p > 0.10 O sample size < min_required: "INCONCLUSIVE"
        pass
```

### 2. Statistical Rigor

**Approach**: Frequentist + Bayesian hybrid

```python
def calculate_sample_size_needed(
    baseline_rate: float,      # Current close rate (e.g., 0.25)
    expected_lift: float,      # Minimum detectable effect (e.g., 0.12 = 12%)
    alpha: float = 0.05,       # Type I error (false positive)
    beta: float = 0.20,        # Type II error (false negative)
    two_tailed: bool = True
) -> int:
    """
    Usar Neyman-Pearson lemma para calcular n
    
    Groomly baseline: ~25% close rate
    Minimum detectable effect (MDE): 12% relative lift (3% absolute)
    
    Result: n ≈ 420 calls per variant
    Total experiment: ~840 calls (2 variantes)
    """
    from scipy.stats import norm
    
    z_alpha = norm.ppf(1 - alpha/2) if two_tailed else norm.ppf(1 - alpha)
    z_beta = norm.ppf(1 - beta)
    
    p1 = baseline_rate
    p2 = baseline_rate * (1 + expected_lift)
    
    numerator = (z_alpha + z_beta) ** 2
    denominator = (p2 - p1) ** 2
    variance = p1 * (1 - p1) + p2 * (1 - p2)
    
    n = numerator * variance / denominator
    return int(n)


def run_experiment_test(control_data: list, 
                       treatment_data: list) -> dict:
    """
    Two-sample t-test con análisis de poder
    
    Input: Listas de resultados (0=rechazo, 1=cierre)
    Output: {"winner", "p_value", "ci_lower", "ci_upper", "power"}
    """
    from scipy.stats import ttest_ind, norm
    from numpy import mean, std, sqrt
    
    ctrl_mean = mean(control_data)
    treat_mean = mean(treatment_data)
    
    t_stat, p_value = ttest_ind(treatment_data, control_data)
    
    ctrl_std = std(control_data)
    treat_std = std(treatment_data)
    n1, n2 = len(control_data), len(treatment_data)
    
    # 95% CI para diferencia
    se = sqrt(ctrl_std**2/n1 + treat_std**2/n2)
    ci_lower = (treat_mean - ctrl_mean) - 1.96 * se
    ci_upper = (treat_mean - ctrl_mean) + 1.96 * se
    
    # Effect size (Cohen's d)
    pooled_std = sqrt(((n1-1)*ctrl_std**2 + (n2-1)*treat_std**2) / (n1+n2-2))
    cohens_d = (treat_mean - ctrl_mean) / pooled_std if pooled_std > 0 else 0
    
    # Power (post-hoc): probabilidad de haber detectado efecto si existe
    # Aproximación: función de effect size y n
    power = 0.5 + 0.5 * (abs(cohens_d) * sqrt(n1*n2/(n1+n2)) - 1.96) / 2  # Simplificado
    
    return {
        "control_mean": ctrl_mean,
        "treatment_mean": treat_mean,
        "lift": (treat_mean - ctrl_mean) / ctrl_mean if ctrl_mean > 0 else 0,
        "p_value": p_value,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "cohens_d": cohens_d,
        "power": max(0, min(power, 1)),
        "winner": "treatment" if treat_mean > ctrl_mean else "control",
        "is_significant": p_value < 0.05
    }
```

### 3. Experimentation Cadence

```
WEEKLY CYCLE (Monday 00:00 UTC):

MON 00:00  → Data freeze (todos los datos completados hasta DOM 23:59)
MON 01:00  → Analyze all running experiments
MON 02:00  → Generate weekly report (Slack + dashboard)
           → Decisión: Continue / Stop / Declare winner
MON 03:00  → Launch nuevos experimentos (si candidatos listos)

DECISION RULES:

1. DECLARE WINNER si:
   - p_value < 0.05 Y
   - winner_lift >= minimum_detectable_effect Y
   - sample_size >= min_required AND
   - experiment_duration >= min_days

2. EXTEND experiment si:
   - p_value > 0.10 (indecisive) Y
   - power < 0.80 Y
   - experiment_duration < max_duration

3. STOP experiment si:
   - p_value > 0.10 después de max_duration Y
   - Conclusión: "No significant effect detected"

4. EARLY STOP (futuro, requires Bayesian setup):
   - Si treatment_metric << control_metric (p < 0.01) → Stop inmediatamente
   - Safety guardrail: no expongas tratamiento perjudicial
```

### 4. Rollout Strategy

**Post-winner, implementar rollout gradual a todos:**

```python
class RolloutStrategy:
    """Estrategia de rollout gradual post-experimento"""
    
    # Stage 1: Validación (5% tráfico)
    # - Duración: 3-4 días
    # - Métrica: Mismo KPI que experimento original
    # - Decisión: Si métrica se mantiene ±2%, avanzar a Stage 2
    
    # Stage 2: Ramp-up (25% tráfico)
    # - Duración: 7 días
    # - Métrica: Monitoreo continuo
    # - Decisión: Si métrica OK, avanzar a Stage 3
    
    # Stage 3: Full Rollout (100% tráfico)
    # - Duración: Indefinido
    # - Métrica: Monitoreo diario (alertas si regresa a baseline)
    
    async def get_rollout_percentage(self, 
                                     experiment_id: str,
                                     winner_variant: str) -> float:
        """Retorna % de tráfico que debería ver winner"""
        # Query rollout_schedule table
        # Basado en: experiment_id + start_date + stage_duration
        # Retornar: 0.05, 0.25, 1.0
        pass
```

---

## MULTI-ARMED BANDITS (MAB) DESIGN

### 1. Thompson Sampling para Argumentos

**Caso de uso**: Seleccionar qué argumento usar en siguiente turno

```python
from scipy.stats import binom, beta
import numpy as np


class ArgumentBandit:
    """Thompson Sampling para argumentos de venta"""
    
    def __init__(self, arguments: List[str]):
        self.arguments = arguments
        # State: (successes, failures) per argument
        self.alpha = {arg: 1.0 for arg in arguments}  # Prior successes
        self.beta = {arg: 1.0 for arg in arguments}   # Prior failures
    
    async def select_argument(self, 
                            context: dict = None) -> str:
        """
        Thompson Sampling: sample from posterior Beta(α, β) para cada argumento,
        retornar el argumento con max sample
        
        Ventaja: Balanceo automático entre exploración y explotación
        - Argumentos con feedback positivo: α++ → distribución corre a derecha
        - Argumentos sin datos: mantienen priors conservadores
        - Naturally espera hasta tener suficiente data antes de explotar
        """
        
        # 1. Sample from posterior para cada argumento
        samples = {}
        for arg in self.arguments:
            # Beta distribution: shape=(α, β)
            sample = np.random.beta(self.alpha[arg], self.beta[arg])
            samples[arg] = sample
        
        # 2. Retornar argumento con max sample
        selected = max(samples.keys(), key=lambda k: samples[k])
        
        logger.info(f"Thompson: selected '{selected}' samples={samples}")
        return selected
    
    async def feedback(self, argument: str, outcome: bool):
        """
        Actualizar creencias basadas en feedback
        
        outcome=True  → prospect respondió positivamente a argumento
        outcome=False → prospect rechazó o no respondió
        """
        if outcome:
            self.alpha[argument] += 1
        else:
            self.beta[argument] += 1
        
        # Log para análisis posterior
        logger.info(
            f"Argument feedback: '{argument}' → {outcome} "
            f"(α={self.alpha[argument]}, β={self.beta[argument]})"
        )
    
    def get_posterior_estimate(self, argument: str) -> float:
        """Retornar E[p] = α / (α + β) = estimado success rate"""
        total = self.alpha[argument] + self.beta[argument]
        return self.alpha[argument] / total if total > 0 else 0.5


class ContextualArgumentBandit:
    """Thompson Sampling CON CONTEXTO"""
    
    def __init__(self):
        # Bandits por segmento: industry x company_size x lead_score
        self.bandits = {}
    
    async def select_argument(self, 
                            industry: str,
                            company_size: int,
                            lead_score: int) -> str:
        """
        Ejemplo: "retail_small_warm" → Thompson bandit específico para ese segmento
        
        Benefit: Cada segmento tiene su propio learning, pero rápido onboarding
        si segmento nuevo (hereda de "general" bandit con alpha=5, beta=5)
        """
        
        segment_key = f"{industry}_{company_size}_{self._score_bucket(lead_score)}"
        
        if segment_key not in self.bandits:
            # Initialize nuevo contexto con priors conservadores
            self.bandits[segment_key] = ArgumentBandit([
                "ROI en 3 meses",
                "Automatizamos 80%",
                "Reducimos costos 40%",
            ])
            # Copy some belief from general bandit si existe
            general = self.bandits.get("general")
            if general:
                for arg in self.bandits[segment_key].arguments:
                    self.bandits[segment_key].alpha[arg] = general.alpha.get(arg, 2)
                    self.bandits[segment_key].beta[arg] = general.beta.get(arg, 2)
        
        return await self.bandits[segment_key].select_argument()
    
    def _score_bucket(self, score: int) -> str:
        """Discretizar lead score en "cold", "warm", "hot" """
        if score < 30:
            return "cold"
        elif score < 70:
            return "warm"
        else:
            return "hot"
```

### 2. Epsilon-Greedy para Acciones

**Caso de uso**: Seleccionar qué acción post-call (demo, follow-up, nurturing)

```python
class ActionBandit:
    """Epsilon-Greedy para acciones post-call"""
    
    def __init__(self, actions: List[str], epsilon: float = 0.15):
        self.actions = actions  # ["demo", "objection_handling", "nurturing"]
        self.epsilon = epsilon  # 15% exploración
        
        # State: (uses, successes) per action
        self.uses = {action: 0 for action in actions}
        self.successes = {action: 0 for action in actions}
    
    async def select_action(self) -> str:
        """
        Epsilon-Greedy: 
        - (1-ε)% del tiempo: select argmax success_rate (exploit)
        - ε% del tiempo: select random (explore)
        """
        
        if np.random.random() < self.epsilon:
            # Explore: random action
            selected = np.random.choice(self.actions)
            logger.info(f"Epsilon-Greedy EXPLORE: {selected}")
        else:
            # Exploit: best performing action
            success_rates = {
                action: self.successes[action] / max(1, self.uses[action])
                for action in self.actions
            }
            selected = max(success_rates.keys(), key=lambda k: success_rates[k])
            logger.info(f"Epsilon-Greedy EXPLOIT: {selected} (rate={success_rates[selected]:.2%})")
        
        self.uses[selected] += 1
        return selected
    
    async def feedback(self, action: str, outcome: bool):
        """outcome=True si acción resultó en conversión siguiente"""
        if outcome:
            self.successes[action] += 1
```

### 3. Contextual MAB: Segmenting by Context

```python
class ContextualBanditSystem:
    """MAB system with contextual splits"""
    
    # Level 1: Industry splits
    # - Retail tiene diferentes argumentos que IT
    
    # Level 2: Company Size
    # - SMB vs Enterprise buscan ROI diferente
    
    # Level 3: Lead Score
    # - Cold prospects: "educación primero" vs Hot: "demo ya"
    
    # Level 4: Conversation Phase
    # - Opening vs Closing argument es diferente
    
    # Benefit: 4x4x3x2 = 96 contextos
    # Sin contextos: 1 bandit global
    # Con contextos: faster convergence porque cada uno tiene suficiente data
```

---

## TIPOS EXPERIMENTOS BASE (5)

### Type 1: ARGUMENT EXPERIMENTS

**Purpose**: Optimizar qué argumentos funcionan mejor

```yaml
Experiment: "ROI Argument vs Automation"

Control: "Automatizamos 80% del trabajo"
Treatment: "Recuperas inversión en 3 meses"

Hypothesis: |
  ROI argument cierra 12% más porque apela a business outcome
  vs automation argument que apela a convenience

Segment: 
  - Industry: Any
  - Company Size: 20-500 employees
  - Lead Score: Warm-Hot (30+)

Primary Metric: close_rate
Sample Size: ~420 per variant

Expected Timeline: 10-14 days (140-200 calls/día)
```

**Tracking**:
```python
async def track_argument_experiment(
    call_id: str,
    experiment_id: str,
    argument_used: str,
    prospect_response: str,      # "interested", "neutral", "objection"
    final_outcome: bool           # closed = True
):
    await experiment_engine.track_event(
        call_id=call_id,
        experiment_id=experiment_id,
        event_type="argument_used",
        value=1.0 if final_outcome else 0.0,
        metadata={
            "argument": argument_used,
            "response": prospect_response
        }
    )
```

### Type 2: OFFER/PRICING EXPERIMENTS

**Purpose**: Optimizar precio, plan, descuento

```yaml
Experiment: "Starter $1900 vs Starter $1500 (21% discount)"

Control: 
  Plan: Starter
  Price: $1900
  Discount: 0%

Treatment:
  Plan: Starter
  Price: $1500
  Discount: 21%

Hypothesis: |
  21% discount increase acceptance rate 30% más,
  pero revenue actual es: 
    Control: $1900 * 42% = $798
    Treatment: $1500 * 55% = $825
  Net: +$27 per offer, pero volumen importante
  
  Question: Does lower price attract different quality of leads?
  (leads que cierran pero después churn)

Segment:
  - Lead Score: Cold-Warm (< 70)
  - Budget stated: < $2000

Primary Metric: expected_revenue = offer_price * acceptance_rate
Secondary: churn_rate (en los 90 días post-venta)

Sample Size: ~350 per variant (más bajo porque tracking revenue es preciso)
Timeline: 7-10 days
```

### Type 3: OBJECTION HANDLING EXPERIMENTS

**Purpose**: Optimizar cómo manejar objeciones

```yaml
Experiment: "Objection 'Es muy caro': Rebuttal A vs B"

Control Rebuttal: 
  "Recuperas inversión en 3 meses"

Treatment Rebuttal:
  "Nuestros clientes similares ahorran $15k/año"

Hypothesis: |
  Social proof (comparables) más efectiva que ROI math
  porque humaniza y elimina mística de "cálculos de vendedor"

Segment:
  - Objection detected: "caro", "precio", "presupuesto"
  - Only applies when OBJECTION actually raised
  
Primary Metric: objection_overcome_rate

Sample Size: Variable depending on objection frequency
  - "Es caro" → ~80-100 ocurrencias/mes → test cada 2 semanas
  - Rara objeción → acumular en MAB contextual

Timeline: 14-21 days (waiting for objection distribution)
```

### Type 4: NEXT ACTION EXPERIMENTS

**Purpose**: Optimizar timing, channel, mensaje de follow-up

```yaml
Experiment: "Post-call: WhatsApp 24h vs Email 48h"

Control:
  Channel: WhatsApp
  Timing: 24 hours
  Message: Objection handling template

Treatment:
  Channel: Email
  Timing: 48 hours
  Message: Personalized educational content

Hypothesis: |
  WhatsApp inmediato → spike en re-engagement pero olvido
  Email educacional → slower pero higher quality conversation
  
  Métrica final: "converted_in_30_days" (no solo re-engagement)

Segment:
  - Lead Score: Warm (30-70)
  - Previous call outcome: "no decision yet"

Primary Metric: conversion_rate_30d
Secondary: 
  - re_engagement_rate_7d
  - quality_of_next_conversation

Sample Size: ~600 per variant (longer tail, 30-day window)

Timeline: 35-40 days (esperar resultado 30d)
```

### Type 5: VOICE/TONE EXPERIMENTS

**Purpose**: Optimizar personalidad y tono del agente

```yaml
Experiment: "Voice Tone: Professional vs Consultative"

Control:
  Persona: Professional, efficient, structured
  Talking speed: 1.0x (normal)
  Empathy cues: Minimal
  System Prompt: "Act as a sales professional..."

Treatment:
  Persona: Consultative, advisory, human-like
  Talking speed: 0.95x (slightly slower)
  Empathy cues: More "I understand your concern..."
  System Prompt: "Act as a trusted advisor..."

Hypothesis: |
  Consultative tone → higher engagement but longer calls
  Professional tone → faster closes but lower perception of understanding
  
  Balancing: engagement_quality vs sales_velocity

Segment:
  - All segments (global experiment)
  - BUT stratified by: decision_maker_seniority

Primary Metric: 
  - Composite: (close_rate * 0.6) + (engagement_score * 0.4)

Secondary:
  - Average talk time (should be +15% for treatment)
  - Prospect sentiment score

Sample Size: ~1000 per variant (because voice is global change)

Timeline: 14-21 days
```

---

## EXPERIMENT VELOCITY TARGET

### Monthly Cadence

```
Target: 12-16 experiments running simultaneously
With ~5-8 completing per week

Timeline progression:

Week 1-2: 
  - 3-4 Argument experiments (concurrent, different segments)
  - 1 Objection handling (contextual, waiting for data)
  - 1 Offer/pricing (if variant ready)
  
Week 2-3:
  - Results from Week 1 → immediate rollout winners
  - 2-3 new argument experiments (second tier)
  - 1 Next Action experiment (longer tail)
  
Week 3-4:
  - Results from Week 2 → analysis + rollout
  - 1 Voice/tone experiment (if design approved)
  - Iterate on results

Week 4-5:
  - Month 1 complete: ~8-10 experiments ran
  - Month 2 learning velocity: 5x from baseline
```

### Learning Velocity Metric

```
Experiment_Velocity = 
  (experiments_completed / month) * 
  (avg_lift * avg_confidence) / 
  (avg_sample_size_required)

Baseline (no framework): ~0.5 experiments/month
Target (6mo): ~12-16 experiments/month
= 24x learning velocity increase

ROI: If even 50% of experiments have +5% effect:
  - 8 wins * 5% lift * avg_revenue_per_call * daily_volume
  - = Significant revenue uplift without additional marketing spend
```

---

## ROI PROYECTADO

### Conservative Estimate (Realistic)

```
ASSUMPTIONS:
- Daily call volume: 200 calls
- Current close rate: 25%
- Current deal value: $4,500 average
- Current monthly revenue: 200 * 30 * 0.25 * $4,500 = $6.75M

EXPERIMENT ROI (6 months):

Month 1:
  - 4 experiments run
  - 2 winners: +3% close_rate, +2% deal_value
  - Revenue lift: $6.75M * (0.05 avg lift) = +$337.5K/month
  - Cost: Infrastructure ($5K) + Engineering ($30K) = $35K
  - ROI: 10:1

Month 2-3:
  - 8 experiments/month running
  - 4-5 winners average (lower bar as learning intensifies)
  - Accumulated lift: +8% close_rate
  - Revenue: $6.75M * 0.08 = +$540K/month
  - Cost: $40K/month
  - ROI: 13.5:1

Month 4-6:
  - 12-16 experiments/month
  - Saturation point: +12-15% close_rate (diminishing returns)
  - Revenue: $6.75M * 0.13 = +$877.5K/month
  - Cost: $50K/month (more analytics, more engineering)
  - ROI: 17.5:1

TOTAL 6-MONTH IMPACT:
- Added revenue: $337K + $540K + $708K + $810K + $878K + $878K = $4.15M
- Total cost: $35K * 6 = $210K
- Net gain: $3.94M
- ROI: 18.7x
```

### Aggressive Estimate (If Framework + Deep Execution)

```
If lift compounds better than expected:

Month 1-2: +5% cumulative (conservative wins)
Month 3-4: +10% cumulative (contextual learning kicks in)
Month 5-6: +18% cumulative (MAB converges on best actions)

Revenue impact: $6.75M * 0.18 = +$1.215M/month by month 6
Cumulative 6mo: $1.215M * 6 / 2 = $3.645M (assume ramp)

But realistic: probably 70% of aggressive = +$2.5M net gain
With $250K total cost = 10x ROI
```

### Downside Risk

```
What if experiments show NO lift?

Scenario: No winners, all experiments inconclusive

Risk: -$50K infrastructure cost
But: Framework still valuable for:
  - Identifying WHICH decisions matter
  - Learning what doesn't work
  - Building institutional knowledge
  
Option value: If system is built, better decisions possible
  even if short-term experiments fail
```

---

## ROADMAP 6 MESES

### MONTH 1: Foundation
- **Week 1-2**: 
  - Implement ExperimentEngine core (create, track, assign_variant)
  - Build experiment_registry table schema
  - Setup Redis cache for variant assignment (deterministic hashing)
  
- **Week 3**:
  - Implement statistical analysis (t-test + power calculation)
  - Build weekly analysis automation
  - Create experiment dashboard (Looker/Metabase)
  
- **Week 4**:
  - Launch 4 pilot experiments (2 argument, 1 offer, 1 objection)
  - Manual monitoring (no auto-decisions yet)
  - Document learnings

**Deliverables**: 
- ExperimentEngine class (200 LOC)
- Database schema (experiment_registry, experiment_events, experiment_results)
- Dashboard showing live experiment status
- 4 pilot experiments with weekly reports

### MONTH 2: MAB Foundation + First Winners
- **Week 1**:
  - Implement Thompson Sampling (ArgumentBandit)
  - Implement Epsilon-Greedy (ActionBandit)
  - Integrate MAB into conversation flow
  
- **Week 2**:
  - Analyze Month 1 experiments → declare winners
  - Implement rollout_schedule table
  - Manual rollout of 2 winners (5% → 25% → 100%)
  
- **Week 3**:
  - Launch 8 new experiments (learning from Month 1)
  - Segment-specific experiments (contextual)
  
- **Week 4**:
  - Automation: weekly analysis report auto-generated
  - Dashboard: experiment performance + rollout status
  - Document decision framework

**Deliverables**:
- ArgumentBandit + ActionBandit classes
- Integration with conversation_intelligence.py
- Rollout automation + monitoring
- 8 new experiments running
- Monthly revenue impact report: +$337.5K

### MONTH 3: Contextual MAB + Safety
- **Week 1**:
  - Implement ContextualArgumentBandit (industry x size x score)
  - Implement ContextualActionBandit
  - Design safety guardrails
  
- **Week 2**:
  - Add early-stopping rules (Bayesian):
    - If p < 0.001 and treatment effect is BAD → stop immediately
    - If p < 0.05 and treatment effect is GOOD → fast-track to rollout
  
- **Week 3**:
  - Segment-level experiments launching (10+ running)
  - Analyze Month 2 experiments
  
- **Week 4**:
  - Safety audit: ensure no harmful experiments running
  - Document guardrails + decision framework

**Deliverables**:
- Contextual bandits (4x context levels)
- Safety guardrails + auto-stopping rules
- 10+ experiments running in parallel
- Decision framework documented
- Monthly revenue impact: +$540K

### MONTH 4: Deep Learning + Composition
- **Week 1-2**:
  - Implement composition layer:
    - Best argument + best objection handle + best next_action
    - How do wins compose together?
  
- **Week 2-3**:
  - Design experiment for "composed winners"
  - Launch sophisticated experiments (argument vs objection vs action)
  
- **Week 4**:
  - Analyze Month 3 results
  - Optimize allocation: Which experiment types give best ROI?

**Deliverables**:
- Composition engine
- 12+ experiments running (mix of single + composite)
- Analysis: which experiment types drive most value
- Monthly revenue impact: +$708K

### MONTH 5: Predictive & Adaptive
- **Week 1-2**:
  - Implement adaptive allocation:
    - Allocate more traffic to high-performer experiments
    - Reduce traffic to inconclusive experiments
  
- **Week 2-3**:
  - Predictive experiments:
    - Pre-run simulation: "if we test X, what's expected ROI?"
    - Auto-prioritize highest-expected-ROI experiments
  
- **Week 4**:
  - Quarterly review + planning for next 3 months
  - Analyze saturation: where are diminishing returns?

**Deliverables**:
- Adaptive allocation algorithm
- Predictive experiment prioritization
- ROI model for experiment selection
- Monthly revenue impact: +$810K

### MONTH 6: Scale & Optimization
- **Week 1-2**:
  - Full automation: experiment lifecycle
    - Auto-declare winners
    - Auto-start rollouts
    - Auto-stop underperformers
  
- **Week 2-3**:
  - Cross-region experiments (if multi-region deployment)
  - Cross-product experiments (if other products available)
  
- **Week 4**:
  - Final quarterly review
  - Plan for Year 2 experimentation (expansion to pricing, product)

**Deliverables**:
- Fully automated experiment platform
- Monthly revenue impact: +$878K
- Institutional knowledge: What works in sales AI
- Foundation for next-year experimentation

---

## INFRAESTRUCTURA NECESARIA

### Database Schema

```sql
-- Experiment registry
CREATE TABLE experiment_registry (
  experiment_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  hypothesis TEXT,
  
  control_variant VARCHAR(100),
  treatment_variant VARCHAR(100),
  
  target_segment JSONB,           -- {"industry": "retail", ...}
  allocation JSONB,               -- {"control": 0.5, "treatment": 0.5}
  
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  min_sample_size INT,
  duration_days INT,
  
  primary_metric VARCHAR(100),
  primary_threshold FLOAT,
  secondary_metrics JSONB,
  
  status VARCHAR(20),             -- draft | running | completed | rolled_out
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  INDEX (status, start_date)
);

-- Experiment events (append-only log)
CREATE TABLE experiment_events (
  event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  call_id VARCHAR(100),
  experiment_id VARCHAR(50),
  event_type VARCHAR(50),         -- impression | close | objection | feedback
  value FLOAT,
  metadata JSONB,
  timestamp TIMESTAMP,
  
  UNIQUE (call_id, experiment_id, event_type),
  INDEX (experiment_id, timestamp),
  INDEX (call_id)
);

-- Experiment results
CREATE TABLE experiment_results (
  result_id VARCHAR(50) PRIMARY KEY,
  experiment_id VARCHAR(50),
  
  control_n INT,
  control_metric FLOAT,
  control_ci_lower FLOAT,
  control_ci_upper FLOAT,
  
  treatment_n INT,
  treatment_metric FLOAT,
  treatment_ci_lower FLOAT,
  treatment_ci_upper FLOAT,
  
  lift FLOAT,
  p_value FLOAT,
  power FLOAT,
  cohens_d FLOAT,
  is_significant BOOLEAN,
  
  winner VARCHAR(20),
  confidence_recommendation VARCHAR(20),
  
  analyzed_at TIMESTAMP,
  INDEX (experiment_id)
);

-- Rollout schedule
CREATE TABLE rollout_schedule (
  rollout_id VARCHAR(50) PRIMARY KEY,
  experiment_id VARCHAR(50),
  winner_variant VARCHAR(100),
  
  stage INT,                      -- 1, 2, 3
  target_percentage FLOAT,        -- 0.05, 0.25, 1.0
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  metric_before FLOAT,
  metric_after FLOAT,
  status VARCHAR(20),             -- active | completed | rolled_back
  
  INDEX (experiment_id, stage)
);

-- MAB state (persistent)
CREATE TABLE mab_state (
  mab_id VARCHAR(100) PRIMARY KEY,
  context VARCHAR(100),           -- "retail_small_warm"
  arm VARCHAR(100),               -- argument, action, etc
  
  alpha FLOAT,                    -- successes
  beta FLOAT,                     -- failures
  
  updated_at TIMESTAMP,
  INDEX (context)
);
```

### Backend Integration Points

```python
# In app/conversation_intelligence.py
class ConversationIntelligenceEngine:
    
    async def extract_insights_from_call(self, call_id, transcript, outcome):
        """Plus: Track experiment events"""
        
        # Existing logic...
        moments = await self._extract_moments(transcript)
        
        # NEW: Check if call is part of any running experiments
        experiments = await self.experiment_engine.find_experiments_for_call(
            call_context={
                'industry': ...,
                'company_size': ...,
                'lead_score': ...
            }
        )
        
        # Track events for each experiment
        for exp_id in experiments:
            variant = await self.experiment_engine.get_assigned_variant(
                call_id=call_id,
                experiment_id=exp_id
            )
            
            # Determine events to track
            events = self._extract_experiment_events(moments, outcome)
            for event in events:
                await self.experiment_engine.track_event(
                    call_id=call_id,
                    experiment_id=exp_id,
                    event_type=event['type'],
                    value=event['value'],
                    metadata={'variant': variant}
                )


# In app/deal_engine.py
class DealEngine:
    
    async def get_best_offer(self, prospect_profile):
        """Plus: Use experimentation framework"""
        
        # Check if there's an offer pricing experiment
        pricing_exp = await self.experiment_engine.find_active_pricing_experiment(
            prospect_profile
        )
        
        if pricing_exp:
            variant = await self.experiment_engine.assign_variant(
                call_context=prospect_profile,
                experiment_id=pricing_exp['id']
            )
            return self._apply_variant_to_offer(offer, variant)
        
        # Existing logic...
        return await self._get_default_offer(prospect_profile)


# In app/coaching_engine.py
class CoachingEngine:
    
    async def determine_next_action(self, lead_score, sentiment, probability):
        """Plus: Use MAB for action selection"""
        
        # Determine context
        context = f"{lead_score.level}"
        
        # Select action using ε-greedy MAB
        next_action = await self.action_bandit.select_action(context)
        
        # Execute and track for MAB feedback
        result = await self._execute_action(next_action)
        
        # Feedback for next time
        if result.converted_in_30_days:
            await self.action_bandit.feedback(next_action, success=True)
        else:
            await self.action_bandit.feedback(next_action, success=False)
        
        return next_action
```

### Monitoring & Observability

```python
# Metrics to export (Prometheus/CloudWatch)

# Experiment health
- experiments_running (gauge)
- experiments_completed_7d (counter)
- experiments_won_7d (counter)
- experiments_lost_7d (counter)
- experiments_inconclusive_7d (counter)

# Statistical rigor
- avg_sample_size_at_completion (histogram)
- avg_power_at_completion (histogram)
- avg_p_value_at_completion (histogram)

# Business impact
- revenue_lift_from_experiments (gauge, $/month)
- close_rate_baseline_vs_treatment (gauge)
- deal_value_baseline_vs_treatment (gauge)

# MAB performance
- mab_exploration_rate (gauge)  # ε value
- mab_convergence_time_days (histogram)
- mab_arms_count_by_context (gauge)

# Rollout health
- rollout_stage_duration_days (histogram)
- rollout_metric_stability (gauge)  # Variance from baseline
```

---

## SAFETY & GUARDRAILS

### Experiment Validation

```python
class ExperimentValidator:
    """Prevenir bad experiments from running"""
    
    async def validate_experiment(self, config: ExperimentConfig) -> bool:
        """Run before creating experiment"""
        
        errors = []
        
        # 1. Hypothesis must be falsable
        if not self._is_falsable(config.hypothesis):
            errors.append("Hypothesis is not falsable (e.g., too vague)")
        
        # 2. Sample size must be sufficient
        min_needed = calculate_sample_size_needed(
            config.primary_threshold
        )
        if config.min_sample_size < min_needed:
            errors.append(f"min_sample_size too small: need {min_needed}, got {config.min_sample_size}")
        
        # 3. Duration must be sufficient (account for day-of-week effects)
        if config.duration_days < 7:
            errors.append("Duration < 7 days risks DOW bias")
        
        # 4. Treatment must be materially different from control
        if similarity(config.control_variant, config.treatment_variant) > 0.8:
            errors.append("Treatment and control are too similar")
        
        # 5. No prohibited experiments
        if self._is_prohibited(config):
            errors.append("This experiment type is prohibited")
        
        if errors:
            logger.error(f"Experiment validation failed: {errors}")
            return False
        
        return True
    
    def _is_prohibited(self, config):
        """Prohibited changes"""
        prohibited = [
            # Never test: core identity
            ("voice_type", "TTS"),  # Must always use human-sounding
            ("country_targeting", "blocked_regions"),
            ("compliance_check", "disabled"),
        ]
        
        return any(
            f in str(config.metadata).lower() 
            for f, _ in prohibited
        )
```

### Runtime Guardrails

```python
class ExperimentGuardrails:
    """Monitor experiments while running"""
    
    async def check_experiment_health(self, experiment_id: str):
        """Called hourly"""
        
        exp = await self.db.get_experiment(experiment_id)
        
        # Check 1: Early stopping if treatment is BAD
        if exp.status == "running":
            result = await self.analyze_experiment(experiment_id)
            
            if result.p_value < 0.001 and result.winner == "control":
                # Treatment significantly worse
                logger.critical(
                    f"EARLY STOP {experiment_id}: "
                    f"Treatment {result.lift:.1%} worse than control (p={result.p_value})"
                )
                
                await self.stop_experiment(experiment_id)
                await self.rollback_treatment_traffic()
                await self.notify_slack(
                    f"🚨 Experiment {experiment_id} stopped: treatment was harmful"
                )
        
        # Check 2: Sample size accumulation
        # Ensure we're collecting data at expected rate
        expected_samples = exp.min_sample_size / exp.duration_days * exp.days_running
        actual_samples = await self.count_experiment_samples(experiment_id)
        
        if actual_samples < expected_samples * 0.7:
            logger.warning(
                f"Experiment {experiment_id} under-collecting samples: "
                f"expected {expected_samples}, got {actual_samples}"
            )
        
        # Check 3: Segment health
        # Ensure experiment is running in target segment
        for segment in exp.target_segment:
            actual_pct = await self.pct_of_calls_in_segment(
                experiment_id, segment
            )
            expected_pct = exp.allocation.get(segment.context, 0.5)
            
            if abs(actual_pct - expected_pct) > 0.1:
                logger.warning(
                    f"Segment {segment} mismatch: "
                    f"expected {expected_pct:.0%}, got {actual_pct:.0%}"
                )
    
    async def check_mab_staleness(self):
        """Ensure MAB states are updating"""
        
        for mab_id, mab in self.mab_states.items():
            age_days = (datetime.now() - mab.updated_at).days
            
            # If MAB not updated in 7 days, reset priors
            # (maybe arm became irrelevant)
            if age_days > 7:
                logger.warning(f"MAB {mab_id} stale, resetting priors")
                await self.reset_mab_priors(mab_id)
```

### Rollout Safety

```python
class RolloutGuardrails:
    """Prevent bad rollouts"""
    
    async def validate_rollout_stage(self, rollout_id: str, stage: int):
        """Before advancing stage"""
        
        rollout = await self.db.get_rollout(rollout_id)
        
        # Require metric stability before advancing
        current_metric = await self.get_current_stage_metric(rollout)
        previous_metric = rollout.metric_before
        
        # Metric regression > 2%: STOP
        regression = (previous_metric - current_metric) / previous_metric
        if regression > 0.02:
            logger.error(
                f"Rollout stage {stage} failed: "
                f"metric regression {regression:.1%}"
            )
            return False
        
        # Variance check: if variance too high, collect more data
        variance = await self.calculate_metric_variance(rollout, days=7)
        if variance > 0.05:
            logger.warning(f"High variance {variance:.1%}, extending stage")
            return False  # Don't advance
        
        return True  # OK to advance
```

---

## OPERACIÓN DIARIA

### Morning (06:00 UTC)

```bash
# Data freeze + analysis
python scripts/analyze_experiments.py

# Auto-declare winners where appropriate
python scripts/declare_winners.py

# Auto-start rollouts where ready
python scripts/start_rollouts.py

# Generate weekly report
python scripts/generate_experiment_report.py

# Slack notification to leadership
curl -X POST $SLACK_WEBHOOK -d @experiment_report.json
```

### Throughout week

```
Monitor experiment health (via Datadog/CloudWatch)
- Sample collection rate
- Segment distribution
- Early stopping triggers

Daily dashboards:
- https://dashboards.groomly.io/experiments
  Shows: Running experiments, metric trends, rollout progress
```

### End of month

```
Aggregate 4 weeks of learning:
- Total revenue impact from experiments
- Which experiment types had best ROI
- Learnings for next month's prioritization

Planning session:
- What experiments to run next month
- Hypothesis validation
- Resource allocation (engineering, analysis)
```

---

## CONCLUSIÓN

This Experimentation Framework transforms Groomly from **reactive** (analyzing past calls) to **proactive** (scientifically testing and optimizing everything).

### Key Transformations

| Before | After |
|--------|-------|
| "Our close rate is 25%, hope it improves" | "We run 15 experiments/month, +12% lift already, 18% target Q2" |
| "Best practices say use ROI argument" | "Thompson Sampling shows ROI works 65%, automation 52%, contextualize by segment" |
| "Manual A/B testing when time allows" | "Automated weekly analysis, rollout, and winner selection" |
| "No formal experiment registry" | "Experiment Registry as source of truth for sales effectiveness" |
| "Revenue per call: $1,125" | "Revenue per call: $1,265 (+12%), achieved through systematic experimentation" |

### Success Criteria (6 months)

✅ Experimentation framework operational  
✅ 12-16 experiments/month velocity  
✅ +12% close rate lift (proven statistically)  
✅ +$4.15M additional revenue (conservative)  
✅ MAB system learning and improving autonomously  
✅ Safety guardrails preventing bad experiments  
✅ Rollout automation reducing time-to-impact from weeks to days  

**Ready to execute?**
