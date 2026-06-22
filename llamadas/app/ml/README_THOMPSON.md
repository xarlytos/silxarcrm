# Thompson Sampling para A/B Testing - Implementación Completa

## 📦 Archivos Implementados

```
llamadas/app/ml/
├── thompson_sampler.py                 # Core: Thompson Sampling + Beta distributions
├── thompson_sampler_integration.py     # Integración con experimentation framework
├── test_thompson_sampling.py           # Suite de tests
├── THOMPSON_SAMPLING_GUIDE.md         # Documentación técnica completa
└── README_THOMPSON.md                  # Este archivo
```

## 🚀 Quick Start

### Instalación (sin dependencias externas)
```python
from app.ml import ThompsonSamplerIntegration

# Solo necesita numpy (ya incluido en el proyecto)
integration = ThompsonSamplerIntegration(
    num_arguments=8,
    persistence_path="/data/thompson_state.json"
)
```

### 3 líneas de código para empezar
```python
# 1. Seleccionar argumento
arg_id, arg_name = integration.select_argument("call_001")

# 2. Usar en la llamada
response = call_script(arg_name)

# 3. Registrar resultado
integration.record_outcome("call_001", arg_id, success=True)
```

### Obtener reporte semanal
```python
report = integration.get_weekly_report()

# Automáticamente incluye:
# - Top performers
# - Ranking completo
# - Action items accionables
# - Métricas de confianza Bayesiana
```

## 🎯 Qué resuelve

**Problema**: Tenés 8 opening arguments pero no sabés cuál es mejor.

**Solución clásica (A/B Testing)**: Divide tráfico 50/50, espera semanas → pierde $$

**Nuestra solución (Thompson Sampling)**: 
- Aprende mientras experimentas → optimización continua
- Explora al principio, explota después → balance automático
- Registra todo en JSON → reproducible y persistente

## 📊 Componentes Principales

### 1. `BetaDistribution`
```python
class BetaDistribution:
    alpha: float  # Successes observados + 1
    beta: float   # Failures observados + 1
    
    def sample() -> float
    def update(success: bool)
    def mean() -> float
    def variance() -> float
```

**Por qué Beta?**
- Modelo natural para tasas de conversión (entre 0 y 1)
- Conjugada a Bernoulli → actualización Bayesiana simple
- Varianza decrece con datos → confianza automática

### 2. `ArgumentMetrics`
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

### 3. `ThompsonSampler` (Core)
```python
def sample_posterior() -> int
    """Thompson Sampling: muestrea posteriors, retorna argmax"""

def update_with_outcome(argument_id: int, conversion: bool)
    """Bayesian update: incrementar alpha o beta"""

def get_best_argument(method="thompson") -> (id, name, score)
    """Recomendación actual"""

def get_weekly_report() -> Dict
    """Reporte semanal completo"""
```

### 4. `ThompsonSamplerIntegration`
Wrapper que integra con experimentation framework:
```python
def select_argument(call_id, call_context) -> (arg_id, arg_name)
def record_outcome(call_id, argument_id, conversion)
def get_weekly_report() -> Dict
def get_current_recommendation() -> Dict
def save_state() / load_state()
```

## 🔢 Los 8 Opening Arguments

```python
DEFAULT_ARGUMENTS = [
    0. "Pregunta de descubrimiento: ¿Cuál es tu mayor desafío actual?"
    1. "Pregunta de descubrimiento: ¿Cómo está manejando tu equipo esto hoy?"
    2. "Pregunta de descubrimiento: ¿Cuál sería el impacto ideal para tu negocio?"
    3. "Pregunta de descubrimiento: ¿Quién más está involucrado en esta decisión?"
    4. "Pregunta de descubrimiento: ¿Cuál es tu timeline para resolver esto?"
    5. "Pregunta de descubrimiento: ¿Ya has explorado soluciones alternativas?"
    6. "Pregunta de descubrimiento: ¿Cómo medirías el éxito?"
    7. "Pregunta de descubrimiento: ¿Hay restricciones presupuestarias que deba conocer?"
]
```

Personalizables en inicialización:
```python
custom_args = ["Argumento 1", "Argumento 2", ...]
sampler = ThompsonSampler(argument_names=custom_args)
```

## 📈 Flujo Completo

```
1. INICIALIZACIÓN
   ├─ Crear ThompsonSamplerIntegration
   ├─ Cargar estado anterior si existe
   └─ Verificar 8 argumentos disponibles

2. DURANTE LLAMADAS
   ├─ Thompson Sampling selecciona argumento
   ├─ Sales agent usa argumento en la llamada
   ├─ Call recording grabado y analizado
   └─ Outcome determinado (conversión sí/no)

3. REGISTRO DE OUTCOME
   ├─ Actualizar Beta distribution
   ├─ Incrementar counters (trials, successes, failures)
   ├─ Registrar CallRecord con metadata
   └─ Guardar estado a disco (JSON)

4. REPORTE SEMANAL
   ├─ Generar ranking por posterior mean
   ├─ Identificar top/bottom performers
   ├─ Generar action items accionables
   ├─ Calcular métricas de confianza Bayesiana
   └─ Retornar reporte accionable
```

## 💾 Persistencia

Todo se guarda en JSON para reproducibilidad:

```json
{
  "timestamp": "2026-06-22T...",
  "num_arguments": 8,
  "arguments": [
    {
      "id": 0,
      "name": "Pregunta...",
      "distribution": {
        "alpha": 21,  // 20 successes + prior 1
        "beta": 9     // 8 failures + prior 1
      },
      "total_trials": 29,
      "successes": 20,
      "failures": 9,
      "last_updated": "2026-06-22T..."
    },
    ...
  ]
}
```

## 🧪 Tests Incluidos

Ejecutar suite completa:
```bash
cd llamadas
python -m app.ml.test_thompson_sampling
```

**Tests incluidos:**
1. **Convergencia**: Verifica que Thompson Sampling converge a valores correctos
2. **Thompson vs Random**: Demuestra ventaja sobre selección random
3. **Weekly Report**: Verifica generación de reportes
4. **Persistencia**: Verifica guardar/cargar estado

## 📊 Weekly Report Structure

```python
{
    "timestamp": "2026-06-22T...",
    "week_ending": "2026-06-23",
    "summary": {
        "total_trials": 150,
        "total_conversions": 105,
        "overall_conversion_rate": 0.70,
    },
    "recommendation": {
        "argument_id": 0,
        "argument_name": "Pregunta...",
        "posterior_mean": 0.72,
    },
    "performance_ranking": [
        {
            "id": 0,
            "name": "...",
            "posterior_mean": 0.72,
            "posterior_variance": 0.002,  # ← Confianza Bayesiana
            "empirical_conversion_rate": 0.70,
            "total_trials": 30,
            "successes": 21,
        },
        ...
    ],
    "this_week_analytics": {
        "total_calls": 45,
        "by_argument": {
            "0": {"total": 15, "conversions": 11, ...}
        }
    },
    "action_items": [
        "🎯 PRIORITIZAR argumento 0: ...",
        "✅ 3 argumentos con suficiente confianza",
        "📈 Continúa recolectando datos",
    ],
    "insights": [
        "✅ TOP PERFORMER: 'Pregunta...' con 72% posterior mean",
        "📊 3 argumentos con >20 trials",
        "🎯 Varianza promedio posterior: 0.0023",
    ]
}
```

## 🔧 Integración con Conversation Intelligence

```python
from app.ml import ConversationArgumentSelector

# En tu Conversation Intelligence Engine
selector = ConversationArgumentSelector(thompson_integration)

# Seleccionar opening argument
opening = selector.select_opening_argument(
    call_id="call_001",
    customer_context={"industry": "SaaS", "company_size": "SMB"}
)

# Usar en conversación
response = conv_engine.process_with_opening(opening)

# Registrar outcome
selector.record_call_outcome(
    call_id="call_001",
    argument_id=selected_id,
    call_successful=success
)
```

## 📈 Matemática detrás

**Thompson Sampling**:
1. Para cada argumento i, muestrear: x_i ~ Beta(α_i, β_i)
2. Seleccionar: arg = argmax_i(x_i)
3. Observar outcome y actualizar: α += 1 (success) o β += 1 (failure)

**Propiedad clave**: Automáticamente balancea exploration/exploitation porque:
- Argumentos con mean alto tienen distribución concentrada (exploited)
- Argumentos con mean bajo tienen distribución dispersa (explored)
- A medida que datos aumentan, variance → 0 → más exploitation

## 💡 Consejos de operación

### Warmup (primeras 100 llamadas)
Thompson Sampling explora más al principio. Normal. Dejar que converja.

### Mínimos de confianza
- < 10 trials: muy ruidoso
- 10-20 trials: rough decision
- 20+ trials: confiable
- 50+ trials: muy confiable

### Reporte semanal
- Generar cada lunes/viernes
- Comparar con semana anterior (trends)
- Actuar sobre action_items

### Manual override si necesario
```python
# Si quieres forzar que se explore más
integration.sampler.arguments[5].distribution.beta += 10

# Si quieres reset de un argumento
integration.sampler.arguments[3].distribution = BetaDistribution()
```

## ⚙️ Performance

- **Tiempo selección**: O(1) → instant
- **Tiempo update**: O(1) → instant
- **Tiempo reporte**: O(8) → < 1ms
- **Memoria**: ~500 bytes por argumento → negligible

## 📚 Archivo de Guía Completa

Para documentación técnica profunda, ver `THOMPSON_SAMPLING_GUIDE.md`:
- Matemática detallada
- Patrones comunes
- Troubleshooting
- Próximos pasos (Contextual Bandits, Multi-stage optimization, etc.)

## 🤝 Integración con Experimentation Engine

Thompson Sampling está diseñado para integrarse con el `ExperimentationEngine`:

```python
from app.experimentation_engine import ExperimentEngine
from app.ml import ThompsonSamplerIntegration

exp_engine = ExperimentEngine()
thompson = ThompsonSamplerIntegration()

# Thompson Sampling para argumentos
# Otros bandits para ofertas, acciones, etc.
```

## 📝 Ejemplo Completo: End-to-end

```python
from app.ml import ThompsonSamplerIntegration

# 1. Inicializar
integration = ThompsonSamplerIntegration(
    num_arguments=8,
    persistence_path="/data/thompson.json"
)

# 2. Loop de llamadas (simplificado)
for call in incoming_calls:
    # Seleccionar argumento
    arg_id, arg_name = integration.select_argument(call.call_id)
    
    # Usar en llamada
    result = call_handler(call, opening_argument=arg_name)
    
    # Determinar si fue exitosa
    success = evaluate_call(result)
    
    # Registrar
    integration.record_outcome(
        call_id=call.call_id,
        argument_id=arg_id,
        conversion=success
    )
    
    # Guardar estado (cada N llamadas)
    if call_count % 10 == 0:
        integration.save_state()

# 3. Reporte semanal
report = integration.get_weekly_report()
print(f"Top argument: {report['recommendation']['argument_name']}")
print(f"Expected conversion: {report['recommendation']['posterior_mean']:.1%}")
for action in report['action_items']:
    print(f"  → {action}")
```

## 🐛 Troubleshooting

**Q**: Todos los argumentos convergen al mismo valor
**A**: Normal si tienen tasa de conversión similar. Thompson Sampling seguirá explorando.

**Q**: Un argumento domina demasiado
**A**: Eso es lo correcto. Para más exploración:
```python
integration.sampler.arguments[3].distribution.beta += 5
```

**Q**: Quiero resetear pero conservar algunos datos
**A**: Reset selectivo:
```python
for arg in integration.sampler.arguments:
    if arg.id not in [0, 1, 2]:  # Mantener estos
        arg.distribution = BetaDistribution()
```

## 📞 Próximas Mejoras

1. **Contextual Bandits**: Diferentes argumentos para diferentes segmentos
2. **Multi-stage**: Optimize opening + value prop + close
3. **Bayesian Optimization**: Optimize contenido de los argumentos mismos
4. **Regret Analysis**: Medir oportunidad perdida vs oracle optimo

## 📄 Licencia

Parte del proyecto SilxaCRM - Uso interno.
