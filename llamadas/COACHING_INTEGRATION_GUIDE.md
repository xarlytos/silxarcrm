# Guía de Integración: Coaching Engine con Codebase Existente

**Fecha:** 21-06-2026  
**Versión:** 1.0  
**Status:** Listo para implementar

---

## 0. VISIÓN GENERAL

El Coaching Engine se integra entre `HybridSession._on_stt_turn_finalized()` y `nurture_engine.process_post_call()`.

```
┌─────────────────┐
│  LLAMADA VIVA   │
└────────┬────────┘
         │ (turno finaliza)
         ↓
┌──────────────────────────────┐
│   HybridSession (HOY)        │
│  _on_stt_turn_finalized()    │ ← Ya existe, actualizar
└──────────────────────────────┘
         │
         ↓ (NUEVO)
┌──────────────────────────────┐
│   CoachingOrchestrator.      │ ← AGREGAR
│   process_post_call()        │ ← Nueva integración
└──────────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  nurture_engine              │
│  (existing post-call logic)  │
└──────────────────────────────┘
```

---

## 1. INSTALACIÓN DE ARCHIVOS

### Paso 1a: Copiar módulo principal

```bash
# En tu repo llamadas/:
cp COACHING_ENGINE_IMPLEMENTACION.py app/post_call/coaching_engine.py
```

### Paso 1b: Actualizar imports en `app/post_call/__init__.py`

```python
# Antes:
from app.post_call.scheduler import process_pending_activations
from app.post_call.nurture_engine import process_post_call

# Después (AGREGAR):
from app.post_call.coaching_engine import (
    CoachingOrchestrator,
    analyze_post_call,
    CoachingAnalysis,
)
```

### Paso 1c: Crear tabla en DB

```sql
-- Nueva tabla para guardar análisis post-call
CREATE TABLE coaching_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL UNIQUE REFERENCES call_history(call_id),
    lead_id UUID NOT NULL REFERENCES leads(lead_id),
    
    -- Scores
    engagement_score INT,
    interest_score INT,
    objection_handling_score INT,
    lead_score INT,
    lead_temperature VARCHAR(50),
    
    -- Sentiment
    sentiment VARCHAR(50),
    frustration_level INT,
    
    -- Probability
    probability_to_close FLOAT,
    
    -- Signals
    pain_points TEXT[],
    objections TEXT[],
    interest_keywords TEXT[],
    
    -- Decision
    recommended_action VARCHAR(50),
    action_reason TEXT,
    
    -- Metadata
    metadata JSONB,
    
    CREATED_AT TIMESTAMP DEFAULT NOW(),
    UPDATED_AT TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_call FOREIGN KEY(call_id) REFERENCES call_history(call_id)
);

CREATE INDEX idx_coaching_lead ON coaching_analyses(lead_id, created_at DESC);
CREATE INDEX idx_coaching_action ON coaching_analyses(recommended_action);
CREATE INDEX idx_coaching_ptc ON coaching_analyses(probability_to_close);
```

---

## 2. INTEGRACIÓN CON HybridSession

### Dónde se dispara

En `app/elevenlabs/hybrid_session.py`, línea ~243:

```python
async def _on_stt_turn_finalized(self, text: str) -> None:
    """Turno completo del usuario finalizado."""
    
    # ... código existente ...
    
    # NUEVO (AGREGAR AL FINAL, antes de close):
    
    # Si es la última llamada (call_context.call_ended):
    if self.ctx.call_ended:
        await self._run_post_call_coaching()
```

### Código a agregar en HybridSession

```python
# En app/elevenlabs/hybrid_session.py, agregar método:

async def _run_post_call_coaching(self) -> None:
    """Ejecuta coaching engine post-call.
    
    Se dispara cuando la llamada ha finalizado.
    """
    try:
        from app.post_call.coaching_engine import analyze_post_call
        from app.crm import postgres_repo
        
        logger.info("🎯 Iniciando post-call coaching...")
        
        # Analizar llamada
        analysis = await analyze_post_call(self.ctx)
        
        # Guardar análisis en DB
        await postgres_repo.create_coaching_analysis(
            call_id=self.ctx.call_sid,
            lead_id=self.ctx.lead_id,
            engagement_score=analysis.engagement_score,
            interest_score=analysis.interest_score,
            objection_handling_score=analysis.objection_handling_score,
            lead_score=analysis.lead_score,
            lead_temperature=analysis.lead_temperature.value,
            sentiment=analysis.sentiment.name,
            frustration_level=analysis.frustration_level,
            probability_to_close=analysis.probability_to_close,
            pain_points=analysis.pain_points,
            objections=analysis.objections,
            interest_keywords=analysis.interest_keywords,
            recommended_action=analysis.recommended_action.value,
            action_reason=analysis.action_reason,
            metadata=analysis.metadata,
        )
        
        logger.info(
            f"✅ Coaching completado: LS={analysis.lead_score} "
            f"action={analysis.recommended_action.value}"
        )
        
        # NOTA: Las acciones ya se programaron automáticamente
        # en analyze_post_call() → CoachingOrchestrator._schedule_action()
        
    except Exception as exc:
        logger.exception(f"Error en post-call coaching: {exc}")


# En __init__, agregar:
self._coaching_analysis = None
```

---

## 3. INTEGRACIÓN CON NURTURE ENGINE

### Cambio: De BANT a Coaching

**HOY:** `process_post_call()` calcula BANT + acciones manualmente

**NUEVO:** `process_post_call()` usa Coaching Analysis para enriquecer

```python
# En app/post_call/nurture_engine.py:

async def process_post_call(
    ctx: "CallContext",
    stream_sid: str | None = None,
    fecha_demo: str | None = None,
    coaching_analysis: "CoachingAnalysis" | None = None,  # NUEVO param
) -> PostCallResult:
    """Procesa post-call enriquecido con Coaching Engine."""
    
    logger.info(f"Procesando post-call para call_sid={ctx.call_sid}")
    
    # Si no tenemos coaching analysis, generarla
    if coaching_analysis is None:
        from app.post_call.coaching_engine import analyze_post_call
        coaching_analysis = await analyze_post_call(ctx)
    
    # ✅ USAR coaching analysis en lugar de cálculos manuales
    emotion = coaching_analysis.sentiment.name.lower()
    engagement_score = coaching_analysis.engagement_score
    bant = {
        "budget": 20 if coaching_analysis.lead_temperature.value in ("hot", "ultra_hot") else 10,
        "authority": 20,  # TODO: extraer de coaching
        "need": coaching_analysis.interest_score // 5,  # Normalizar
        "timeline": 15 if coaching_analysis.probability_to_close > 0.50 else 5,
    }
    
    # ... resto del código ...
    
    # USAR action de coaching como guía
    if coaching_analysis.recommended_action.value == "triple_lock":
        # Prioridad: TRIPLE_LOCK fue el coaching recomendado
        # (Ya programado, pero enriquecer con BANT context)
        pass
    
    # ...
```

---

## 4. NUEVA TABLA EN POSTGRES_REPO

### Agregar método en `app/crm/postgres_repo.py`

```python
async def create_coaching_analysis(
    call_id: str,
    lead_id: str,
    engagement_score: int,
    interest_score: int,
    objection_handling_score: int,
    lead_score: int,
    lead_temperature: str,
    sentiment: str,
    frustration_level: int,
    probability_to_close: float,
    pain_points: list[str],
    objections: list[str],
    interest_keywords: list[str],
    recommended_action: str,
    action_reason: str,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Crea un análisis de coaching post-call.
    
    Returns: id del análisis creado
    """
    from datetime import datetime
    import uuid
    
    analysis_id = str(uuid.uuid4())
    
    query = """
    INSERT INTO coaching_analyses (
        id, call_id, lead_id,
        engagement_score, interest_score, objection_handling_score, lead_score,
        lead_temperature, sentiment, frustration_level,
        probability_to_close,
        pain_points, objections, interest_keywords,
        recommended_action, action_reason,
        metadata,
        created_at
    ) VALUES (
        %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s,
        %s, %s, %s,
        %s, %s,
        %s,
        %s
    )
    """
    
    params = (
        analysis_id, call_id, lead_id,
        engagement_score, interest_score, objection_handling_score, lead_score,
        lead_temperature, sentiment, frustration_level,
        probability_to_close,
        pain_points, objections, interest_keywords,
        recommended_action, action_reason,
        metadata or {},
        datetime.now(),
    )
    
    await self.pool.execute(query, params)
    return analysis_id


async def get_coaching_analysis(call_id: str) -> dict[str, Any] | None:
    """Obtiene análisis de coaching para una llamada."""
    query = """
    SELECT * FROM coaching_analyses WHERE call_id = %s
    """
    
    row = await self.pool.fetchrow(query, call_id)
    return dict(row) if row else None
```

---

## 5. EJEMPLO: USO COMPLETO

```python
# En tu test o main.py

async def example_integration():
    """Ejemplo completo de integración."""
    from app.elevenlabs.hybrid_session import HybridSession
    from app.post_call.coaching_engine import analyze_post_call
    from app.conversation.state import CallContext
    
    # Simulación: llamada finaliza
    call_context = CallContext(
        call_sid="call_20260621_001",
        lead_id="lead_abc123",
        phone="+5552021234567",
        email="carlos@consultoriosonrisa.com",
        transcript=[
            # ... transcript real ...
        ],
        outcome="demo_agendada",
        demo_scheduled_for="2026-06-25T15:00:00Z",
        duration_seconds=442,
    )
    
    # STEP 1: Coaching analysis
    analysis = await analyze_post_call(call_context)
    
    print(f"Lead Score: {analysis.lead_score}")
    print(f"Action: {analysis.recommended_action.value}")
    print(f"P(Close): {analysis.probability_to_close:.1%}")
    
    # STEP 2: Guardar en DB (automático en _run_post_call_coaching)
    # (Ya hecho)
    
    # STEP 3: Acciones ya programadas
    # (Ya hecho en CoachingOrchestrator._schedule_action)
    
    # STEP 4: Verificar activations
    from app.crm import postgres_repo
    logs = await postgres_repo.get_activation_logs(lead_id=call_context.lead_id)
    
    print(f"\nAcciones programadas:")
    for log in logs:
        print(f"  - {log['action']} en {log['scheduled_at']}")
    
    # Expected output:
    # Lead Score: 76
    # Action: triple_lock
    # P(Close): 95.0%
    #
    # Acciones programadas:
    #   - triple_lock_3d en 2026-06-22 15:00:00
    #   - triple_lock_1d en 2026-06-24 15:00:00
    #   - triple_lock_1h en 2026-06-25 14:00:00
```

---

## 6. CONFIGURACIÓN

### Pesos por Software (Opcional)

```python
# En app/modules/config_*.py, agregar:

COACHING_CONFIG = {
    "smartdental": {
        "engagement_weight": 0.40,
        "interest_weight": 0.35,
        "objection_weight": 0.25,
        "pain_keywords": ["citas", "cancelan", "olvidan"],
        "interest_keywords": ["demencia", "demo", "cuánto"],
    },
    "groomly": {
        "engagement_weight": 0.40,
        "interest_weight": 0.40,  # Más peso a interés para salones
        "objection_weight": 0.20,
        "pain_keywords": ["cancelan", "no-show", "reservas"],
    },
    "peluguau": {
        "engagement_weight": 0.35,
        "interest_weight": 0.40,
        "objection_weight": 0.25,
        "pain_keywords": ["clientes", "cancelan", "recordatorios"],
    },
}
```

---

## 7. TESTING

### Test 1: Ejecutar Suite Completa

```bash
cd llamadas
pytest COACHING_ENGINE_TESTS.py -v

# Debe pasar:
# test_engagement_score_basic ✅
# test_interest_signals_detection ✅
# test_full_scenario (Dr. Carlos López) ✅
```

### Test 2: Validar Integración con DB

```python
async def test_coaching_integration():
    """Test e2e de coaching con DB."""
    from app.elevenlabs.hybrid_session import HybridSession
    from app.crm import postgres_repo
    
    # Setup
    call_ctx = CallContext(...)
    
    # Ejecutar
    await hybrid_session._run_post_call_coaching()
    
    # Verificar
    analysis = await postgres_repo.get_coaching_analysis(call_ctx.call_sid)
    assert analysis is not None
    assert analysis["lead_score"] > 0
    assert analysis["recommended_action"] in ["triple_lock", "call_24h", ...]
```

### Test 3: Performance

```bash
# Timing esperado:
# - analyze_post_call(): < 500ms
# - save to DB: < 100ms
# - schedule actions: < 200ms
# TOTAL: ~800ms (aceptable, async)
```

---

## 8. MONITOREO & ALERTAS

### Dashboard Prometheus

```yaml
# prometheus.yml, agregar:

- job_name: 'coaching_engine'
  static_configs:
    - targets: ['localhost:9090']
  metrics_path: '/metrics/coaching'
```

### Métricas a exponer

```python
# En app/observability/metrics.py:

from prometheus_client import Counter, Histogram, Gauge

# Counters
coaching_calls_analyzed = Counter(
    'coaching_calls_analyzed_total',
    'Total calls analyzed by coaching engine',
    ['lead_temperature']
)

coaching_actions_scheduled = Counter(
    'coaching_actions_scheduled_total',
    'Actions scheduled',
    ['action_type']
)

# Histograms
coaching_latency = Histogram(
    'coaching_latency_ms',
    'Coaching engine latency',
    buckets=[100, 250, 500, 1000]
)

# Gauges
coaching_ptc_distribution = Gauge(
    'coaching_ptc_distribution',
    'P(Close) distribution percentile',
    ['percentile']
)
```

### Alertas (AlertManager)

```yaml
groups:
  - name: coaching
    rules:
      - alert: CoachingLatencyHigh
        expr: coaching_latency_ms > 2000
        annotations:
          summary: "Coaching engine latency > 2s"
      
      - alert: LowTripleLockRate
        expr: rate(coaching_actions_scheduled_total{action_type="triple_lock"}[1h]) < 0.05
        annotations:
          summary: "< 5% de acciones son TRIPLE_LOCK (expected ~20%)"
```

---

## 9. ROLLOUT PLAN

### Phase 1: Shadow Mode (1 semana)

```python
# En HybridSession:
if settings.coaching_shadow_mode:
    await analyze_post_call(self.ctx)  # Ejecutar pero NO usar
    # Guardar en tabla separada para validación
    # NO programar acciones aún
```

### Phase 2: Limited Rollout (1 semana)

```python
# 20% de calls con Coaching
if random.random() < 0.20:
    await analyze_post_call(self.ctx)
    # Programar acciones, monitorear métricas
```

### Phase 3: Full Rollout (1 semana)

```python
# 100% de calls
await analyze_post_call(self.ctx)
```

---

## 10. TROUBLESHOOTING

### Problema: "Lead Score siempre 0"

**Causa:** Transcript vacío o formato incorrecto

**Solución:**
```python
# Validar transcript en analyze_post_call:
if not call_context.transcript or len(call_context.transcript) == 0:
    logger.warning(f"Empty transcript for call {call_context.call_id}")
    return CoachingAnalysis(lead_score=0, ...)
```

### Problema: "Acciones no se programan"

**Causa:** DB connection error o `activation_logs` table no existe

**Solución:**
```bash
# Verificar tabla
psql -c "SELECT * FROM activation_logs LIMIT 1;"

# Si no existe:
psql -f migrations/create_activation_logs.sql
```

### Problema: "P(Close) siempre 0.5"

**Causa:** LLM failure, base rates no calibrados

**Solución:**
```python
# En ScoreCalculator:
PRIOR_CLOSE_RATE = 0.12  # Ajustar con histórico real

# Histórico real: 
SELECT COUNT(*) FILTER (WHERE closed_deal) / COUNT(*) 
FROM call_history;
```

---

## 11. NEXT STEPS DESPUÉS DE INTEGRACIÓN

1. **Calibración (Semana 2):** Ajustar pesos con histórico real
2. **A/B Testing (Semana 3):** TRIPLE_LOCK vs Sin coaching
3. **Monitoring (Ongoing):** Dashboard + alertas
4. **Feedback Loop (Mes 2):** Re-entrenar con closes reales

---

**Status: Listo para integrar ✅**

Cualquier pregunta: ver `COACHING-AUTOMATICO-POST-CALL-EXHAUSTIVO.md` para teoría detallada.
