# GLOBAL LEARNING LOOP: Quick Start (Primeros 7 Días)

**Objetivo:** Pasar de 0 a producción en 1 semana (MVP funcional).

---

## DÍA 1: Setup BigQuery + Schema

### 1. Crear dataset en BigQuery

```bash
# En Cloud Console o via bq CLI
bq mk --dataset \
  --location=US \
  --description="Global Learning Loop data" \
  gll
```

### 2. Crear tabla `calls`

```sql
-- En BigQuery Console, correr:
CREATE TABLE gll.calls (
  call_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  duration_seconds FLOAT64,
  outcome STRING,
  lead_score INT64,
  
  -- Prospect info
  prospect STRUCT<
    industry STRING,
    company_size STRING,
    region STRING,
    decision_maker BOOL,
    previous_software BOOL
  >,
  
  -- Arguments
  arguments_used ARRAY<STRUCT<
    argument_id STRING,
    content STRING,
    category STRING,
    efficacy STRING
  >>,
  
  -- Objeciones
  objections_encountered ARRAY<STRUCT<
    objection STRING,
    handling_strategy STRING,
    resolved BOOL
  >>,
  
  -- Ofertas
  offers_presented ARRAY<STRUCT<
    offer_id STRING,
    amount_eur FLOAT64,
    frequency STRING,
    accepted BOOL
  >>,
  
  -- Metadata
  turns INT64,
  stages_visited ARRAY<STRING>,
  compliance STRUCT<
    disclosure_mentioned BOOL,
    recording_consent BOOL
  >,
  agent_type STRING,
  version STRING,
  
  -- Sistema
  inserted_timestamp TIMESTAMP NOT NULL OPTIONS(description="Hora de inserción")
)
PARTITION BY DATE(timestamp)
CLUSTER BY outcome, prospect.industry;

-- Crear tabla de despliegues
CREATE TABLE gll.deployments (
  deployment_id STRING NOT NULL,
  version INT64,
  industry STRING,
  stage STRING,
  percentage FLOAT64,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  status STRING,
  metrics STRUCT<
    win_rate FLOAT64,
    latency_p95_ms INT64,
    roll_back_reason STRING
  >
);
```

### 3. Agregar variables de ambiente

En tu `.env` o `config.py`:

```python
# GLL Configuration
GLL_ENABLED = True
GCP_PROJECT = "tu-proyecto-gcp"
BQ_DATASET = "gll"
BQ_CALLS_TABLE = "calls"
GCS_BUCKET = "tu-proyecto-gll-raw"
PUBSUB_TOPIC = "projects/tu-proyecto/topics/gll-events"

# Safety
GLL_CANARY_PERCENTAGE = 0.05  # Empezar con 5%
GLL_VALIDATOR_MODEL = "claude-3-5-sonnet-20241022"
GLL_ALERT_THRESHOLD = 0.1  # Rollback si win_rate cae > 10%
```

---

## DÍA 2: Implementar Data Pipeline

### 1. Copiar archivos

```bash
# Crear estructura
mkdir -p llamadas/app/gll/queries
mkdir -p tests/gll

# Copiar archivos de GLL-IMPLEMENTATION-CODE.md:
# - app/gll/__init__.py (vacío)
# - app/gll/types.py
# - app/gll/data_pipeline.py
# - app/gll/analytics_engine.py
# - app/gll/prompt_optimizer.py
# - app/gll/safety_validator.py
# - app/gll/canary_deployer.py
```

### 2. Agregar endpoint en `main.py`

```python
# En app/main.py, agregar:

@app.post("/gll/call-complete")
async def gll_call_complete(request: Request) -> JSONResponse:
    """Log de llamada completada a GLL."""
    try:
        data = await request.json()
        from app.gll.data_pipeline import log_call_to_gll
        result = await log_call_to_gll(data)
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"GLL error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
```

### 3. Test básico

```bash
# Test endpoint
curl -X POST http://localhost:8000/gll/call-complete \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "test_001",
    "timestamp": "2026-06-21T14:30:00Z",
    "duration_seconds": 240,
    "outcome": "demo_booked",
    "lead_score": 8,
    "prospect": {
      "industry": "dentista",
      "company_size": "small"
    }
  }'
```

---

## DÍA 3: Agregar Analytics Queries

### 1. Crear queries SQL

```sql
-- En BigQuery, guardar como vistas:

-- Vista 1: Top Arguments
CREATE VIEW gll.vw_top_arguments AS
SELECT 
  arg.argument_id,
  arg.content,
  COUNT(*) AS times_used,
  COUNTIF(outcome = 'demo_booked') AS demos_booked,
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
  prospect.industry,
  DATE(CURRENT_TIMESTAMP()) AS date_computed
FROM gll.calls c,
     UNNEST(c.arguments_used) AS arg
WHERE DATE(c.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY arg.argument_id, arg.content, prospect.industry
HAVING COUNT(*) >= 5
ORDER BY win_rate DESC;

-- Vista 2: Top Objeciones
CREATE VIEW gll.vw_objections AS
SELECT 
  obj.objection,
  obj.handling_strategy,
  COUNT(*) AS frequency,
  COUNTIF(obj.resolved = TRUE) AS resolved_count,
  ROUND(COUNTIF(obj.resolved = TRUE) / COUNT(*), 3) AS resolution_rate,
  prospect.industry,
  DATE(CURRENT_TIMESTAMP()) AS date_computed
FROM gll.calls c,
     UNNEST(c.objections_encountered) AS obj
WHERE DATE(c.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY obj.objection, obj.handling_strategy, prospect.industry
ORDER BY resolution_rate DESC;

-- Vista 3: Best Offers
CREATE VIEW gll.vw_best_offers AS
SELECT 
  off.offer_id,
  off.amount_eur,
  off.frequency,
  COUNT(*) AS times_presented,
  COUNTIF(off.accepted = TRUE) AS accepted,
  ROUND(COUNTIF(off.accepted = TRUE) / COUNT(*), 3) AS acceptance_rate,
  prospect.industry,
  prospect.company_size,
  DATE(CURRENT_TIMESTAMP()) AS date_computed
FROM gll.calls c,
     UNNEST(c.offers_presented) AS off
WHERE DATE(c.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY off.offer_id, off.amount_eur, off.frequency, prospect.industry, prospect.company_size
HAVING COUNT(*) >= 3
ORDER BY acceptance_rate DESC;
```

### 2. Test queries

```bash
# Verificar que retornan datos (vacío los primeros días)
bq query --use_legacy_sql=false "SELECT * FROM gll.vw_top_arguments LIMIT 5;"
```

---

## DÍA 4: Implementar Prompt Optimizer

### 1. Integrar en `prompts.py`

```python
# En app/conversation/prompts.py, reemplazar get_system_prompt():

async def get_system_prompt(industry: str, company_size: str = "small") -> str:
    """System prompt, ahora dinámico."""
    
    from app.config import settings
    
    if not settings.GLL_ENABLED:
        return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
    
    try:
        from app.gll.prompt_optimizer import optimize_prompt
        
        optimized = await optimize_prompt(industry, company_size)
        logger.info(f"Using optimized prompt for {industry} (GLL v{optimized['version']})")
        return optimized["prompt"]
    
    except Exception as e:
        logger.warning(f"GLL optimization failed: {e}. Using static prompt.")
        return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
```

### 2. Test en staging

```bash
# Llamada de prueba (simular)
python -c "
import asyncio
from app.conversation.prompts import get_system_prompt

prompt = asyncio.run(get_system_prompt('dentista'))
print(prompt[:500])  # Ver primeros 500 chars
"
```

---

## DÍA 5: Implementar Safety Validator

### 1. Test validator en isolation

```python
# En tests/test_gll_validator.py:

import pytest
from app.gll.safety_validator import SafetyValidator

@pytest.mark.asyncio
async def test_validator_quality():
    validator = SafetyValidator()
    
    good_prompt = """
=== GUIÓN DENTISTA ===
Hola, te llamo porque tu clínica dental pierde pacientes.

=== ARGUMENTOS PROBADOS ===
1. [68% éxito] Recuperamos 30% de pacientes perdidos

=== COMPLIANCE ===
Soy un sistema automatizado. Puedes optar por no participar.
"""
    
    result = await validator.validate(good_prompt, "dentista")
    assert result["status"] in ["OK", "WARNING"]
    assert result["safe_to_deploy"]

# Correr:
pytest tests/test_gll_validator.py -v
```

---

## DÍA 6: Integrar Llamadas Reales

### 1. Modificar `media_stream.py`

```python
# En app/telephony/media_stream.py, al final de handle_media_stream():

async def finalize_call_for_gll(session):
    """Envía data de llamada a GLL."""
    import httpx
    import json
    
    call_data = {
        "call_id": session.call_sid,
        "timestamp": session.start_time.isoformat() if hasattr(session, 'start_time') else None,
        "duration_seconds": session.call_duration if hasattr(session, 'call_duration') else 0,
        "outcome": getattr(session, 'final_outcome', 'unknown'),
        "lead_score": getattr(session.state, 'lead_score', None) if hasattr(session, 'state') else None,
        "prospect": {
            "industry": session.software_id or "unknown",
            "company_size": "small",  # TODO: capturar si está disponible
        },
    }
    
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                "http://localhost:8000/gll/call-complete",
                json=call_data,
            )
        logger.info(f"GLL: Call {session.call_sid} logged")
    except Exception as e:
        logger.warning(f"GLL logging skipped (non-critical): {e}")


# Llamar en el cleanup final:
# if session:
#     await finalize_call_for_gll(session)
```

### 2. Test con llamada simulada

```bash
# Usar text_session.py para probar
python llamadas/scripts/test_call.py --mode=text --industry=dentista
```

---

## DÍA 7: Setup Monitoring

### 1. Crear Dashboard Looker/Metabase

```sql
-- Query principal para dashboard (Looker/Metabase):
SELECT 
  DATE(timestamp) AS date,
  prospect.industry,
  COUNT(*) AS total_calls,
  COUNTIF(outcome = 'demo_booked') AS demos_booked,
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
  APPROX_QUANTILES(lead_score, 100)[OFFSET(50)] AS median_lead_score,
  COUNTIF(compliance.disclosure_mentioned) / COUNT(*) AS disclosure_rate,
  version
FROM gll.calls
GROUP BY date, prospect.industry, version
ORDER BY date DESC, win_rate DESC;
```

### 2. Alertas Slack

```python
# En app/gll/alerts.py (crear):

import asyncio
import httpx
from app.config import settings

async def check_kpis():
    """Ejecutar cada 1 hora."""
    
    query = """
    SELECT 
      ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
      COUNT(*) AS total_calls
    FROM gll.calls
    WHERE DATE(timestamp) = CURRENT_DATE()
    """
    
    # TODO: ejecutar query
    
    # Si win_rate cae > 10%, alertar
    # await send_slack_alert(f"⚠️ Win rate dropped to {win_rate}")

asyncio.create_task(check_kpis())
```

---

## Checklist: Primeros 7 Días

- [ ] **Día 1:** BigQuery schema creado, tablas existentes
- [ ] **Día 2:** Data pipeline completo, endpoint testeable
- [ ] **Día 3:** Analytics queries creadas y funcionando
- [ ] **Día 4:** Prompt optimizer integrado en prompts.py
- [ ] **Día 5:** Validator testeado en isolation
- [ ] **Día 6:** Primeras 100 llamadas logueadas en GLL
- [ ] **Día 7:** Dashboard + alertas activos

---

## Datos Esperados (Semana 1)

Si todo funciona, después de 7 días deberías tener:

- ✅ 500-1000 llamadas logueadas en BigQuery
- ✅ Top 3-5 argumentos identificados (win rate > 50%)
- ✅ 5-10 objeciones comunes detectadas
- ✅ 2-3 ofertas testeadas
- ✅ 0 prompts roto (validator funcionando)

---

## Troubleshooting

### "BigQuery: Permission denied"
```bash
# Verificar credenciales GCP
gcloud auth application-default login

# Verificar que el service account tiene permisos
gcloud projects get-iam-policy tu-proyecto \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:serviceAccount@*"
```

### "GLL endpoint returns 500"
```bash
# Chequear logs
tail -f llamadas/logs/app.log | grep GLL

# Verificar que la tabla existe
bq ls -t gll

# Verificar schema
bq show gll.calls
```

### "Optimizer retorna empty prompt"
```python
# Verificar que hay data en vistas
# Si hay 0 llamadas, retorna base prompt (correcto)
# Si hay datos pero retorna vacío, chequear logs de analytics_engine.py
```

---

## Próximos Pasos (Semana 2)

Después de verificar que todo funciona:

1. **Habilitar Canary Deployer:**
   - Setear GLL_CANARY_PERCENTAGE = 0.05
   - Desplegar nueva versión de prompt y validar

2. **Agregar más campos:**
   - Capturar argumentos específicos usados
   - Tracking de objeciones con posición en transcript
   - Lead scoring granular

3. **Escalar a múltiples industrias:**
   - Dentista ✅
   - Veterinaria
   - Peluquería canina
   - Etc.

4. **ROI Tracking:**
   - Comparar win rate antes/después
   - Estimar revenue uplift

---

## Contacto + Support

- Preguntas técnicas: Claude Code
- Issues BigQuery: GCP Support
- Issues Canvas: Isra Bravo
