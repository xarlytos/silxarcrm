"""Pipeline Router - Intelligent intent detection & pipeline selection.

Routes user messages to the optimal AI pipeline based on intent analysis:
- Groq: Fast, simple queries (budget, timeline, demo logistics)
- Gemini: Complex reasoning (objections, negotiation, strategy)
- Fallback chain: Groq → Gemini if rate-limited

Config-driven behavior with comprehensive metrics tracking.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List, Tuple, Any

logger = logging.getLogger(__name__)


# ═══ ENUMS ═══

class Intent(str, Enum):
    """Detected user intent."""
    BUDGET_ASK = "budget_ask"  # presupuesto, dinero, precio
    OBJECTION = "objection"  # objeción, competencia, caro
    TIMELINE = "timeline"  # cuando, necesito, demo
    NEGOTIATION = "negotiation"  # descuento, oferta, promoción
    STRATEGY = "strategy"  # análisis, comparación, ROI
    UNKNOWN = "unknown"


class Pipeline(str, Enum):
    """Available AI pipelines."""
    GROQ = "groq"
    GEMINI = "gemini"
    ELEVENLABS = "elevenlabs"


class RoutingDecision(str, Enum):
    """Why a pipeline was selected."""
    INTENT_MATCH = "intent_match"  # Intent → Pipeline mapping matched
    TRAFFIC_ALLOCATION = "traffic_allocation"  # Groq traffic % bucket
    FALLBACK = "fallback"  # Groq rate-limited, fell back to Gemini
    DEFAULT = "default"  # Unknown intent, use default


# ═══ DATA MODELS ═══

@dataclass
class IntentMatch:
    """Result of intent detection."""
    intent: Intent
    confidence: float  # 0-1: how sure we are
    keywords_matched: List[str] = field(default_factory=list)
    message_excerpt: str = ""  # First 100 chars for logging


@dataclass
class RouteMetrics:
    """Metrics for a single routing decision."""
    timestamp: datetime
    user_message: str  # Truncated for PII safety
    detected_intent: Intent
    intent_confidence: float
    selected_pipeline: Pipeline
    routing_reason: RoutingDecision
    latency_ms: float  # Time to detect intent + select pipeline
    fallback_triggered: bool = False
    fallback_from: Optional[Pipeline] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dict for logging/storage."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "detected_intent": self.detected_intent.value,
            "intent_confidence": round(self.intent_confidence, 3),
            "selected_pipeline": self.selected_pipeline.value,
            "routing_reason": self.routing_reason.value,
            "latency_ms": round(self.latency_ms, 1),
            "fallback_triggered": self.fallback_triggered,
            "fallback_from": self.fallback_from.value if self.fallback_from else None,
        }


@dataclass
class RouterConfig:
    """Router configuration."""
    # Feature flags
    use_hybrid_routing: bool = True
    enable_metrics: bool = True

    # Traffic allocation (% of traffic to Groq; rest to Gemini if hybrid enabled)
    groq_traffic_percentage: int = 70  # 70% Groq, 30% Gemini

    # Fallback behavior
    fallback_to_gemini: bool = True  # If Groq rate-limited, try Gemini
    fallback_latency_threshold_ms: float = 500.0  # Alert if > 500ms

    # Intent detection thresholds
    min_intent_confidence: float = 0.6  # Below this → UNKNOWN
    keyword_confidence_boost: float = 0.15  # Add 15% if keyword match found

    # Metrics aggregation
    metrics_buffer_size: int = 1000  # Store last N metrics in memory
    enable_latency_alerts: bool = True


# ═══ INTENT DETECTION ═══

class IntentDetector:
    """Lightweight intent detection using keyword matching & patterns."""

    # Intent → keywords mapping (Spanish)
    INTENT_KEYWORDS = {
        Intent.BUDGET_ASK: {
            "keywords": ["presupuesto", "precio", "dinero", "coste", "costo", "tarifa", "cuanto cuesta", "cual es el precio"],
            "pattern": r"(presupuesto|precio|dinero|coste|costo|tarifa|cuanto\s+cuesta|cual\s+es\s+el\s+precio)",
        },
        Intent.OBJECTION: {
            "keywords": ["caro", "competencia", "competidor", "objecion", "objeción", "es que", "demasiado", "mucho", "alternativa"],
            "pattern": r"(caro|competencia|competidor|objecion|objeción|es\s+que|demasiado|mucho|alternativa)",
        },
        Intent.TIMELINE: {
            "keywords": ["cuando", "cuándo", "pronto", "urgente", "ahora", "necesito", "demo", "prueba", "test"],
            "pattern": r"(cuando|cuándo|pronto|urgente|ahora|necesito|demo|prueba|test|cuanto\s+tiempo)",
        },
        Intent.NEGOTIATION: {
            "keywords": ["descuento", "oferta", "promocion", "promoción", "negociar", "condiciones", "paquete", "bundle"],
            "pattern": r"(descuento|oferta|promocion|promoción|negociar|condiciones|paquete|bundle)",
        },
        Intent.STRATEGY: {
            "keywords": ["comparar", "análisis", "análisis", "roi", "retorno", "impacto", "ventaja", "diferencia"],
            "pattern": r"(comparar|análisis|análisis|roi|retorno|impacto|ventaja|diferencia)",
        },
    }

    def __init__(self, config: RouterConfig):
        self.config = config
        # Pre-compile regex patterns for efficiency
        self._compiled_patterns = {
            intent: re.compile(keywords_data["pattern"], re.IGNORECASE)
            for intent, keywords_data in self.INTENT_KEYWORDS.items()
        }

    async def detect(self, message: str) -> IntentMatch:
        """Detect intent from user message.

        Args:
            message: User message (typically 20-500 chars)

        Returns:
            IntentMatch with detected intent & confidence score
        """
        message_lower = message.lower().strip()

        # Try pattern matching against all intents
        best_intent = Intent.UNKNOWN
        best_confidence = 0.0
        best_keywords_matched = []

        for intent, pattern in self._compiled_patterns.items():
            match = pattern.search(message_lower)
            if match:
                # Keyword match found → confidence = 0.85 + boost
                confidence = 0.85 + self.config.keyword_confidence_boost
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_intent = intent
                    best_keywords_matched = [match.group(0)]

        # If no pattern matched, use baseline confidence
        if best_intent == Intent.UNKNOWN:
            best_confidence = 0.3  # Low confidence for unknown intents

        # Apply confidence threshold
        if best_confidence < self.config.min_intent_confidence:
            best_intent = Intent.UNKNOWN
            best_confidence = self.config.min_intent_confidence / 2

        return IntentMatch(
            intent=best_intent,
            confidence=min(best_confidence, 1.0),  # Clamp to [0, 1]
            keywords_matched=best_keywords_matched,
            message_excerpt=message_lower[:100] + "..." if len(message_lower) > 100 else message_lower,
        )


# ═══ PIPELINE SELECTION ═══

class PipelineSelector:
    """Selects optimal pipeline based on intent & config."""

    # Intent → Pipeline mapping
    INTENT_PIPELINE_MAP = {
        # Simple intents → Groq (fast)
        Intent.BUDGET_ASK: Pipeline.GROQ,
        Intent.TIMELINE: Pipeline.GROQ,
        # Complex intents → Gemini (reasoning)
        Intent.OBJECTION: Pipeline.GEMINI,
        Intent.NEGOTIATION: Pipeline.GEMINI,
        Intent.STRATEGY: Pipeline.GEMINI,
        # Unknown → Groq (safe default)
        Intent.UNKNOWN: Pipeline.GROQ,
    }

    def __init__(self, config: RouterConfig):
        self.config = config
        self._groq_traffic_counter = 0  # For traffic allocation
        self._groq_traffic_allocated = 0

    def select(
        self,
        intent: Intent,
        intent_confidence: float,
        user_id_hash: Optional[str] = None,
    ) -> Tuple[Pipeline, RoutingDecision]:
        """Select pipeline based on intent & traffic allocation.

        Args:
            intent: Detected user intent
            intent_confidence: Confidence score (0-1)
            user_id_hash: Optional hash of user ID for deterministic traffic allocation

        Returns:
            (Pipeline, RoutingDecision reason)
        """
        # Intent-based selection (if hybrid routing disabled)
        if not self.config.use_hybrid_routing:
            pipeline = self.INTENT_PIPELINE_MAP.get(intent, Pipeline.GROQ)
            return pipeline, RoutingDecision.INTENT_MATCH

        # Hybrid routing: use traffic allocation for simple intents
        if intent in (Intent.BUDGET_ASK, Intent.TIMELINE, Intent.UNKNOWN):
            # Use traffic percentage to decide Groq vs Gemini
            if self._should_use_groq(user_id_hash):
                return Pipeline.GROQ, RoutingDecision.TRAFFIC_ALLOCATION
            else:
                return Pipeline.GEMINI, RoutingDecision.TRAFFIC_ALLOCATION

        # Complex intents always go to Gemini (regardless of traffic %)
        pipeline = self.INTENT_PIPELINE_MAP.get(intent, Pipeline.GROQ)
        return pipeline, RoutingDecision.INTENT_MATCH

    def _should_use_groq(self, user_id_hash: Optional[str] = None) -> bool:
        """Determine if request should use Groq based on traffic allocation.

        Uses deterministic hashing if user_id provided, otherwise round-robin.
        """
        if user_id_hash:
            # Deterministic: same user always gets same pipeline in same bucket
            return int(user_id_hash, 16) % 100 < self.config.groq_traffic_percentage
        else:
            # Round-robin within current session
            should_use = self._groq_traffic_allocated < self.config.groq_traffic_percentage
            self._groq_traffic_counter += 1
            if self._groq_traffic_counter >= 100:
                self._groq_traffic_allocated = 0
                self._groq_traffic_counter = 0
            else:
                self._groq_traffic_allocated += 1
            return should_use


# ═══ MAIN ROUTER ═══

class PipelineRouter:
    """Main router: detects intent, selects pipeline, tracks metrics."""

    def __init__(self, config: Optional[RouterConfig] = None):
        self.config = config or RouterConfig()
        self.intent_detector = IntentDetector(self.config)
        self.pipeline_selector = PipelineSelector(self.config)

        # Metrics storage
        self.metrics_buffer: List[RouteMetrics] = []
        self._groq_rate_limited = False  # Track Groq rate-limit status
        self._gemini_rate_limited = False

        logger.info(
            f"PipelineRouter initialized: use_hybrid_routing={self.config.use_hybrid_routing}, "
            f"groq_traffic={self.config.groq_traffic_percentage}%"
        )

    async def route_to_pipeline(
        self,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Route user message to optimal pipeline.

        Args:
            user_message: The user's input message
            context: Optional context dict with keys:
                - user_id: for deterministic traffic allocation
                - groq_rate_limited: bool override
                - gemini_rate_limited: bool override

        Returns:
            Pipeline name (groq, gemini, or fallback)

        Raises:
            ValueError: if no pipeline available (all rate-limited)
        """
        context = context or {}
        start_time = time.time()

        # Detect intent
        intent_match = await self._detect_intent(user_message)

        # Select pipeline
        user_id_hash = context.get("user_id")
        if user_id_hash:
            user_id_hash = str(hash(user_id_hash))  # Normalize to int hash
        selected_pipeline, routing_reason = self.pipeline_selector.select(
            intent_match.intent,
            intent_match.confidence,
            user_id_hash,
        )

        # Handle rate-limiting with fallback
        override_groq_limited = context.get("groq_rate_limited", self._groq_rate_limited)
        override_gemini_limited = context.get("gemini_rate_limited", self._gemini_rate_limited)

        final_pipeline = selected_pipeline
        fallback_triggered = False
        fallback_from = None

        if selected_pipeline == Pipeline.GROQ and override_groq_limited:
            if self.config.fallback_to_gemini and not override_gemini_limited:
                logger.warning(f"Groq rate-limited, falling back to Gemini")
                final_pipeline = Pipeline.GEMINI
                routing_reason = RoutingDecision.FALLBACK
                fallback_triggered = True
                fallback_from = Pipeline.GROQ
            else:
                raise ValueError("Groq rate-limited and fallback disabled or Gemini also limited")

        elif selected_pipeline == Pipeline.GEMINI and override_gemini_limited:
            if self.config.fallback_to_gemini and not override_groq_limited:
                logger.warning("Gemini rate-limited, falling back to Groq")
                final_pipeline = Pipeline.GROQ
                routing_reason = RoutingDecision.FALLBACK
                fallback_triggered = True
                fallback_from = Pipeline.GEMINI
            else:
                raise ValueError("Gemini rate-limited and fallback disabled or Groq also limited")

        # Record metrics
        latency_ms = (time.time() - start_time) * 1000
        if self.config.enable_metrics:
            metrics = RouteMetrics(
                timestamp=datetime.now(),
                user_message=user_message[:50],  # Truncate for PII safety
                detected_intent=intent_match.intent,
                intent_confidence=intent_match.confidence,
                selected_pipeline=final_pipeline,
                routing_reason=routing_reason,
                latency_ms=latency_ms,
                fallback_triggered=fallback_triggered,
                fallback_from=fallback_from,
            )
            self._record_metric(metrics)

            # Log latency alert if exceeded threshold
            if (
                self.config.enable_latency_alerts
                and latency_ms > self.config.fallback_latency_threshold_ms
            ):
                logger.warning(
                    f"Router latency exceeded {self.config.fallback_latency_threshold_ms}ms: "
                    f"{latency_ms:.1f}ms (intent={intent_match.intent.value})"
                )

        logger.info(
            f"Routed to {final_pipeline.value}: intent={intent_match.intent.value} "
            f"(conf={intent_match.confidence:.2f}), reason={routing_reason.value}"
        )

        return final_pipeline.value

    async def _detect_intent(self, message: str) -> IntentMatch:
        """Detect intent from message. Lightweight, async for compatibility."""
        return self.intent_detector.detect(message)

    def _record_metric(self, metric: RouteMetrics) -> None:
        """Store metric in buffer, removing oldest if buffer full."""
        self.metrics_buffer.append(metric)
        if len(self.metrics_buffer) > self.config.metrics_buffer_size:
            self.metrics_buffer.pop(0)

    def get_metrics(
        self,
        limit: Optional[int] = None,
        intent_filter: Optional[Intent] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve stored metrics.

        Args:
            limit: Max number of metrics to return (None = all)
            intent_filter: Filter by specific intent

        Returns:
            List of metrics dicts
        """
        metrics = self.metrics_buffer
        if intent_filter:
            metrics = [m for m in metrics if m.detected_intent == intent_filter]
        if limit:
            metrics = metrics[-limit:]
        return [m.to_dict() for m in metrics]

    def get_stats(self) -> Dict[str, Any]:
        """Get high-level routing statistics.

        Returns:
            Stats dict with pipeline distribution, avg latency, etc.
        """
        if not self.metrics_buffer:
            return {"total_routes": 0}

        total = len(self.metrics_buffer)
        pipeline_counts = {}
        intent_counts = {}
        latencies = []
        fallback_count = 0

        for metric in self.metrics_buffer:
            pipeline = metric.selected_pipeline.value
            pipeline_counts[pipeline] = pipeline_counts.get(pipeline, 0) + 1

            intent = metric.detected_intent.value
            intent_counts[intent] = intent_counts.get(intent, 0) + 1

            latencies.append(metric.latency_ms)
            if metric.fallback_triggered:
                fallback_count += 1

        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        max_latency = max(latencies) if latencies else 0
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0

        return {
            "total_routes": total,
            "pipeline_distribution": {
                k: {"count": v, "percentage": round(v / total * 100, 1)}
                for k, v in pipeline_counts.items()
            },
            "intent_distribution": {
                k: {"count": v, "percentage": round(v / total * 100, 1)}
                for k, v in intent_counts.items()
            },
            "latency_stats_ms": {
                "avg": round(avg_latency, 1),
                "max": round(max_latency, 1),
                "p95": round(p95_latency, 1),
            },
            "fallback_count": fallback_count,
            "fallback_rate": round(fallback_count / total * 100, 1),
        }

    def set_rate_limit_status(self, pipeline: Pipeline, is_limited: bool) -> None:
        """Update rate-limit status for a pipeline (called by pipeline implementations)."""
        if pipeline == Pipeline.GROQ:
            self._groq_rate_limited = is_limited
        elif pipeline == Pipeline.GEMINI:
            self._gemini_rate_limited = is_limited
        logger.info(f"Rate-limit status: {pipeline.value} = {is_limited}")


# ═══ CONVENIENCE FUNCTIONS ═══

# Module-level singleton instance (optional, for simpler usage patterns)
_default_router: Optional[PipelineRouter] = None


def init_router(config: Optional[RouterConfig] = None) -> PipelineRouter:
    """Initialize module-level default router."""
    global _default_router
    _default_router = PipelineRouter(config)
    return _default_router


def get_router() -> PipelineRouter:
    """Get module-level default router (init_router must be called first)."""
    if _default_router is None:
        _default_router = PipelineRouter()
    return _default_router


__all__ = [
    "PipelineRouter",
    "Intent",
    "Pipeline",
    "RoutingDecision",
    "IntentMatch",
    "RouteMetrics",
    "RouterConfig",
    "IntentDetector",
    "PipelineSelector",
    "init_router",
    "get_router",
]
