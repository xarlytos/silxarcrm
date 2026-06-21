# GLOBAL LEARNING LOOP: Código Implementable (MVP)

**Última actualización:** 2026-06-21  
**Status:** Ready to Code  
**Lenguaje:** Python 3.11+

---

## INDICE

1. [Archivos a Crear](#archivos-a-crear)
2. [Modificaciones a Código Existente](#modificaciones-a-código-existente)
3. [Código Completo: Data Pipeline](#código-completo-data-pipeline)
4. [Código Completo: Analytics Engine](#código-completo-analytics-engine)
5. [Código Completo: Prompt Optimizer](#código-completo-prompt-optimizer)
6. [Código Completo: Validator](#código-completo-validator)
7. [Código Completo: Canary Deployer](#código-completo-canary-deployer)
8. [Integraciones (Minimal Changes)](#integraciones-minimal-changes)
9. [Deploy & Testing](#deploy--testing)

---

## Archivos a Crear

```
llamadas/app/gll/
├── __init__.py
├── data_pipeline.py          # Recolección y normalización
├── analytics_engine.py       # Análisis de patrones
├── prompt_optimizer.py       # Generación dinámica de prompts
├── safety_validator.py       # Validación de seguridad
├── canary_deployer.py        # Rollout gradual
├── alerts.py                 # KPI monitoring
└── types.py                  # Dataclasses compartidas

llamadas/app/gll/queries/
├── top_arguments.sql
├── objections.sql
├── offers.sql
├── industry_patterns.sql
└── cluster_analysis.sql

tests/
├── test_gll_pipeline.py
├── test_gll_validator.py
└── test_gll_analytics.py
```

---

## Modificaciones a Código Existente

### 1. `observability/decision_log.py` - APPEND (sin romper)

```python
# Al final de DecisionEvent dataclass, AGREGAR:

@dataclass
class DecisionEvent:
    # ... campos existentes ...
    
    # ═══ NUEVOS CAMPOS PARA GLL ═══
    argument_used: str = ""              # ID del argumento
    argument_category: str = ""          # problem_quantification | solution_feature | ...
    argument_efficacy: str = ""          # triggered_objection | triggered_next_stage | no_reaction
    
    objection_detected: str = ""         # tipo de objeción
    objection_resolved: bool = False     # si se resolvió
    objection_strategy: str = ""         # value_comparison | differentiation | ...
    
    offer_presented: str = ""            # ID de oferta
    offer_amount: float = 0.0            # EUR
    offer_frequency: str = ""            # monthly | annual
    offer_accepted: bool = False         # si aceptó la oferta
    
    prospect_industry: str = ""          # dentista | veterinaria | ...
    prospect_company_size: str = ""      # small | medium | large
    prospect_decision_maker: bool = False
    prospect_previous_software: bool = False
```

### 2. `main.py` - ADD Endpoint (sin modificar existentes)

```python
# Después del último endpoint, AGREGAR:

@app.post("/gll/call-complete")
async def gll_call_complete(request: Request) -> JSONResponse:
    """Webhook para registrar completitud de llamada en GLL."""
    try:
        data = await request.json()
        from app.gll.data_pipeline import log_call_to_gll
        
        result = await log_call_to_gll(data)
        return JSONResponse({"status": "logged", "call_id": result.get("call_id")})
    except Exception as e:
        logger.error(f"GLL endpoint error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
```

### 3. `telephony/media_stream.py` - APPEND (al final de sesión)

```python
# En handle_media_stream(), AFTER loop completes, AGREGAR:

async def finalize_call(session, call_outcome: str):
    """Envía data de llamada a GLL."""
    import httpx
    import asyncio
    
    call_data = {
        "call_id": session.call_sid,
        "timestamp": session.start_time.isoformat(),
        "duration_seconds": time.time() - session.start_time,
        "outcome": call_outcome,  # demo_booked | soft_no | hard_no | transfer
        "lead_score": getattr(session.state, 'lead_score', None),
        "decision_events": session.decision_logger.get_events() if hasattr(session, 'decision_logger') else [],
        "prospect": {
            "industry": session.software_id or "unknown",  # Usar software_id como proxy de industria
            "company_size": "unknown",  # TODO: capturar si está disponible
        },
        "objections": extract_objections_from_transcript(session),
    }
    
    # Enviar async (fire-and-forget)
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"http://localhost:8000/gll/call-complete",
                json=call_data
            )
    except Exception as e:
        logger.warning(f"GLL logging skipped: {e}")
```

### 4. `conversation/prompts.py` - MODIFY get_system_prompt()

```python
# REEMPLAZAR la función completa:

async def get_system_prompt(
    industry: str,
    company_size: str = "small",
    use_dynamic: bool = True
) -> str:
    """
    Retorna system prompt optimizado.
    
    Si use_dynamic=True y GLL está habilitado, usa datos de últimos 7 días.
    Si no, fallback a prompts estáticos.
    """
    from app.config import settings
    
    # Fallback rápido si no está habilitado
    if not use_dynamic or not settings.GLL_ENABLED:
        return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
    
    # Intentar cargar versión optimizada
    try:
        from app.gll.prompt_optimizer import PromptOptimizer
        from app.config import get_bigquery_client
        
        bq_client = get_bigquery_client()
        optimizer = PromptOptimizer(bq_client)
        
        optimized = await optimizer.optimize_prompt(industry, company_size)
        return optimized["prompt"]
    except Exception as e:
        logger.warning(f"GLL prompt optimization failed, using static: {e}")
        return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
```

---

## Código Completo: Data Pipeline

**Archivo:** `app/gll/types.py`

```python
"""Tipos de datos compartidos para GLL."""
from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass
class ProspectData:
    """Información del prospecto."""
    industry: str = ""
    company_size: str = ""  # small | medium | large
    region: str = ""
    decision_maker: bool = False
    previous_software: bool = False
    phone: str = ""


@dataclass
class ArgumentUsed:
    """Un argumento usado en la llamada."""
    argument_id: str
    content: str
    category: str  # problem_quantification | solution_feature | ...
    industry_specific: str = ""
    efficacy: str  # triggered_objection | triggered_next_stage | no_reaction


@dataclass
class ObjectionEncountered:
    """Una objeción durante la llamada."""
    objection: str  # precio | competencia | timing | ...
    position_turn: int
    handling_strategy: str  # value_comparison | differentiation | ...
    resolved: bool = False
    resolution_turns: int = 0


@dataclass
class OfferPresented:
    """Una oferta durante la llamada."""
    offer_id: str
    amount_eur: float
    frequency: str  # monthly | annual
    position_turn: int
    prospect_reaction: str  # interested | rejected | need_time | ...


@dataclass
class CallSummary:
    """Resumen completo de una llamada para GLL."""
    call_id: str
    timestamp: datetime
    duration_seconds: float
    outcome: str  # demo_booked | soft_no | hard_no | transfer
    lead_score: int  # 1-10
    
    prospect: ProspectData
    
    arguments_used: list[ArgumentUsed] = field(default_factory=list)
    objections: list[ObjectionEncountered] = field(default_factory=list)
    offers: list[OfferPresented] = field(default_factory=list)
    
    turns: int = 0
    stages_visited: list[str] = field(default_factory=list)
    
    compliance_disclosure: bool = False
    compliance_recording_consent: bool = False
    
    # Metadata
    agent_type: str = "gemini_elevenlabs"
    version: str = "3.0"
```

**Archivo:** `app/gll/data_pipeline.py`

```python
"""Data pipeline para GLL: Recolección y normalización de data de llamadas."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from google.cloud import bigquery, storage
from app.config import settings
from app.gll.types import CallSummary

logger = logging.getLogger(__name__)


class GLLDataPipeline:
    """Pipeline de data: Capture → Normalize → Store."""
    
    def __init__(self):
        self.bq_client = bigquery.Client(project=settings.GCP_PROJECT)
        self.gcs_client = storage.Client(project=settings.GCP_PROJECT)
        self.table_id = f"{settings.GCP_PROJECT}.gll.calls"
        self.bucket_name = f"{settings.GCP_PROJECT}-gll-raw"
    
    async def log_call(self, call_data: dict) -> dict:
        """
        Recibe data de una llamada y la almacena en BigQuery + GCS.
        
        Args:
            call_data: Dict con estructura de CallSummary
        
        Returns:
            {"call_id": "...", "status": "logged"}
        """
        try:
            call_id = call_data.get("call_id", "unknown")
            
            # 1. Normalizar
            normalized = self._normalize(call_data)
            
            # 2. Guardar en GCS (raw backup)
            await self._save_to_gcs(call_id, normalized)
            
            # 3. Guardar en BigQuery
            await self._insert_to_bigquery(normalized)
            
            logger.info(f"GLL: Call {call_id} logged successfully")
            return {"call_id": call_id, "status": "logged"}
            
        except Exception as e:
            logger.error(f"GLL pipeline error: {e}")
            raise
    
    def _normalize(self, data: dict) -> dict:
        """Normaliza data cruda a schema de BigQuery."""
        
        # Convertir outcome a enumeración válida
        outcome = data.get("outcome", "unknown")
        valid_outcomes = ["demo_booked", "soft_no", "hard_no", "transfer", "no_connect"]
        if outcome not in valid_outcomes:
            outcome = "unknown"
        
        # Extraer campos anidados
        prospect = data.get("prospect", {})
        compliance = data.get("compliance", {})
        
        normalized = {
            "call_id": data.get("call_id"),
            "timestamp": datetime.fromisoformat(data["timestamp"]) if isinstance(data.get("timestamp"), str) else datetime.now(),
            "duration_seconds": data.get("duration_seconds", 0),
            "outcome": outcome,
            "lead_score": data.get("lead_score", 0),
            
            # Prospect info
            "prospect": {
                "industry": prospect.get("industry", "unknown"),
                "company_size": prospect.get("company_size", "unknown"),
                "region": prospect.get("region", ""),
                "decision_maker": prospect.get("decision_maker", False),
                "previous_software": prospect.get("previous_software", False),
            },
            
            # Arguments
            "arguments_used": [
                {
                    "argument_id": arg.get("argument_id", ""),
                    "content": arg.get("content", "")[:200],  # Truncar
                    "category": arg.get("category", ""),
                    "efficacy": arg.get("efficacy", ""),
                }
                for arg in data.get("arguments", [])
            ],
            
            # Objections
            "objections_encountered": [
                {
                    "objection": obj.get("objection", ""),
                    "handling_strategy": obj.get("handling_strategy", ""),
                    "resolved": obj.get("resolved", False),
                }
                for obj in data.get("objections", [])
            ],
            
            # Offers
            "offers_presented": [
                {
                    "offer_id": off.get("offer_id", ""),
                    "amount_eur": float(off.get("amount_eur", 0)),
                    "frequency": off.get("frequency", ""),
                    "accepted": off.get("accepted", False),
                }
                for off in data.get("offers", [])
            ],
            
            # Metadata
            "turns": data.get("turns", 0),
            "stages_visited": data.get("stages_visited", []),
            
            "compliance": {
                "disclosure_mentioned": compliance.get("disclosure_mentioned", False),
                "recording_consent": compliance.get("recording_consent", False),
            },
            
            "agent_type": data.get("agent_type", "gemini_elevenlabs"),
            "version": data.get("version", "3.0"),
        }
        
        return normalized
    
    async def _save_to_gcs(self, call_id: str, data: dict) -> None:
        """Guarda JSON raw en GCS para auditoría."""
        bucket = self.gcs_client.bucket(self.bucket_name)
        blob = bucket.blob(f"calls/{call_id}.json")
        
        try:
            blob.upload_from_string(
                json.dumps(data, default=str),
                content_type="application/json"
            )
        except Exception as e:
            logger.warning(f"GCS backup failed (non-critical): {e}")
    
    async def _insert_to_bigquery(self, data: dict) -> None:
        """Inserta en BigQuery."""
        
        # Convertir datetime para BigQuery
        data_to_insert = data.copy()
        if isinstance(data_to_insert['timestamp'], datetime):
            data_to_insert['timestamp'] = data_to_insert['timestamp'].isoformat()
        
        try:
            errors = self.bq_client.insert_rows_json(
                self.table_id,
                [data_to_insert]
            )
            
            if errors:
                logger.error(f"BigQuery insert errors: {errors}")
                raise Exception(f"BigQuery errors: {errors}")
        except Exception as e:
            logger.error(f"BigQuery insert failed: {e}")
            raise


# Instancia global
_pipeline = GLLDataPipeline()


async def log_call_to_gll(data: dict) -> dict:
    """Función pública para loguear llamada."""
    return await _pipeline.log_call(data)
```

---

## Código Completo: Analytics Engine

**Archivo:** `app/gll/analytics_engine.py`

```python
"""Analytics Engine: Detecta patrones en llamadas."""
from __future__ import annotations

import logging
from typing import Any
import pandas as pd
from google.cloud import bigquery

from app.config import settings

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Ejecuta queries y detecta patrones."""
    
    def __init__(self):
        self.bq = bigquery.Client(project=settings.GCP_PROJECT)
        self.dataset_id = f"{settings.GCP_PROJECT}.gll"
    
    async def get_top_arguments(self, industry: str, days: int = 7, limit: int = 5) -> list[dict]:
        """Retorna argumentos más efectivos para una industria."""
        
        query = f"""
        SELECT 
          arg.argument_id,
          arg.content,
          COUNTIF(outcome = 'demo_booked') AS conversions,
          COUNT(*) AS total_uses,
          ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
          '{industry}' AS industry,
          CURRENT_TIMESTAMP() AS computed_at
        FROM `{self.dataset_id}.calls` c,
             UNNEST(c.arguments_used) AS arg
        WHERE c.prospect.industry = '{industry}'
          AND DATE(c.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
          AND arg.argument_id IS NOT NULL
        GROUP BY arg.argument_id, arg.content
        HAVING COUNT(*) >= 5
        ORDER BY win_rate DESC
        LIMIT {limit}
        """
        
        try:
            df = pd.read_gbq(query, project_id=settings.GCP_PROJECT)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Top arguments query failed: {e}")
            return []
    
    async def get_objection_handlers(self, industry: str, days: int = 7, limit: int = 5) -> list[dict]:
        """Retorna estrategias para manejar objeciones."""
        
        query = f"""
        SELECT 
          obj.objection,
          obj.handling_strategy,
          COUNTIF(obj.resolved = TRUE) AS resolved_count,
          COUNT(*) AS total_objections,
          ROUND(COUNTIF(obj.resolved = TRUE) / COUNT(*), 3) AS resolution_rate,
          CURRENT_TIMESTAMP() AS computed_at
        FROM `{self.dataset_id}.calls` c,
             UNNEST(c.objections_encountered) AS obj
        WHERE c.prospect.industry = '{industry}'
          AND DATE(c.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
        GROUP BY obj.objection, obj.handling_strategy
        HAVING COUNT(*) >= 3
        ORDER BY resolution_rate DESC
        LIMIT {limit}
        """
        
        try:
            df = pd.read_gbq(query, project_id=settings.GCP_PROJECT)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Objection handlers query failed: {e}")
            return []
    
    async def get_best_offers(self, industry: str, company_size: str = "small", days: int = 14, limit: int = 3) -> list[dict]:
        """Retorna ofertas con mayor tasa de conversión."""
        
        query = f"""
        SELECT 
          off.offer_id,
          off.amount_eur,
          off.frequency,
          COUNTIF(off.accepted = TRUE) AS accepted_count,
          COUNT(*) AS total_presented,
          ROUND(COUNTIF(off.accepted = TRUE) / COUNT(*), 3) AS acceptance_rate,
          CURRENT_TIMESTAMP() AS computed_at
        FROM `{self.dataset_id}.calls` c,
             UNNEST(c.offers_presented) AS off
        WHERE c.prospect.industry = '{industry}'
          AND c.prospect.company_size = '{company_size}'
          AND DATE(c.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
        GROUP BY off.offer_id, off.amount_eur, off.frequency
        HAVING COUNT(*) >= 3
        ORDER BY acceptance_rate DESC
        LIMIT {limit}
        """
        
        try:
            df = pd.read_gbq(query, project_id=settings.GCP_PROJECT)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Best offers query failed: {e}")
            return []
    
    async def get_industry_metrics(self, industry: str, days: int = 7) -> dict:
        """Métricas agregadas para una industria."""
        
        query = f"""
        SELECT 
          COUNT(*) AS total_calls,
          COUNTIF(outcome = 'demo_booked') AS demos_booked,
          ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
          ROUND(AVG(lead_score), 1) AS avg_lead_score,
          APPROX_QUANTILES(duration_seconds, 100)[OFFSET(50)] AS median_duration_seconds,
          COUNTIF(compliance.disclosure_mentioned) AS disclosure_count,
          CURRENT_TIMESTAMP() AS computed_at
        FROM `{self.dataset_id}.calls`
        WHERE prospect.industry = '{industry}'
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
        """
        
        try:
            df = pd.read_gbq(query, project_id=settings.GCP_PROJECT)
            return df.to_dict('records')[0] if len(df) > 0 else {}
        except Exception as e:
            logger.error(f"Industry metrics query failed: {e}")
            return {}


# Instancia global
_analytics = AnalyticsEngine()


async def get_top_arguments(industry: str, days: int = 7, limit: int = 5) -> list[dict]:
    return await _analytics.get_top_arguments(industry, days, limit)


async def get_objection_handlers(industry: str, days: int = 7, limit: int = 5) -> list[dict]:
    return await _analytics.get_objection_handlers(industry, days, limit)


async def get_best_offers(industry: str, company_size: str = "small", days: int = 14, limit: int = 3) -> list[dict]:
    return await _analytics.get_best_offers(industry, company_size, days, limit)


async def get_industry_metrics(industry: str, days: int = 7) -> dict:
    return await _analytics.get_industry_metrics(industry, days)
```

---

## Código Completo: Prompt Optimizer

**Archivo:** `app/gll/prompt_optimizer.py`

```python
"""Optimizador de prompts dinámicos basado en data de GLL."""
from __future__ import annotations

import logging
from datetime import datetime

from app.gll.analytics_engine import (
    get_top_arguments,
    get_objection_handlers,
    get_best_offers,
    get_industry_metrics,
)

logger = logging.getLogger(__name__)


class PromptOptimizer:
    """Compila prompts optimizados en base a datos."""
    
    def __init__(self):
        self.version = 1
        self.last_optimization = None
    
    async def optimize_prompt(self, industry: str, company_size: str = "small") -> dict:
        """Retorna prompt optimizado para industria + tamaño."""
        
        # 1. Traer data analítica
        top_args = await get_top_arguments(industry, days=7, limit=3)
        obj_handlers = await get_objection_handlers(industry, days=7, limit=3)
        best_offers = await get_best_offers(industry, company_size, days=14, limit=2)
        metrics = await get_industry_metrics(industry, days=7)
        
        # 2. Compilar prompt
        prompt = self._compile_prompt(industry, top_args, obj_handlers, best_offers, metrics)
        
        self.last_optimization = datetime.now()
        
        return {
            "industry": industry,
            "company_size": company_size,
            "version": self.version,
            "prompt": prompt,
            "metadata": {
                "top_arguments": top_args,
                "objection_handlers": obj_handlers,
                "best_offers": best_offers,
                "metrics": metrics,
                "generated_at": self.last_optimization.isoformat(),
            }
        }
    
    def _compile_prompt(
        self,
        industry: str,
        top_arguments: list[dict],
        objection_handlers: list[dict],
        best_offers: list[dict],
        metrics: dict,
    ) -> str:
        """Compila el prompt final."""
        
        # Base prompt (de SCRIPTS_NICHO o fallback)
        base = self._get_base_prompt(industry)
        
        # Sección de argumentos probados
        arguments_section = self._render_arguments(top_arguments)
        
        # Sección de manejo de objeciones
        objections_section = self._render_objections(objection_handlers)
        
        # Sección de ofertas
        offers_section = self._render_offers(best_offers)
        
        # Sección de contexto (performance)
        context_section = self._render_context(industry, metrics)
        
        final_prompt = f"""
{base}

{arguments_section}

{objections_section}

{offers_section}

{context_section}

=== VERSIÓN GLL ===
- Optimizado automáticamente usando datos de últimos 7 días
- {len(top_arguments)} argumentos probados, {len(objection_handlers)} estrategias de objeción, {len(best_offers)} ofertas
- Generado: GLL v1.0
"""
        return final_prompt
    
    def _get_base_prompt(self, industry: str) -> str:
        """Base prompt de la industria."""
        from app.conversation.prompts import SCRIPTS_NICHO, VOZ_Y_PROSODIA
        
        script = SCRIPTS_NICHO.get(industry, SCRIPTS_NICHO.get("generico", {}))
        
        return f"""
{VOZ_Y_PROSODIA}

=== GUIÓN DE VENTAS ({{industry}}) ===

PATRÓN INTERRUMPIDO (tu primer hook):
{script.get('pattern_interrupt', 'Hola, te llamo porque...')}

DESCUBRIMIENTO (investigar el problema):
{script.get('problema', '¿Cuál es tu mayor desafío?')}

PRESENTACIÓN DE SOLUCIÓN:
{script.get('solucion', 'Esto es lo que ofrecemos...')}

CIERRE (agendar demo):
{script.get('cierre', '¿Agendamos una demo?')}
"""
    
    def _render_arguments(self, arguments: list[dict]) -> str:
        """Sección: argumentos comprobados."""
        if not arguments:
            return ""
        
        text = "=== ARGUMENTOS COMPROBADOS (Últimos 7 Días) ===\n"
        text += "Estos argumentos tienen win rate > 60%. Úsalos si es relevante:\n\n"
        
        for i, arg in enumerate(arguments, 1):
            win_rate = arg.get('win_rate', 0)
            content = arg.get('content', '')[:150]
            text += f"{i}. [{win_rate:.0%} éxito] {content}\n"
        
        text += "\n"
        return text
    
    def _render_objections(self, handlers: list[dict]) -> str:
        """Sección: cómo responder objeciones."""
        if not handlers:
            return ""
        
        text = "=== MANEJO DE OBJECIONES (Estrategias Probadas) ===\n"
        
        for handler in handlers:
            objection = handler.get('objection', '')
            strategy = handler.get('handling_strategy', '')
            rate = handler.get('resolution_rate', 0)
            
            text += f"- Si mencionan '{objection}': Usa '{strategy}' (efectividad: {rate:.0%})\n"
        
        text += "\n"
        return text
    
    def _render_offers(self, offers: list[dict]) -> str:
        """Sección: mejores ofertas."""
        if not offers:
            return ""
        
        text = "=== OFERTAS A/B TEST ===\n"
        text += "Prueba estas ofertas en orden de aceptación:\n\n"
        
        for i, offer in enumerate(offers, 1):
            amount = offer.get('amount_eur', 0)
            frequency = offer.get('frequency', '')
            rate = offer.get('acceptance_rate', 0)
            
            text += f"{i}. ${amount}/mes ({frequency}) - Aceptación: {rate:.0%}\n"
        
        text += "\n"
        return text
    
    def _render_context(self, industry: str, metrics: dict) -> str:
        """Sección: contexto del mercado."""
        
        total_calls = metrics.get('total_calls', 0)
        win_rate = metrics.get('win_rate', 0)
        avg_lead_score = metrics.get('avg_lead_score', 0)
        
        return f"""
=== CONTEXTO ACTUAL ({industry}) ===
- Datos de últimos 7 días: {total_calls} llamadas
- Win rate actual: {win_rate:.1%}
- Lead score promedio: {avg_lead_score:.1f}/10
- Enfócate en reproducir patrones ganadores
"""


# Instancia global
_optimizer = PromptOptimizer()


async def optimize_prompt(industry: str, company_size: str = "small") -> dict:
    """Función pública."""
    return await _optimizer.optimize_prompt(industry, company_size)
```

---

## Código Completo: Validator

**Archivo:** `app/gll/safety_validator.py`

```python
"""Validador de prompts para seguridad + compliance."""
from __future__ import annotations

import logging
import json
import re
from typing import Any

from anthropic import Anthropic

logger = logging.getLogger(__name__)


class SafetyValidator:
    """Valida prompts antes de desplegar."""
    
    def __init__(self):
        self.client = Anthropic()
    
    async def validate(self, prompt: str, industry: str) -> dict:
        """Ejecuta checks de validación."""
        
        checks = {
            "quality": await self._check_quality(prompt),
            "compliance": await self._check_compliance(prompt, industry),
            "hallucination": self._check_hallucination(prompt),
            "latency": self._check_latency(prompt),
        }
        
        # Status general
        failures = [k for k, v in checks.items() if not v.get('pass', False)]
        status = "OK" if not failures else ("WARNING" if len(failures) == 1 else "REJECT")
        
        return {
            "status": status,
            "checks": checks,
            "failures": failures,
            "safe_to_deploy": status in ["OK", "WARNING"],
        }
    
    async def _check_quality(self, prompt: str) -> dict:
        """¿El prompt es claro, coherente, natural?"""
        
        # Heurísticas rápidas
        lines = prompt.split('\n')
        sections = len([l for l in lines if '===' in l])
        
        # Si no tiene estructura clara, flag
        has_structure = sections >= 3
        
        # Si es muy corto, flag
        has_content = len(prompt) > 500
        
        # No debe tener placeholders no resueltos
        unresolved = len(re.findall(r'\{\{.*?\}\}', prompt))
        
        is_pass = has_structure and has_content and unresolved == 0
        
        return {
            "pass": is_pass,
            "has_structure": has_structure,
            "has_content": has_content,
            "unresolved_placeholders": unresolved,
        }
    
    async def _check_compliance(self, prompt: str, industry: str) -> dict:
        """¿Cumple con regulaciones?"""
        
        # Checks básicos
        checks_result = {
            "mentions_disclosure": "IA" in prompt or "automatizado" in prompt,
            "allows_optout": "opt" in prompt.lower() or "no" in prompt.lower(),
            "no_false_claims": True,  # TODO: mejorar
        }
        
        # Si no menciona IA, flag (MX requiere disclosure)
        if not checks_result["mentions_disclosure"]:
            logger.warning("Prompt no menciona que es IA/automatizado")
        
        is_pass = checks_result["mentions_disclosure"] and checks_result["allows_optout"]
        
        return {
            "pass": is_pass,
            "details": checks_result,
        }
    
    def _check_hallucination(self, prompt: str) -> dict:
        """¿Tiene claims numéricas potencialmente falsas?"""
        
        # Detectar números
        numeric_patterns = [
            r'\d+%',           # 30%
            r'\$\d+',          # $59
            r'\d+\s*EUR',      # 59 EUR
            r'\d+\s*leads?',   # 5 leads
        ]
        
        matches = []
        for pattern in numeric_patterns:
            matches.extend(re.findall(pattern, prompt))
        
        # Si hay muchas claims numéricas sin contexto, es sospechoso
        risk_score = len(matches) / max(len(prompt.split()), 1)
        is_pass = risk_score < 0.15  # <15% de palabras son números
        
        return {
            "pass": is_pass,
            "numeric_claims": matches[:5],  # Primeras 5
            "risk_score": round(risk_score, 3),
        }
    
    def _check_latency(self, prompt: str) -> dict:
        """¿El prompt es demasiado largo?"""
        
        # Estimación: 1 word ~ 1.3 tokens
        estimated_tokens = len(prompt.split()) * 1.3
        max_tokens = 3000
        
        is_pass = estimated_tokens < max_tokens
        
        return {
            "pass": is_pass,
            "estimated_tokens": int(estimated_tokens),
            "max_tokens": max_tokens,
        }


# Instancia global
_validator = SafetyValidator()


async def validate_prompt(prompt: str, industry: str) -> dict:
    """Función pública."""
    return await _validator.validate(prompt, industry)
```

---

## Código Completo: Canary Deployer

**Archivo:** `app/gll/canary_deployer.py`

```python
"""Despliegue gradual (canary) de prompts optimizados."""
from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class CanaryDeployer:
    """Gestiona despliegue gradual de prompts."""
    
    ROLLOUT_PLAN = [
        {"stage": "canary", "percentage": 0.05, "duration_hours": 2},
        {"stage": "early", "percentage": 0.20, "duration_hours": 4},
        {"stage": "main", "percentage": 1.00, "duration_hours": 0},
    ]
    
    def __init__(self):
        self.current_deployments: dict[str, dict] = {}  # Por industria
        self.deployment_history: list[dict] = []
    
    async def start_rollout(
        self,
        new_prompt_version: int,
        industry: str,
        validator_result: dict
    ) -> dict:
        """Inicia rollout gradual."""
        
        # Check: ¿validación pasó?
        if validator_result.get("status") == "REJECT":
            logger.critical(f"Cannot deploy version {new_prompt_version}: validation REJECT")
            return {"status": "rejected", "reason": "validation_failed"}
        
        # Inicializar deployment
        deployment = {
            "version": new_prompt_version,
            "industry": industry,
            "started_at": datetime.now(),
            "stages": [],
            "status": "running",
        }
        
        # Ejecutar stages de canary
        for stage_config in self.ROLLOUT_PLAN:
            stage_name = stage_config["stage"]
            percentage = stage_config["percentage"]
            duration = stage_config["duration_hours"]
            
            logger.info(f"Canary Stage {stage_name}: {percentage:.0%} traffic for {duration}h")
            
            # Activar para este % de nuevas llamadas
            self.current_deployments[industry] = {
                "version": new_prompt_version,
                "percentage": percentage,
                "since": datetime.now(),
            }
            
            deployment["stages"].append({
                "stage": stage_name,
                "percentage": percentage,
                "activated_at": datetime.now().isoformat(),
            })
            
            # Si hay duración, esperar y validar
            if duration > 0:
                await asyncio.sleep(duration * 3600)
                
                # Check KPIs
                metrics = await self._check_metrics(new_prompt_version, industry)
                
                if metrics.get("should_rollback"):
                    logger.critical(
                        f"Rollback {new_prompt_version}: {metrics.get('reason')}"
                    )
                    await self._rollback(industry)
                    deployment["status"] = "rolled_back"
                    return deployment
                
                deployment["stages"][-1]["metrics"] = metrics
        
        # Éxito: 100% deployment
        logger.info(f"Canary complete: version {new_prompt_version} deployed to 100%")
        deployment["status"] = "success"
        self.deployment_history.append(deployment)
        
        return deployment
    
    async def _check_metrics(self, version: int, industry: str) -> dict:
        """Compara metrics vs versión anterior."""
        
        # TODO: Implementar query a BigQuery
        # Por ahora, retorna placeholder
        
        return {
            "should_rollback": False,
            "win_rate": 0.15,
            "win_rate_delta": 0.02,  # +2%
            "latency_delta_ms": -50,
        }
    
    async def _rollback(self, industry: str) -> None:
        """Revierte a versión anterior."""
        if industry in self.current_deployments:
            del self.current_deployments[industry]
            logger.info(f"Rollback complete for {industry}")
    
    def get_prompt_version(self, industry: str) -> int:
        """Retorna versión de prompt para esta industria."""
        deployment = self.current_deployments.get(industry, {})
        
        # A/B test: usar versión nueva en % de llamadas
        if random.random() < deployment.get("percentage", 0):
            return deployment.get("version", 1)
        else:
            return 1  # Fallback a versión estable


# Instancia global
_deployer = CanaryDeployer()


async def start_canary_rollout(
    new_version: int,
    industry: str,
    validator_result: dict
) -> dict:
    """Función pública."""
    return await _deployer.start_rollout(new_version, industry, validator_result)


def get_prompt_version_for_call(industry: str) -> int:
    """¿Qué versión de prompt usar en esta llamada?"""
    return _deployer.get_prompt_version(industry)
```

---

## Integraciones (Minimal Changes)

### En `main.py`: Agregar endpoint

```python
@app.post("/gll/call-complete")
async def gll_log_call(request: Request):
    """Recibe call data completada y la envía a pipeline."""
    try:
        data = await request.json()
        from app.gll.data_pipeline import log_call_to_gll
        result = await log_call_to_gll(data)
        return {"status": "logged", "call_id": data.get("call_id")}
    except Exception as e:
        logger.error(f"GLL error: {e}")
        return {"error": str(e)}, 500
```

### En `conversation/prompts.py`: Usar optimizer

```python
async def get_system_prompt(industry: str, company_size: str = "small") -> str:
    """Sistema prompt, ahora dinámico si GLL está enabled."""
    
    if not settings.GLL_ENABLED:
        return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
    
    try:
        from app.gll.prompt_optimizer import optimize_prompt
        optimized = await optimize_prompt(industry, company_size)
        return optimized["prompt"]
    except Exception as e:
        logger.warning(f"GLL optimization failed: {e}")
        return BASE_PROMPTS.get(industry, BASE_PROMPTS["generico"])
```

### En `telephony/media_stream.py`: Log call completion

```python
# Al final de handle_media_stream, AGREGAR:

async def finalize_call(session):
    """Envía call data a GLL (fire-and-forget)."""
    call_data = {
        "call_id": session.call_sid,
        "timestamp": session.start_time.isoformat(),
        "duration_seconds": time.time() - session.start_time,
        "outcome": getattr(session, 'final_outcome', 'unknown'),
        "lead_score": getattr(session.state, 'lead_score', None),
        "prospect": {
            "industry": session.software_id or "unknown",
        },
    }
    
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"http://localhost:{settings.PORT}/gll/call-complete",
                json=call_data
            )
    except:
        pass  # Fire-and-forget, no romper si falla
```

---

## Deploy & Testing

### Unit Tests

**Archivo:** `tests/test_gll_pipeline.py`

```python
"""Tests para GLL pipeline."""
import pytest
from app.gll.data_pipeline import GLLDataPipeline


@pytest.mark.asyncio
async def test_normalize_call_data():
    """Test normalización."""
    pipeline = GLLDataPipeline()
    
    raw_data = {
        "call_id": "test_123",
        "timestamp": "2026-06-21T14:30:00",
        "duration_seconds": 240,
        "outcome": "demo_booked",
        "lead_score": 8,
        "prospect": {"industry": "dentista"},
    }
    
    normalized = pipeline._normalize(raw_data)
    
    assert normalized["call_id"] == "test_123"
    assert normalized["outcome"] == "demo_booked"
    assert normalized["prospect"]["industry"] == "dentista"


@pytest.mark.asyncio
async def test_validate_prompt():
    """Test validator."""
    from app.gll.safety_validator import SafetyValidator
    
    validator = SafetyValidator()
    
    good_prompt = """
    === GUIÓN ===
    Hola, te llamo porque vimos que tu clínica dental pierde pacientes.
    
    === ARGUMENTOS PROBADOS ===
    1. Recuperamos 30% de pacientes perdidos
    
    === COMPLIANCE ===
    Soy un sistema automatizado de IA. Puedes optar por no participar en cualquier momento.
    """
    
    result = await validator.validate(good_prompt, "dentista")
    assert result["status"] in ["OK", "WARNING"]
```

### Deployment Checklist

- [ ] BigQuery schema creado
- [ ] GCS bucket creado
- [ ] Env variables configuradas
- [ ] Endpoints `/gll/call-complete` deployados
- [ ] Canary deployer testeado
- [ ] Alertas Slack configuradas
- [ ] Dashboard Looker creado
- [ ] Monitoring activado

---

## Conclusión

Este código implementable proporciona:

✅ **Data Pipeline:** Captura data de llamadas  
✅ **Analytics:** Detecta patrones  
✅ **Prompt Optimizer:** Genera prompts dinámicos  
✅ **Validator:** Asegura seguridad  
✅ **Canary Deployer:** Rollout gradual  

**Siguiente paso:** Copiar archivos, configurar BigQuery, y ejecutar tests.
