"""Observability — log all agent decisions and model inferences for auditing and monitoring."""
import json
import logging
from datetime import datetime
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class AgentDecisionLog:
    """Log entry for agent decision."""
    software_id: str
    agent_type: str  # SDR|Closer|Recovery|FollowUp|Expansion

    prospect: Dict[str, Any]
    decision: str
    confidence: float  # 0-1
    reasoning: Optional[str] = None

    latency_ms: int = 0
    tokens_used: Optional[int] = None

    outcome: Optional[str] = None
    outcome_at: Optional[datetime] = None

    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> dict:
        d = asdict(self)
        d['timestamp'] = self.timestamp.isoformat()
        if self.outcome_at:
            d['outcome_at'] = self.outcome_at.isoformat()
        return d


@dataclass
class ModelInferenceLog:
    """Log entry for model inference."""
    software_id: str
    model_id: Optional[str]
    model_name: str

    input: Dict[str, Any]
    prediction: Dict[str, Any]
    confidence: float  # 0-1

    latency_ms: int
    tokens_used: Optional[int] = None

    actual_outcome: Optional[Dict[str, Any]] = None
    feedback_at: Optional[datetime] = None

    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> dict:
        d = asdict(self)
        d['timestamp'] = self.timestamp.isoformat()
        if self.feedback_at:
            d['feedback_at'] = self.feedback_at.isoformat()
        return d


class DecisionLogger:
    """Log agent decisions and model inferences."""

    def __init__(self, db_client=None, kafka_client=None):
        """
        Initialize decision logger.

        Args:
            db_client: database client for persistence
            kafka_client: Kafka client for event streaming
        """
        self.db_client = db_client
        self.kafka_client = kafka_client

    def log_agent_decision(self, log: AgentDecisionLog) -> None:
        """
        Log an agent decision.

        Writes to:
        1. Database (agent_decisions table)
        2. Kafka topic "agent-decisions" (event streaming)
        """
        try:
            log_dict = log.to_dict()

            # Persist to database if available
            if self.db_client:
                self.db_client.agent_decisions.insert_one(log_dict)

            # Stream to Kafka if available
            if self.kafka_client:
                self.kafka_client.send(
                    topic='agent-decisions',
                    value=json.dumps(log_dict),
                )

            logger.debug(f"Agent decision logged: {log.agent_type} -> {log.decision}")

        except Exception as e:
            logger.error(f"Error logging agent decision: {e}")

    def log_model_inference(self, log: ModelInferenceLog) -> None:
        """
        Log a model inference.

        Writes to:
        1. Database (model_inferences table)
        2. Kafka topic "model-predictions" (event streaming)
        """
        try:
            log_dict = log.to_dict()

            # Persist to database
            if self.db_client:
                self.db_client.model_inferences.insert_one(log_dict)

            # Stream to Kafka
            if self.kafka_client:
                self.kafka_client.send(
                    topic='model-predictions',
                    value=json.dumps(log_dict),
                )

            logger.debug(f"Model inference logged: {log.model_name} (conf={log.confidence:.2f})")

        except Exception as e:
            logger.error(f"Error logging model inference: {e}")

    def record_outcome(
        self,
        decision_id: str,
        outcome: str,
        actual_data: Optional[Dict] = None,
    ) -> None:
        """
        Record outcome of a decision (for feedback loop).

        Args:
            decision_id: ID of the decision
            outcome: outcome label (POSITIVE|NEGATIVE|NEUTRAL)
            actual_data: actual outcome data for model retraining
        """
        try:
            if self.db_client:
                self.db_client.agent_decisions.update_one(
                    {'_id': decision_id},
                    {
                        '$set': {
                            'outcome': outcome,
                            'outcome_at': datetime.now().isoformat(),
                        }
                    },
                )

            logger.debug(f"Outcome recorded for decision {decision_id}: {outcome}")

        except Exception as e:
            logger.error(f"Error recording outcome: {e}")


class ObservabilityMetrics:
    """Collect observability metrics."""

    def __init__(self):
        self.agent_decisions_count = 0
        self.model_inferences_count = 0
        self.total_latency_ms = 0

    def update(self, decision_log: Optional[AgentDecisionLog] = None, inference_log: Optional[ModelInferenceLog] = None):
        """Update metrics from logs."""
        if decision_log:
            self.agent_decisions_count += 1
            self.total_latency_ms += decision_log.latency_ms

        if inference_log:
            self.model_inferences_count += 1
            self.total_latency_ms += inference_log.latency_ms

    def get_metrics(self) -> Dict:
        """Return current metrics."""
        return {
            'agent_decisions_count': self.agent_decisions_count,
            'model_inferences_count': self.model_inferences_count,
            'total_latency_ms': self.total_latency_ms,
            'avg_latency_ms': (
                self.total_latency_ms / (self.agent_decisions_count + self.model_inferences_count)
                if (self.agent_decisions_count + self.model_inferences_count) > 0
                else 0
            ),
        }
