# Thompson Sampling para A/B Testing de Argumentos de Venta

## Visión General

Implementación Bayesiana de Thompson Sampling para A/B testing automático de 8 argumentos de venta (discovery questions). El algoritmo balancea automáticamente **exploration vs exploitation**, concentrando más tráfico en los argumentos de mejor performance mientras sigue explorando alternativas.

## ¿Por qué Thompson Sampling?

### vs A/B Testing clásico
- **Clásico**: Divide tráfico 50/50, espera resultados estadísticos → toma tiempo
- **Thompson Sampling**: Ajusta dinámicamente probabilidades mientras colecta datos → optimización continua

### vs Greedy/Epsilon-Greedy
- **Greedy**: Siempre elige el mejor conocido → puede atascarse en subóptimos locales
- **Thompson Sampling**: Usa posterior uncertainty para exploración inteligente → encuentra global optima con confianza Bayesiana

## Componentes

### 1. BetaDistribution
```python
class BetaDistribution:
    alpha: float  # Successes + 1 (prior)
    beta: float   # Failures + 1 (prior)
    
    def sample() -> float
        """Muestra de Beta(alpha, beta)"""
    
    def update(success: bool)
        """Bayesian update: alpha += 1 o beta += 1"""
```

**Propiedades:**
- Prior: Beta(1, 1) → distribución uniforme
- Cuando observamos éxitos: alpha aumenta → distribución desplazada a la derecha
- Cuando observamos fallos: beta aumenta → distribución desplazada a la izquierda
- Varianza decrece con más datos → posterior más confident

### 2. ArgumentMetrics
```python
@dataclass
class ArgumentMetrics:
    id: int
    name: str
    distribution: BetaDistribution
    total_trials: int
    successes: int
    failures: int
```

Mantiene estado para cada uno de los 8 argumentos.

### 3. ThompsonSampler (core)
```python
class ThompsonSampler:
    def sample_posterior() -> int
        """Thompson Sampling: muestra de cada posterior, retorna argmax"""
    
    def update_with_outcome(argument_id: int, conversion: bool)
        """Bayesian update después de observar outcome"""
    
    def get_best_argument(method="thompson") -> (id, name, score)
        """Recomendación: thompson/mean/empirical"""
    
    def get_weekly_report() -> Dict
        """Reporte semanal con ranking, insights, recomendaciones"""
```

### 4. ThompsonSamplerIntegration
Wrapper que integra con experimentation framework:
```python
class ThompsonSamplerIntegration:
    def select_argument(call_id, call_context) -> (arg_id, arg_name)
    def record_outcome(call_id, argument_id, conversion)
    def get_weekly_report() -> Dict
        """Incluye analytics de calls, action items, etc."""
```

## 8 Opening Arguments (Discovery Questions)

```
0. "Pregunta de descubrimiento: ¿Cuál es tu mayor desafío actual?"
1. "Pregunta de descubrimiento: ¿Cómo está manejando tu equipo esto hoy?"
2. "Pregunta de descubrimiento: ¿Cuál sería el impacto ideal para tu negocio?"
3. "Pregunta de descubrimiento: ¿Quién más está involucrado en esta decisión?"
4. "Pregunta de descubrimiento: ¿Cuál es tu timeline para resolver esto?"
5. "Pregunta de descubrimiento: ¿Ya has explorado soluciones alternativas?"
6. "Pregunta de descubrimiento: ¿Cómo medirías el éxito?"
7. "Pregunta de descubrimiento: ¿Hay restricciones presupuestarias que deba conocer?"
```

## Flujo de Uso

### 1. Inicialización
```python
from app.ml import ThompsonSampler, ThompsonSamplerIntegration

# Opción A: Thompson Sampler puro
sampler = ThompsonSampler(
    num_arguments=8,
    persistence_path="/tmp/thompson_state.json"
)

# Opción B: Con integración (recomendado)
integration = ThompsonSamplerIntegration(
    num_arguments=8,
    persistence_path="/tmp/thompson_state.json"
)
```

### 2. Seleccionar argumento para una llamada
```python
call_id = "call_2026_06_22_001"
arg_id, arg_name = integration.select_argument(
    call_id=call_id,
    call_context={
        "customer_profile": "SMB",
        "industry": "SaaS",
        "deal_stage": "discovery"
    }
)

# Usar arg_name en el script de llamada
script = f"Hola, {arg_name}"
```

### 3. Registrar outcome
```python
# Después de la llamada, determinar si fue exitosa
call_successful = determine_call_success(call_recording)

integration.record_outcome(
    call_id=call_id,
    argument_id=arg_id,
    conversion=call_successful,  # True/False
    context={"call_duration": 180, "notes": "..."}
)
```

### 4. Obtener recomendación actual
```python
recommendation = integration.get_current_recommendation(method="thompson")
# {
#     "argument_id": 0,
#     "argument_name": "Pregunta de descubrimiento: ¿Cuál es tu mayor desafío actual?",
#     "thompson_score": 0.72,
#     "posterior_mean": 0.72,
#     "conversion_rate": 0.70,
#     "trials": 25
# }
```

### 5. Reporte semanal
```python
report = integration.get_weekly_report()

print(f"Total calls this week: {report['summary']['total_trials']}")
print(f"Overall conversion: {report['summary']['overall_conversion_rate']:.1%}")

print("\nTop 3:")
for arg in report['performance_ranking'][:3]:
    print(f"  {arg['name']}: {arg['posterior_mean']:.1%}")

print("\nAction items:")
for action in report['action_items']:
    print(f"  {action}")
```

## Ejemplo Completo: Integración con Conversation Intelligence

```python
from app.ml import ThompsonSamplerIntegration, ConversationArgumentSelector
from app.conversation_intelligence import ConversationIntelligenceEngine

# 1. Inicializar
thompson_integration = ThompsonSamplerIntegration(
    num_arguments=8,
    persistence_path="/data/thompson_state.json"
)
arg_selector = ConversationArgumentSelector(thompson_integration)
conv_engine = ConversationIntelligenceEngine()

# 2. En una llamada entrante
def handle_inbound_call(call):
    call_id = call.call_id
    
    # Seleccionar opening argument
    opening_arg = arg_selector.select_opening_argument(
        call_id=call_id,
        customer_context={
            "company": call.company_name,
            "industry": call.customer_industry,
        }
    )
    
    # Usar en conversation engine
    conv_engine.set_opening_argument(opening_arg)
    
    # Procesar llamada...
    result = conv_engine.process_call(call)
    
    # Registrar outcome
    arg_selector.record_call_outcome(
        call_id=call_id,
        argument_id=current_arg_id,
        call_successful=result.successful
    )
```

## Matemática Detrás

### Beta Distribution
- **Parametrización**: Beta(α, β)
- **Interpretación**: α - 1 successes, β - 1 failures
- **Prior uniforme**: Beta(1, 1)
- **Mean**: E[X] = α / (α + β)
- **Variance**: Var[X] = αβ / ((α+β)² (α+β+1))

### Thompson Sampling
1. Para cada argumento, muestrear de su posterior: x_i ~ Beta(α_i, β_i)
2. Seleccionar argumento con max: arg_max_i(x_i)
3. Observar outcome
4. Actualizar posterior: α += 1 (success) o β += 1 (failure)

**Propiedad**: Automáticamente balancean exploration/exploitation:
- Argumentos con posterior mean alto tienen distribución concentrada → probables de ser seleccionados
- Argumentos con posterior mean bajo tienen distribución dispersa → chance de ser explorados
- A medida que confianza aumenta (lower variance), el algoritmo "exploitation" más

### Ejemplo numérico

```
Inicial: Arg0 ~ Beta(1,1), Arg1 ~ Beta(1,1)

Tras 10 conversiones en Arg0 y 0 en Arg1:
  Arg0 ~ Beta(11, 1)  → E[X] = 0.917 (muy bueno)
  Arg1 ~ Beta(1, 10)  → E[X] = 0.083 (malo)

Thompson Sampling:
  - Muestrear: x0 ~ Beta(11,1) → típicamente 0.8-0.95
  - Muestrear: x1 ~ Beta(1,10) → típicamente 0.0-0.3
  - Seleccionar: arg_max = 0 → 95%+ de las veces
  - Pero 5%- de las veces explora Arg1 (por su varianza alta)
```

## Persistencia

### Guardar estado
```python
integration.save_state(path="/data/thompson_state.json")
# Serializa todas las Beta distributions y call records a JSON
```

### Cargar estado
```python
integration.load_state(path="/data/thompson_state.json")
# Restaura estado anterior → continúa desde donde paró
```

### Reset
```python
integration.reset_all()
# Vuelve todos los argumentos a Beta(1,1) y limpia call records
# Usar solo cuando quieres reiniciar experimentación
```

## Weekly Report Structure

```python
{
    "timestamp": "2026-06-22T...",
    "week_ending": "2026-06-23",
    "summary": {
        "total_trials": 150,
        "total_conversions": 105,
        "overall_conversion_rate": 0.70,
        "num_arguments_tested": 8
    },
    "recommendation": {
        "argument_id": 0,
        "argument_name": "Pregunta...",
        "posterior_mean": 0.72,
        "method": "thompson_sampling"
    },
    "performance_ranking": [
        {
            "id": 0,
            "name": "...",
            "posterior_mean": 0.72,
            "posterior_variance": 0.002,
            "empirical_conversion_rate": 0.70,
            "total_trials": 30,
            "successes": 21,
            "failures": 9
        },
        ...
    ],
    "this_week_analytics": {
        "period": "last_7_days",
        "total_calls": 45,
        "by_argument": {
            "0": {
                "total": 15,
                "conversions": 11,
                "calls": [...]
            },
            ...
        }
    },
    "action_items": [
        "🎯 PRIORITIZAR argumento 0: ...",
        "✅ 3 argumentos con suficiente confianza (>20 trials)",
        ...
    ],
    "insights": [
        "✅ TOP PERFORMER: 'Pregunta...' con 72% posterior mean",
        "📊 3 argumentos con >20 trials",
        ...
    ]
}
```

## Patrones Comunes

### Pattern 1: Seleccionar + Registrar en una transacción
```python
try:
    arg_id, arg_name = integration.select_argument(call_id)
    
    # Usar argumento...
    result = use_argument(arg_name)
    
    success = evaluate_result(result)
    integration.record_outcome(call_id, arg_id, success)
    
except Exception as e:
    logger.error(f"Thompson Sampler error: {e}")
    # Fallback a argumento default
    arg_name = ThompsonSampler.DEFAULT_ARGUMENTS[0]
```

### Pattern 2: Multi-armed bandit con contexto
```python
# Si tienes features de contexto (customer_profile, industry, etc.)
# puedes hacer Thomson Sampling contextual
context = {
    "company_size": "SMB",
    "industry": "SaaS",
    "deal_stage": "discovery"
}

arg_id, arg_name = integration.select_argument(
    call_id=call_id,
    call_context=context  # Para futuros análisis
)
```

### Pattern 3: Dashboard en tiempo real
```python
def get_dashboard_data():
    return {
        "current_best": integration.get_current_recommendation(),
        "all_arguments": integration.get_all_arguments_status(),
        "weekly_report": integration.get_weekly_report(),
    }
```

## Consejos de Operación

### 1. Período de Warmup (primeros 50-100 trials)
- Thompson Sampling tiene mucha exploración inicial
- Asignar 50-100 calls para que converja hacia optima
- Después, concentrará más en los top performers

### 2. Mínimo de trials para decisión
- < 10 trials: muy ruidoso
- 10-20 trials: decisión rough
- 20+ trials: confiable
- 50+ trials: muy confiable

### 3. Reporte semanal
- Generar cada lunes/viernes
- Comparar con semana anterior (trends)
- Actuar sobre action items

### 4. A/B testing manual vs Thompson
- Thompson: mejor para optimization automática
- A/B testing clásico: si necesitas test estadístico riguroso (p-values)
- Idealmente: usar Thompson en prod, validar con A/B tests en paralelo

## Troubleshooting

### "Todos los argumentos convergen al mismo valor"
→ Probablemente tienen tasa de conversión similar. Thompson Sampling seguirá explorando.

### "Un argumento domina demasiado"
→ Normal. Thompson Sampling explota al mejor conocido. Para más exploración:
```python
# Aumentar exploración manualmente
integration.sampler.arguments[3].distribution.beta += 5  # Boost uncertainty
```

### "Quiero reset pero conservar algunos datos"
```python
# Opción A: Reset selectivo
for arg in integration.sampler.arguments:
    if arg.id in [3, 4, 5]:  # Mantener estos
        continue
    arg.distribution = BetaDistribution()
```

## Performance

- **Tiempo selectión**: O(1) → instant
- **Tiempo update**: O(1) → instant
- **Tiempo reporte**: O(8) → < 1ms
- **Memoria**: ~500 bytes por argumento → negligible

## Próximos Pasos

1. **Contextual Bandits**: Diferentes argumentos para diferentes segmentos
2. **Thompson Sampling Multi-Stage**: Optimize multiple stages (opening → value prop → close)
3. **Bayesian Optimization**: Optimize el contenido de los argumentos mismos (A/B test variaciones)
4. **Regret Analysis**: Medir cuánto "dejamos en la mesa" vs oracle optimo

## Referencias

- Thompson, W. R. (1933). "On the Likelihood that One Unknown Probability Exceeds Another"
- Chapelle, O., & Li, L. (2011). "An Empirical Evaluation of Thompson Sampling"
- Lattimore, T., & Szepesvári, C. (2020). "Bandit Algorithms"
