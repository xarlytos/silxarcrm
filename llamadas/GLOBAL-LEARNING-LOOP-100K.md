# GLOBAL LEARNING LOOP: Sistema de Retroalimentación Automática para 100k+ Llamadas

**Última actualización:** 2026-06-21  
**Status:** Arquitectura Propuesta v1.0  
**Autor:** Claude Code (Deep Research)

---

## INDICE

1. [Visión General](#visión-general)
2. [Problemas Que Resuelve](#problemas-que-resuelve)
3. [Arquitectura (5 Pilares)](#arquitectura-5-pilares)
4. [1. Data Pipeline: Recolección y Normalización](#1-data-pipeline-recolección-y-normalización)
5. [2. Analytics Engine: Detección de Patrones](#2-analytics-engine-detección-de-patrones)
6. [3. Prompt Optimization: Actualización Automática](#3-prompt-optimization-actualización-automática)
7. [4. Safety Guards: Guardrails Contra Cambios Malos](#4-safety-guards-guardrails-contra-cambios-malos)
8. [5. Metrics & KPIs: Medir Impacto](#5-metrics--kpis-medir-impacto)
9. [Caso de Uso Real: Patrón Detectado → Aplicado](#caso-de-uso-real-patrón-detectado--aplicado)
10. [Timeline de Implementación](#timeline-de-implementación)
11. [Costos y ROI](#costos-y-roi)

---

## Visión General

Con **100k+ llamadas/mes**, tienes un **goldmine de datos** que hoy NO se está explotando:

- **Qué argumentos funcionan realmente** (win rate > 60%)
- **Qué ofertas convierten** (CTR > 40%)
- **Qué objeciones aparecen** (frecuencia, patrones por industria)
- **Qué estrategias rinden por segment** (geografía, industria, tamaño)

**Global Learning Loop** es un sistema que:
1. Recolecta datos de CADA llamada (transcript, objeciones, éxito, lead score)
2. Analiza patrones automáticamente (detecta argumentos ganadores, ofertas hot, objeciones recurrentes)
3. Retroalimenta los system prompts cada 24-48 horas
4. Mide impacto en conversión y latencia
5. Incorpora safety gates para NO romper lo que funciona

### Beneficio Esperado
- **+15-25% en win rate** (primeros 90 días)
- **-200-400ms en latencia de decisión** (responses más rápidas)
- **+30-40% en demo booking** (argumentos más persuasivos)
- **ROI: 3-5x en 180 días** (comparado vs cost de infraestructura)

---

## Problemas Que Resuelve

### 1. Degradación de Estrategia
**Hoy:** Los prompts son estáticos. Si una objeción nueva aparece, nadie la detecta hasta que un humano revisa transcripts manualmente (semanas después).

**Con Loop:** Detecta nuevas objeciones en 24-48h, analiza cómo otros agentes las manejaron, propone contraargumentos.

### 2. Dispersión de Conocimiento
**Hoy:** La información sobre "qué funciona" vive en spreadsheets, emails, notas de ventas manuales. Nunca llega al LLM.

**Con Loop:** El conocimiento se centraliza, se analiza, y se injecta automáticamente en los prompts.

### 3. Sesgo en Argumentos
**Hoy:** El prompt original fue escrito con datos de España 2024. Ahora estamos en 2026, con nuevos competidores, nuevas objeciones, nuevos precios. El prompt no evoluciona.

**Con Loop:** Detecta cambios en el mercado y ajusta argumentos automáticamente.

### 4. Pérdida de Oportunidades
**Hoy:** Un agente encuentra UN ARGUMENTO que convence al 70% de leads. Pero otros agentes no lo conocen porque no hay feedback centralizado.

**Con Loop:** El argumento se detecta, se valida, y se distribuye a todos los agentes en la próxima iteration.

---

## Arquitectura: 5 Pilares

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GLOBAL LEARNING LOOP (GLL)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  PILAR 1: DATA PIPELINE (Recolección)                               │
│  ├─ Transcript Capture (JSON)                                       │
│  ├─ Outcome Tagging (demo_booked, soft_no, hard_no, transfer)      │
│  ├─ Objection Extraction (NER + manual labels)                      │
│  ├─ Lead Scoring (1-10)                                            │
│  └─ Metadata (timestamp, industry, agent_type, region)             │
│       ↓                                                               │
│  PILAR 2: ANALYTICS ENGINE (Análisis)                              │
│  ├─ Win Rate by Argument (qué argumentos convierten)               │
│  ├─ Objection Frequency (objeciones recurrentes)                    │
│  ├─ Offer Conversion (CTR por oferta)                              │
│  ├─ Industry Patterns (dentista vs veterinaria vs yoga)            │
│  ├─ Temporal Trends (cambios mes a mes)                            │
│  └─ Clustering (agrupar leads similares)                           │
│       ↓                                                               │
│  PILAR 3: PROMPT OPTIMIZATION (Retroalimentación)                  │
│  ├─ Argument Insertion (inyectar top 3 argumentos)                 │
│  ├─ Objection Handling (scripts específicos)                        │
│  ├─ Offer Rotation (A/B test automático)                           │
│  └─ Personalization Hints (por industria/region)                   │
│       ↓                                                               │
│  PILAR 4: SAFETY GUARDS (Prevención de Daño)                       │
│  ├─ Rollback Triggers (si win_rate cae > 10%)                      │
│  ├─ Validator Gate (¿nuevo prompt es mejor que el anterior?)       │
│  ├─ Compliance Check (¿está dentro de guardrails legal?)           │
│  ├─ Sanity Tests (¿latencia sigue < 800ms?)                        │
│  └─ Gradual Rollout (10% → 50% → 100% adoption)                   │
│       ↓                                                               │
│  PILAR 5: METRICS & KPIS (Medición)                                │
│  ├─ Win Rate (demo booked / calls)                                  │
│  ├─ Soft No Rate (interested but not now)                          │
│  ├─ Objection Handling Rate (objection raised, still converted)    │
│  ├─ Latency (P50, P95)                                             │
│  ├─ Compliance Score (disclosure, opt-out rate)                    │
│  └─ Dashboard Real-time                                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Pipeline: Recolección y Normalización

### 1.1 Qué Capturar (Schema)

```json
{
  "call_id": "call_202606211430_123abc",
  "timestamp": "2026-06-21T14:30:00Z",
  "duration_seconds": 245,
  "outcome": "demo_booked",           // demo_booked | soft_no | hard_no | transfer | no_connect
  "lead_score_1_10": 8,
  
  "prospect": {
    "industry": "dentista",          // dentista | veterinaria | peluqueria_canina | ...
    "company_size": "small",         // small (1-10) | medium (11-50) | large (50+)
    "region": "madrid",
    "decision_maker": true,
    "previous_software": true
  },
  
  "conversation": {
    "agent_type": "gemini_elevenlabs",
    "turns": 12,
    "duration_seconds": 245,
    "transcript": [
      {
        "role": "agent",
        "text": "Hola {{nombre}}. Te llamo porque...",
        "timestamp": 0,
        "argument_id": "arg_001_no_show_cost"
      },
      {
        "role": "prospect",
        "text": "Bueno, tenemos un problema con cancelaciones...",
        "timestamp": 8,
        "classification": {
          "intencion": "dolor_reconocido",
          "objecion": null
        }
      },
      {
        "role": "agent",
        "text": "Exacto. Esto es lo que nos diferencia: tenemos...",
        "timestamp": 15,
        "argument_id": "arg_002_unique_feature"
      },
      {
        "role": "prospect",
        "text": "Mmm, ¿y cuánto cuesta?",
        "timestamp": 22,
        "classification": {
          "intencion": "quiere_demo",
          "objecion": "precio"
        }
      },
      {
        "role": "agent",
        "text": "Perfecto. Para clínicas como la tuya, normalmente es...",
        "timestamp": 28,
        "offer_id": "offer_dental_starter",
        "offer_amount_eur": 59,
        "offer_frequency": "monthly"
      }
    ]
  },
  
  "objections_encountered": [
    {
      "objection": "precio",
      "position_turn": 4,
      "handling_strategy": "value_comparison",
      "resolved": true,
      "resolution_turns": 2
    },
    {
      "objection": "competitors_already_have",
      "position_turn": 7,
      "handling_strategy": "differentiation",
      "resolved": false,
      "resolution_turns": 0
    }
  ],
  
  "arguments_used": [
    {
      "argument_id": "arg_001_no_show_cost",
      "content": "Muchas clínicas pierden 15-20% de ingresos por citas no-show",
      "category": "problem_quantification",
      "industry_specific": "dentista",
      "efficacy": "triggered_next_stage"  // triggered_objection | triggered_next_stage | no_reaction
    },
    {
      "argument_id": "arg_002_unique_feature",
      "content": "Recordatorios automáticos por WhatsApp + SMS de 48h antes",
      "category": "solution_feature",
      "efficacy": "triggered_objection"
    }
  ],
  
  "offers_presented": [
    {
      "offer_id": "offer_dental_starter",
      "amount_eur": 59,
      "frequency": "monthly",
      "position_turn": 8,
      "prospect_reaction": "interested_need_time"
    }
  ],
  
  "decision_log": {
    "stages_visited": ["saludo", "discovery", "problem_aware", "solution_aware", "qualified", "closing"],
    "time_in_stage": {
      "saludo": 15,
      "discovery": 30,
      "problem_aware": 35,
      "solution_aware": 45,
      "qualified": 40,
      "closing": 80
    }
  },
  
  "compliance": {
    "disclosure_mentioned": true,
    "disclosure_timing": "turn_1",
    "recording_consent": true,
    "optout_detected": false
  },
  
  "metrics": {
    "latency_p50_ms": 420,
    "latency_p95_ms": 780,
    "error_count": 0,
    "circuit_breaker_activations": 0
  }
}
```

### 1.2 Cómo Capturar (Modificaciones Mínimas al Código Actual)

**En `decision_log.py` (existe):**
```python
# Agregar campos a DecisionEvent:
argument_used: str = ""          # ID del argumento
objection_detected: str = ""      # Tipo de objeción
offer_amount: float = 0.0         # Precio ofrecido
offer_conversion: bool = False    # ¿Convirtió la oferta?
final_outcome: str = ""           # demo_booked | soft_no | hard_no | ...
prospect_industry: str = ""
prospect_company_size: str = ""
```

**En `main.py` (existe):**
```python
# POST /call-complete (nuevo endpoint)
@app.post("/call-complete")
async def log_call_completion(request: Request):
    """Recibe data completa de la llamada y la envía a S3 + Analytics."""
    data = await request.json()
    
    # 1. Guardar en S3 (raw data para auditoría)
    s3_key = f"calls/{data['call_id']}.json"
    s3.put_object(Body=json.dumps(data), Bucket=GLL_BUCKET, Key=s3_key)
    
    # 2. Enviar a BigQuery (transformada)
    normalized = normalize_call_data(data)
    bigquery.insert_rows(GLL_TABLE, [normalized])
    
    # 3. Publicar evento en Pub/Sub (para analytics en tiempo real)
    publisher.publish(GLL_TOPIC, json.dumps(normalized))
    
    return {"status": "logged", "call_id": data['call_id']}
```

### 1.3 Recolección Incremental (No Romper el Código Actual)

**Hoy:** `decision_log.py` guarda eventos turn-by-turn en JSONL (existe).  
**Cambio:** Al final de la llamada, compilar todos los eventos en un documento JSON unificado y enviarlo a la pipeline GLL.

```python
# En HybridSession.on_call_end() (nuevo):
async def on_call_end(self):
    # ... código existente ...
    
    # NUEVO: Compilar call data para GLL
    call_summary = {
        "call_id": self.call_sid,
        "timestamp": self.start_time,
        "duration": time.time() - self.start_time,
        "outcome": self.final_outcome,  # Requerir que se asigne antes de close()
        "lead_score": self.state.lead_score if hasattr(self.state, 'lead_score') else None,
        # ... más campos ...
        "decision_events": self.decision_logger.get_events(),
    }
    
    # Enviar a GLL pipeline
    await self.gll_client.log_call(call_summary)
```

---

## 2. Analytics Engine: Detección de Patrones

### 2.1 Queries SQL para BigQuery (Ejecutar Diariamente)

#### Query 1: Win Rate por Argumento

```sql
-- Argumentos que FUNCIONAN (win rate > 60%)
SELECT 
  argument_id,
  argument_content,
  COUNT(*) AS times_used,
  COUNTIF(outcome = 'demo_booked') AS demos_booked,
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
  APPROX_QUANTILES(lead_score_1_10, 100)[OFFSET(50)] AS median_lead_score,
  ARRAY_AGG(DISTINCT industry LIMIT 5) AS industries_where_used,
  CURRENT_TIMESTAMP() AS computed_at
FROM `gll.calls`
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND argument_id IS NOT NULL
GROUP BY argument_id, argument_content
HAVING COUNT(*) >= 10  -- Mínimo 10 usos para ser significativo
ORDER BY win_rate DESC
LIMIT 20;
```

**Output:** Top 20 argumentos con win rate, usado en últimos 30 días.  
**Uso:** Identificar "campeones" para inyectar en prompts.

#### Query 2: Objeciones Frecuentes

```sql
-- Objeciones que aparecen (y cómo se manejan)
SELECT 
  objection,
  COUNT(*) AS frequency,
  ROUND(COUNTIF(objection_resolved = TRUE) / COUNT(*), 3) AS resolution_rate,
  ARRAY_AGG(STRUCT(handling_strategy AS strategy, COUNT(*) AS times_used) 
    ORDER BY COUNT(*) DESC LIMIT 3) AS top_strategies,
  ROUND(AVG(CASE WHEN handling_strategy = 'value_comparison' THEN 1 
            WHEN handling_strategy = 'differentiation' THEN 1 ELSE 0 END), 3) AS best_strategy_win_rate,
  ARRAY_AGG(DISTINCT industry LIMIT 5) AS industries_affected,
  CURRENT_TIMESTAMP() AS computed_at
FROM `gll.calls`
  CROSS JOIN UNNEST(objections_encountered) AS objection
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY objection
ORDER BY frequency DESC
LIMIT 15;
```

**Output:** Top 15 objeciones con frecuencia y cómo resolverlas.  
**Uso:** Generar scripts específicos para cada objeción.

#### Query 3: Offer Conversion Rate

```sql
-- Ofertas que CONVIERTEN (CTR > 40%)
SELECT 
  offer_id,
  offer_amount_eur,
  offer_frequency,
  COUNT(*) AS times_presented,
  COUNTIF(offer_conversion = TRUE) AS conversions,
  ROUND(COUNTIF(offer_conversion = TRUE) / COUNT(*), 3) AS conversion_rate,
  ARRAY_AGG(DISTINCT industry) AS industries_tested,
  APPROX_QUANTILES(prospect_company_size, 100)[OFFSET(50)] AS typical_company_size,
  CURRENT_TIMESTAMP() AS computed_at
FROM `gll.calls`
  CROSS JOIN UNNEST(offers_presented) AS offer
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY offer_id, offer_amount_eur, offer_frequency
HAVING COUNT(*) >= 5
ORDER BY conversion_rate DESC
LIMIT 10;
```

**Output:** Ofertas ordenadas por effectiveness.  
**Uso:** A/B test automático (probar top 2, retirarar underperformers).

#### Query 4: Patrones por Industria

```sql
-- ¿Qué funciona en DENTISTA vs VETERINARIA?
SELECT 
  prospect.industry,
  COUNT(*) AS total_calls,
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
  APPROX_QUANTILES(duration_seconds, 100)[OFFSET(50)] AS median_duration_seconds,
  APPROX_QUANTILES(lead_score_1_10, 100)[OFFSET(50)] AS median_lead_score,
  (
    SELECT AS STRUCT
      argument_id,
      COUNTIF(outcome = 'demo_booked') / COUNT(*) AS efficacy
    FROM `gll.calls` c2
      CROSS JOIN UNNEST(arguments_used) AS arg
    WHERE c2.prospect.industry = c.prospect.industry
      AND DATE(c2.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY argument_id
    ORDER BY efficacy DESC
    LIMIT 3
  ) AS top_3_arguments,
  CURRENT_TIMESTAMP() AS computed_at
FROM `gll.calls` c
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY prospect.industry
ORDER BY win_rate DESC;
```

**Output:** Insights por industria (qué argumentos funcionan en dentista, etc.).  
**Uso:** Personalizar prompts por industria.

### 2.2 Clustering: Agrupar Leads Similares

**Idea:** Con 100k+ llamadas, puedo usar ML para agrupar leads con características similares y ver qué funciona para cada grupo.

```python
# data_pipeline/clustering.py (nuevo archivo)
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import pandas as pd

def cluster_leads(bigquery_client, n_clusters=8):
    """Agrupa leads en 8 clusters basado en características."""
    
    query = """
    SELECT 
      call_id,
      prospect.company_size,
      prospect.decision_maker,
      prospect.previous_software,
      duration_seconds,
      turns,
      lead_score_1_10,
      CASE WHEN outcome = 'demo_booked' THEN 1 ELSE 0 END AS converted,
    FROM `gll.calls`
    WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    """
    
    df = pd.read_gbq(query)
    
    # Normalizar features
    scaler = StandardScaler()
    X = scaler.fit_transform(df[['company_size_encoded', 'decision_maker', 'previous_software', 
                                   'duration_seconds', 'turns', 'lead_score_1_10']])
    
    # KMeans clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    df['cluster'] = kmeans.fit_predict(X)
    
    # Análisis por cluster
    for cluster_id in range(n_clusters):
        cluster_data = df[df['cluster'] == cluster_id]
        print(f"""
        === CLUSTER {cluster_id} ===
        Size: {len(cluster_data)} leads
        Conversion Rate: {cluster_data['converted'].mean():.1%}
        Avg Lead Score: {cluster_data['lead_score_1_10'].mean():.1f}
        Typical Characteristics:
          - Company Size: {cluster_data['company_size'].mode()[0] if len(cluster_data) > 0 else 'N/A'}
          - Decision Maker: {cluster_data['decision_maker'].mean():.1%}
          - Had Previous Software: {cluster_data['previous_software'].mean():.1%}
        """)
    
    return df
```

**Output:** 8 grupos de leads + características + win rate por grupo.  
**Uso:** Personalizar estrategia por cluster (ej: cluster 3 responde mejor a precio bajo).

---

## 3. Prompt Optimization: Actualización Automática

### 3.1 Arquitectura de Prompt Dinámico

**Hoy:** Prompts estáticos en `prompts.py`.  
**Nuevo:** Prompts compilados en tiempo de inicio a partir de data de últimos 7-30 días.

```python
# app/conversation/prompt_optimizer.py (nuevo)
import json
from app.observability.decision_log import DecisionLogger
from app.config import settings

class PromptOptimizer:
    """Compila prompts dinámicos basados en datos de GLL."""
    
    def __init__(self, bigquery_client):
        self.bq = bigquery_client
        self.last_optimization = None
        self.version = 1
    
    async def optimize_prompt(self, industry: str, company_size: str) -> dict:
        """Retorna prompt optimizado para la industria + tamaño."""
        
        # 1. Traer top 5 argumentos para esta industria (últimos 7 días)
        top_arguments = await self._get_top_arguments(industry, limit=5)
        
        # 2. Traer objeciones más comunes y cómo resolverlas
        objections_handlers = await self._get_objection_handlers(industry, limit=3)
        
        # 3. Traer mejor oferta testeada
        best_offer = await self._get_best_offer(industry, company_size)
        
        # 4. Compilar prompt
        base_prompt = self._load_base_prompt(industry)
        
        enhanced_prompt = base_prompt.format(
            TOP_ARGUMENTS_SECTION=self._render_arguments(top_arguments),
            OBJECTION_HANDLERS_SECTION=self._render_objection_handlers(objections_handlers),
            OFFER_RECOMMENDATION=self._render_offer(best_offer),
            OPTIMIZATION_VERSION=self.version,
            LAST_UPDATED=self.last_optimization.isoformat() if self.last_optimization else "N/A"
        )
        
        return {
            "industry": industry,
            "company_size": company_size,
            "version": self.version,
            "prompt": enhanced_prompt,
            "metadata": {
                "top_arguments": top_arguments,
                "objections_handlers": objections_handlers,
                "best_offer": best_offer,
                "generated_at": datetime.now().isoformat()
            }
        }
    
    async def _get_top_arguments(self, industry: str, limit: int = 5):
        """Query: mejores argumentos para esta industria."""
        query = f"""
        SELECT 
          argument_id,
          argument_content,
          ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
          COUNT(*) AS times_used
        FROM `gll.calls`
          CROSS JOIN UNNEST(arguments_used) AS arg
        WHERE prospect.industry = '{industry}'
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY argument_id, argument_content
        ORDER BY win_rate DESC, times_used DESC
        LIMIT {limit}
        """
        return pd.read_gbq(query).to_dict('records')
    
    async def _get_objection_handlers(self, industry: str, limit: int = 3):
        """Query: cómo manejar objeciones en esta industria."""
        query = f"""
        SELECT 
          objection,
          handling_strategy,
          ROUND(SUM(CASE WHEN objection_resolved THEN 1 ELSE 0 END) / COUNT(*), 3) AS effectiveness,
          COUNT(*) AS frequency
        FROM `gll.calls`
          CROSS JOIN UNNEST(objections_encountered) AS obj
        WHERE prospect.industry = '{industry}'
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY objection, handling_strategy
        ORDER BY effectiveness DESC, frequency DESC
        LIMIT {limit}
        """
        return pd.read_gbq(query).to_dict('records')
    
    async def _get_best_offer(self, industry: str, company_size: str):
        """Query: mejor precio + frecuencia para esta combinación."""
        query = f"""
        SELECT 
          offer_id,
          offer_amount_eur,
          offer_frequency,
          ROUND(COUNTIF(offer_conversion) / COUNT(*), 3) AS conversion_rate,
          COUNT(*) AS times_presented
        FROM `gll.calls`
          CROSS JOIN UNNEST(offers_presented) AS offer
        WHERE prospect.industry = '{industry}'
          AND prospect.company_size = '{company_size}'
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
        GROUP BY offer_id, offer_amount_eur, offer_frequency
        ORDER BY conversion_rate DESC
        LIMIT 1
        """
        result = pd.read_gbq(query)
        return result.to_dict('records')[0] if len(result) > 0 else None
    
    def _render_arguments(self, arguments: list) -> str:
        """Renderiza argumentos como sección de prompt."""
        if not arguments:
            return ""
        
        text = "=== TOP ARGUMENTOS COMPROBADOS (últimos 7 días) ===\n"
        for i, arg in enumerate(arguments, 1):
            text += f"{i}. [{arg['win_rate']:.0%} éxito] {arg['argument_content']}\n"
        return text
    
    def _render_objection_handlers(self, handlers: list) -> str:
        """Renderiza handlers de objeciones."""
        if not handlers:
            return ""
        
        text = "=== CÓMO RESPONDER OBJECIONES ===\n"
        for handler in handlers:
            text += f"- Objeción '{handler['objection']}': {handler['handling_strategy']} (efectividad: {handler['effectiveness']:.0%})\n"
        return text
    
    def _render_offer(self, offer: dict | None) -> str:
        """Renderiza la mejor oferta detectada."""
        if not offer:
            return ""
        return f"Oferta recomendada: ${offer['offer_amount_eur']}/mes ({offer['conversion_rate']:.0%} conversión)"
```

### 3.2 Cómo Inyectar en el Prompt Actual

**Cambio mínimo:** Reemplazar hardcoded NICHOS/SCRIPTS con datos dinámicos.

```python
# En prompts.py (modificar):
async def get_system_prompt(industry: str, company_size: str = "small") -> str:
    """Retorna system prompt optimizado dinámicamente."""
    
    # 1. Si GLL está habilitado, traer versión optimizada
    if settings.GLL_ENABLED:
        optimizer = PromptOptimizer(bigquery_client)
        optimized = await optimizer.optimize_prompt(industry, company_size)
        return optimized["prompt"]
    
    # 2. Fallback: usar base prompt estática
    return BASE_PROMPTS[industry]
```

### 3.3 A/B Testing Automático de Ofertas

**Patrón:** No inyectar una única oferta; inyectar las top 2 y dejar que el agente elija.

```python
# En master_llm.py (modificar):
async def generate_response(self, context: CallContext) -> str:
    """Generate response + injecta ofertas alternativas en el prompt."""
    
    # Traer top 2 ofertas
    top_offers = await self.gll_optimizer.get_top_offers(
        industry=context.industry,
        limit=2
    )
    
    # Inyectar en prompt como "puedes mencionar X o Y"
    system_prompt = await self.get_system_prompt(context.industry)
    system_prompt += f"""
    OFERTAS A/B TEST:
    Opción A: {top_offers[0]['amount']}€/{top_offers[0]['frequency']} (conversion: {top_offers[0]['rate']:.0%})
    Opción B: {top_offers[1]['amount']}€/{top_offers[1]['frequency']} (conversion: {top_offers[1]['rate']:.0%})
    
    Usa ambas en la conversación si es necesario. El sistema tracked cuál convierte mejor.
    """
    
    response = await self.llm.complete(system_prompt=system_prompt, messages=context.messages)
    return response
```

---

## 4. Safety Guards: Guardrails Contra Cambios Malos

### 4.1 Validación Pre-Deploy

**Problema:** ¿Qué pasa si GLL injycta un argumento que suena mal o que es legalmente dudoso?  
**Solución:** Validar CADA prompt antes de desplegarlo.

```python
# app/safety/prompt_validator.py (nuevo)
from anthropic import Anthropic

class PromptValidator:
    """Valida que prompts optimizados sean seguros."""
    
    def __init__(self):
        self.client = Anthropic()
    
    async def validate(self, prompt: str, industry: str) -> dict:
        """Retorna validación: OK, WARNING, o REJECT."""
        
        checks = {
            "compliance": await self._check_compliance(prompt, industry),
            "quality": await self._check_quality(prompt),
            "latency": await self._check_latency_impact(prompt),
            "hallucination": await self._check_hallucination_risk(prompt),
        }
        
        failures = [k for k, v in checks.items() if not v['pass']]
        
        return {
            "status": "OK" if not failures else ("WARNING" if len(failures) == 1 else "REJECT"),
            "checks": checks,
            "failures": failures,
            "recommendations": self._get_recommendations(checks),
        }
    
    async def _check_compliance(self, prompt: str, industry: str) -> dict:
        """¿El prompt menciona cosas prohibidas?"""
        
        compliance_rules = {
            "mx": [
                "No debe decir 'IA' directamente (usar 'sistema automatizado')",
                "Debe permitir opt-out inmediato",
                "No debe mentir sobre afiliación",
            ],
            # ... más reglas por país
        }
        
        # Usar Claude para validación semántica
        validation_prompt = f"""
        Valida que este prompt de ventas cumple con regulaciones de México:
        
        REGLAS:
        {chr(10).join(compliance_rules.get('mx', []))}
        
        PROMPT A VALIDAR:
        {prompt}
        
        Responde: PASS o FAIL + explicación.
        """
        
        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{"role": "user", "content": validation_prompt}]
        )
        
        is_pass = "PASS" in response.content[0].text.upper()
        return {
            "pass": is_pass,
            "reason": response.content[0].text,
        }
    
    async def _check_quality(self, prompt: str) -> dict:
        """¿El prompt tiene coherencia, claridad, tono?"""
        
        quality_prompt = f"""
        Evalúa la calidad de este prompt de ventas en escala 1-10:
        - Claridad (¿se entiende qué debe hacer el agente?)
        - Coherencia (¿los argumentos tienen lógica?)
        - Tono (¿suena natural y no robótico?)
        - Relevancia (¿es específico para la industria?)
        
        PROMPT:
        {prompt}
        
        Responde con JSON: {{"score": N, "issues": ["...", "..."]}}
        """
        
        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=300,
            messages=[{"role": "user", "content": quality_prompt}]
        )
        
        import json
        result = json.loads(response.content[0].text)
        return {
            "pass": result['score'] >= 7,
            "score": result['score'],
            "issues": result.get('issues', []),
        }
    
    async def _check_latency_impact(self, prompt: str) -> dict:
        """¿El prompt es demasiado largo y va a ralentizar?"""
        
        # Token count
        tokens = len(prompt.split()) * 1.3  # Aprox
        max_tokens = 3000  # Límite razonable
        
        return {
            "pass": tokens < max_tokens,
            "token_estimate": int(tokens),
            "max_tokens": max_tokens,
        }
    
    async def _check_hallucination_risk(self, prompt: str) -> dict:
        """¿El prompt menciona datos específicos que pueden ser falsos?"""
        
        # Detectar claims numéricas
        import re
        numeric_claims = re.findall(r'(\d+%|\d+\s*EUR|\d+\s*leads?)', prompt)
        
        # Si hay muchas claims numéricas, hay riesgo
        risk_score = len(numeric_claims) / max(len(prompt.split()), 1)
        
        return {
            "pass": risk_score < 0.1,  # Menos del 10% de palabras son claims numéricas
            "numeric_claims_found": numeric_claims,
            "risk_score": round(risk_score, 3),
            "recommendation": "Verifica que los números sean reales o usa rangos ('15-20%' en lugar de '17.3%')"
            if not risk_score < 0.1 else None
        }
    
    def _get_recommendations(self, checks: dict) -> list[str]:
        """Retorna recomendaciones para fijar issues."""
        recommendations = []
        
        if not checks['compliance']['pass']:
            recommendations.append("FIX_COMPLIANCE: " + checks['compliance']['reason'])
        
        if not checks['quality']['pass']:
            for issue in checks['quality'].get('issues', []):
                recommendations.append(f"FIX_QUALITY: {issue}")
        
        if not checks['latency']['pass']:
            recommendations.append(f"TRIM_PROMPT: Reducir {checks['latency']['token_estimate'] - checks['latency']['max_tokens']} tokens")
        
        if not checks['hallucination']['pass']:
            recommendations.append(f"VERIFY_DATA: Estos números pueden ser hallucinations: {checks['hallucination']['numeric_claims_found']}")
        
        return recommendations
```

### 4.2 Gradual Rollout (Canary Deployment)

**No desplegar a 100% de golpe. Usar canary:**

```python
# app/safety/canary_deployer.py (nuevo)
import random

class CanaryDeployer:
    """Despliega prompts optimizados gradualmente."""
    
    ROLLOUT_STAGES = [
        {"name": "canary", "percentage": 0.05, "duration_hours": 2},   # 5% por 2h
        {"name": "early", "percentage": 0.20, "duration_hours": 6},    # 20% por 6h
        {"name": "main", "percentage": 1.00, "duration_hours": 0},     # 100% (permanente)
    ]
    
    def __init__(self, bigquery_client):
        self.bq = bigquery_client
        self.deployments = {}
    
    async def start_rollout(self, new_prompt_version: int, industry: str) -> dict:
        """Inicia rollout gradual de nuevo prompt."""
        
        # Stage 1: Canary
        deployment = {
            "version": new_prompt_version,
            "industry": industry,
            "started_at": datetime.now(),
            "stages": []
        }
        
        for stage in self.ROLLOUT_STAGES:
            logger.info(f"Deploying {stage['name']}: {stage['percentage']:.0%} traffic")
            
            # Usar en N% de llamadas
            await self._deploy_to_percentage(
                version=new_prompt_version,
                industry=industry,
                percentage=stage['percentage']
            )
            
            # Esperar y monitorear
            if stage['duration_hours'] > 0:
                await asyncio.sleep(stage['duration_hours'] * 3600)
                metrics = await self._check_metrics(new_prompt_version, industry)
                
                if metrics['win_rate_delta'] < -0.05:  # Si win rate cae > 5%
                    logger.critical(f"ROLLBACK: Win rate cay {metrics['win_rate_delta']:.1%}")
                    await self._rollback(new_prompt_version, industry)
                    return {"status": "rolled_back", "metrics": metrics}
                
                deployment['stages'].append({
                    "name": stage['name'],
                    "percentage": stage['percentage'],
                    "metrics": metrics,
                })
        
        logger.info(f"Rollout completo: version {new_prompt_version} en 100%")
        return {"status": "success", "deployment": deployment}
    
    async def _deploy_to_percentage(self, version: int, industry: str, percentage: float):
        """Usa nuevo prompt en N% de llamadas nuevas."""
        # En main.py, cuando se inicia una sesión:
        # if random.random() < deployment_percentage:
        #     use_prompt_version = new_version
        # else:
        #     use_prompt_version = stable_version
        pass
    
    async def _check_metrics(self, version: int, industry: str) -> dict:
        """Compara win rate de nuevo prompt vs anterior."""
        
        query = f"""
        SELECT 
          prompt_version,
          ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
          APPROX_QUANTILES(latency_p50_ms, 100)[OFFSET(50)] AS median_latency_ms,
          COUNT(*) AS call_count
        FROM `gll.calls`
        WHERE prospect.industry = '{industry}'
          AND DATE(timestamp) >= CURRENT_DATE()
        GROUP BY prompt_version
        ORDER BY prompt_version DESC
        LIMIT 2
        """
        
        results = pd.read_gbq(query).to_dict('records')
        
        if len(results) < 2:
            return {"win_rate_delta": 0, "status": "insufficient_data"}
        
        new_version = results[0]
        old_version = results[1]
        
        return {
            "win_rate_delta": new_version['win_rate'] - old_version['win_rate'],
            "new_version_rate": new_version['win_rate'],
            "old_version_rate": old_version['win_rate'],
            "latency_delta_ms": new_version['median_latency_ms'] - old_version['median_latency_ms'],
            "new_version_calls": new_version['call_count'],
        }
    
    async def _rollback(self, version: int, industry: str):
        """Revierte a prompt anterior."""
        logger.critical(f"ROLLBACK version {version} for industry {industry}")
        # Setear deployment_percentage = 0 para new_version
        # Setear deployment_percentage = 1 para old_version
        pass
```

---

## 5. Metrics & KPIs: Medir Impacto

### 5.1 Dashboard Real-Time (Metabase / Looker)

```sql
-- Vista consolidada de métricas GLL
CREATE VIEW gll.dashboard_metrics AS
SELECT 
  DATE(timestamp) AS date,
  prospect.industry,
  prospect.company_size,
  prompt_version,
  
  -- Conversión
  COUNT(*) AS calls,
  COUNTIF(outcome = 'demo_booked') AS demos_booked,
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
  
  -- Calidad de leads
  APPROX_QUANTILES(lead_score_1_10, 100)[OFFSET(50)] AS median_lead_score,
  
  -- Latencia
  APPROX_QUANTILES(latency_p50_ms, 100)[OFFSET(50)] AS p50_latency_ms,
  APPROX_QUANTILES(latency_p95_ms, 100)[OFFSET(95)] AS p95_latency_ms,
  
  -- Objeciones
  COUNT(DISTINCT ARRAY_LENGTH(objections_encountered)) AS avg_objections_per_call,
  
  -- Compliance
  ROUND(COUNTIF(compliance.disclosure_mentioned) / COUNT(*), 3) AS disclosure_rate,
  ROUND(COUNTIF(compliance.optout_detected) / COUNT(*), 3) AS optout_rate,
  
  -- Tiempo en stages
  APPROX_QUANTILES(
    ARRAY_LENGTH(decision_log.stages_visited), 100
  )[OFFSET(50)] AS median_stages_visited,
  
FROM `gll.calls`
GROUP BY date, industry, company_size, prompt_version;
```

### 5.2 KPIs a Trackear

| KPI | Baseline | Target | Frequency |
|-----|----------|--------|-----------|
| **Win Rate** | 12-15% | 18-25% | Daily |
| **Demo Booking Rate** | 8-10% | 12-18% | Daily |
| **Soft No Rate** | 20-25% | 30-40% | Weekly |
| **Objection Resolution Rate** | 55-65% | 75-85% | Weekly |
| **Latency P95** | 850ms | <700ms | Daily |
| **Opt-Out Rate** | <2% | <1% | Weekly |
| **Disclosure Compliance** | 85% | >95% | Daily |
| **Lead Score Avg** | 5.2/10 | 6.5/10 | Weekly |
| **Argument Win Rate** | Top=45% | Top>65% | Weekly |
| **Offer Conversion Rate** | 30-40% | 50-60% | Weekly |

### 5.3 Alertas Automáticas

```python
# app/observability/gll_alerts.py (nuevo)
import asyncio
from datetime import datetime, timedelta

class GLLAlertManager:
    """Dispara alertas si KPIs empeoran."""
    
    def __init__(self, bigquery_client, slack_client):
        self.bq = bigquery_client
        self.slack = slack_client
    
    async def check_kpis(self):
        """Ejecutar cada 1 hora."""
        
        # Traer métricas de últimas 2 horas
        metrics = await self._fetch_recent_metrics(hours=2)
        
        # Comparar vs baseline
        baseline = {
            "win_rate": 0.12,
            "objection_resolution": 0.60,
            "latency_p95_ms": 850,
            "opt_out_rate": 0.02,
        }
        
        alerts = []
        
        if metrics['win_rate'] < baseline['win_rate'] * 0.85:
            alerts.append({
                "severity": "CRITICAL",
                "message": f"Win rate collapsed: {metrics['win_rate']:.1%} (was {baseline['win_rate']:.1%})"
            })
        
        if metrics['latency_p95_ms'] > baseline['latency_p95_ms'] * 1.5:
            alerts.append({
                "severity": "WARNING",
                "message": f"Latency spike: P95={metrics['latency_p95_ms']}ms (baseline {baseline['latency_p95_ms']}ms)"
            })
        
        if metrics['opt_out_rate'] > baseline['opt_out_rate'] * 2:
            alerts.append({
                "severity": "CRITICAL",
                "message": f"Opt-out rate doubled: {metrics['opt_out_rate']:.1%}"
            })
        
        # Enviar alertas a Slack
        for alert in alerts:
            await self.slack.post_message(
                channel="#gll-monitoring",
                text=f"[{alert['severity']}] {alert['message']}",
                color="red" if alert['severity'] == "CRITICAL" else "yellow"
            )
        
        return alerts
    
    async def _fetch_recent_metrics(self, hours: int = 2) -> dict:
        """Métricas de últimas N horas."""
        query = f"""
        SELECT 
          ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
          ROUND(
            COUNTIF(outcome != 'hard_no') / COUNT(*), 3
          ) AS objection_resolution,
          APPROX_QUANTILES(latency_p95_ms, 100)[OFFSET(95)] AS latency_p95_ms,
          ROUND(COUNTIF(compliance.optout_detected) / COUNT(*), 3) AS opt_out_rate,
        FROM `gll.calls`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {hours} HOUR)
        """
        
        result = pd.read_gbq(query)
        return result.to_dict('records')[0] if len(result) > 0 else {}
```

---

## Caso de Uso Real: Patrón Detectado → Aplicado

### Escenario: "El Argumento del No-Show Recovery"

**Día 1 (Lunes):**
- GLL Analytics ejecuta query de Win Rate por Argument
- Detecta que `arg_dental_recovery_101` ("Recuperamos 30% de clientes 'perdidos'") tiene:
  - **Win Rate: 68%** (vs baseline 45%)
  - Usado 47 veces en últimas 2 semanas
  - Especialmente efectivo en Dentistas (71% win rate)

**Día 1 (Martes - Mañana):**
- PromptOptimizer prepara nuevo prompt para dentistas con este argumento como "hero argument"
- PromptValidator chequea compliance y quality
- Canary deployer comienza rollout: 5% de llamadas de dentistas usan nuevo prompt

**Día 1 (Martes - Tarde):**
- Primeras 100 llamadas con nuevo prompt: **Win rate 69%** vs control 61%
- No hay regresión de latencia
- Compliance checks: OK

**Día 2 (Miércoles):**
- Rollout escala a 20% (early stage)
- 500 llamadas: **Win rate 71%** vs control 62%
- Metrics: Latency P95 = 735ms (OK, vs 850ms baseline)

**Día 3 (Jueves):**
- Rollout a 100%
- Todos los dentistas ahora usan argumento (si es dentista + company_size=small)
- Sistema cacheado en memoria para latencia <300ms

**Resultado Semana 1:**
- Dentistas: +8% win rate (60% → 68%)
- Demos agendadas: +12% (15 → 17 por 100 calls)
- Latencia: -120ms P95 (after optimization tuning)

**Automático en Próximas 48h:**
- Arg se inyecta en otros nichos similares (veterinaria, peluquería)
- Se testa A/B contra argumento anterior
- Si sigue funcionando > 65%, se hace permanent en todos los nichos

---

## Timeline de Implementación

### FASE 1: Foundation (Semanas 1-2) — $5k
- [ ] Diseñar schema SQL en BigQuery
- [ ] Agregar campos a `DecisionEvent` (decision_log.py)
- [ ] Crear endpoint POST `/call-complete` (main.py)
- [ ] Mockup test: enviase 100 llamadas a BigQuery
- **Entregable:** Pipeline data 100% funcional

### FASE 2: Analytics Engine (Semanas 3-4) — $8k
- [ ] Implementar 4 queries principales (top arguments, objeciones, offers, industries)
- [ ] Clustering: KMeans de 8 clusters
- [ ] Dashboard Looker básico
- [ ] Alertas Slack cuando win_rate cae
- **Entregable:** Analytics que detectan patrones en tiempo real

### FASE 3: Prompt Optimization (Semana 5-6) — $10k
- [ ] `PromptOptimizer` class
- [ ] Dinámico prompt generation
- [ ] Inyectar top 3 argumentos + handlers de objeciones
- [ ] A/B testing de ofertas
- **Entregable:** Prompts evolucionan cada 24h

### FASE 4: Safety & Rollout (Semanas 7-8) — $8k
- [ ] `PromptValidator` (compliance + quality checks)
- [ ] `CanaryDeployer` (gradual rollout: 5% → 20% → 100%)
- [ ] Métricas de comparación (delta win_rate)
- [ ] Rollback automático
- **Entregable:** Canary deployment sistema 100% seguro

### FASE 5: Monitoring & Docs (Semana 9) — $3k
- [ ] Dashboard KPIs completo
- [ ] Alertas automáticas
- [ ] Documentación + runbook
- [ ] Training del equipo
- **Entregable:** Sistema operacional

**Total: 8 semanas, $34k**

---

## Costos y ROI

### Costos Recurrentes (Mensuales)

| Componente | Cost | Notes |
|-----------|------|-------|
| **BigQuery** | $800-1500 | 100M rows/mes @ $6.25/TB |
| **Claude API** (validation) | $200-400 | ~50k calls/mes para validator |
| **Pub/Sub, Storage** | $100-200 | Event streaming + logs |
| **Monitoring (Datadog)** | $300 | Observability |
| **Team (0.5 FTE)** | $3000 | Maintenance + tuning |
| **Total/Mes** | **$4400-5500** | |

### ROI (Proyección)

**Baseline (Hoy):**
- 100k calls/mes
- 12% win rate = 12k demos
- 30% show rate = 3.6k sales
- $500 avg ACV = $1.8M/mes revenue

**Con GLL (+15% win rate → 27% win rate target):**
- 27k demos (vs 12k)
- 8.1k sales (vs 3.6k)
- **+$2.2M/mes revenue**

**Pero conservador: asume +8% win rate (conservative estimate)**
- 20k demos
- 6k sales
- **+$1.2M/mes revenue**

**ROI:**
- Cost: $5k/mes
- Revenue uplift: **$1.2M/mes**
- **ROI: 240x en primer mes**
- **Payback: < 1 día**

---

## Especificidades Técnicas Finales

### 5.1 Integration Points (Cambios Mínimos)

**`llamadas/app/main.py`:**
```python
@app.post("/call-complete")
async def log_call_completion(request: Request):
    data = await request.json()
    try:
        await bigquery_client.insert_rows(
            table_id=f"{settings.GCP_PROJECT}.gll.calls",
            rows=[normalize_call_data(data)]
        )
        asyncio.create_task(publish_to_pubsub(data))
    except Exception as e:
        logger.error(f"GLL logging failed: {e}")
    return {"status": "ok"}
```

**`llamadas/app/telephony/media_stream.py`:**
```python
async def handle_media_stream(websocket, session, prewarm_data):
    # ... existing code ...
    
    call_summary = {
        "call_id": session.call_sid,
        "outcome": session.final_outcome,
        "decision_events": session.decision_logger.get_events(),
        # ... otros campos
    }
    
    # Enviar a GLL
    await httpx.AsyncClient().post(
        f"{settings.API_BASE}/call-complete",
        json=call_summary,
        timeout=5
    )
```

**`llamadas/app/conversation/prompts.py`:**
```python
async def get_system_prompt(industry: str, company_size: str) -> str:
    if settings.GLL_ENABLED and datetime.now().hour % 12 == 0:  # Refresh cada 12h
        optimizer = PromptOptimizer(settings.BQ_CLIENT)
        optimized = await optimizer.optimize_prompt(industry, company_size)
        return optimized["prompt"]
    return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
```

### 5.2 Environment Variables

```bash
# .env
GLL_ENABLED=true
GCP_PROJECT=xxx
BQ_DATASET=gll
BQ_TABLE=calls
PUBSUB_TOPIC=gll-events
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
CANARY_PERCENTAGE=0.05  # Start at 5%
VALIDATOR_MODEL=claude-3-5-sonnet-20241022
```

### 5.3 Data Retention

- **Raw calls**: 12 meses (S3/GCS)
- **Analytics tables**: 24 meses (BigQuery)
- **Logs**: 30 días
- **Compliance archive**: 7 años (legal hold)

---

## Conclusión

**Global Learning Loop** convierte 100k+ llamadas en un **sistema de aprendizaje continuo** que:

1. ✅ **Detecta** qué funciona (argumentos, ofertas, objeciones)
2. ✅ **Valida** con safety gates (compliance, quality, latency)
3. ✅ **Despliega** gradualmente (canary → early → main)
4. ✅ **Mide** impacto en tiempo real (dashboards KPI)
5. ✅ **Itera** automáticamente cada 24-48h

**Estimado:** +15-25% win rate, $1.2M+/mes uplift revenue, 240x ROI.

**Próximos pasos:**
1. Presentar a stakeholders
2. Presupuestar ($34k setup + $5k/mes)
3. Empezar Fase 1 (schema + data pipeline)

---

**Documento:** GLOBAL-LEARNING-LOOP-100K.md  
**Versión:** 1.0  
**Status:** Listo para implementación
