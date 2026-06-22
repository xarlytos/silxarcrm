"""Webhook handler for deal activity ingestion.

Handles incoming deal activity events (calls, emails, demos) from external systems.
Validates signatures, persists to database, triggers probability recalculation,
and publishes to Kafka for downstream consumers.

Flow:
  1. Validate webhook signature (HMAC-SHA256)
  2. Insert deal_activity record into database
  3. Trigger deal probability recalculation
  4. Publish to Kafka topic "deal-activities"
  5. Return 202 Accepted
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Optional

try:
    from aiokafka import AIOKafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logger = logging.getLogger(__name__)


# ═══ ENUMS & DATA MODELS ═══

class ActivityType(str, Enum):
    """Deal activity types."""
    CALL = "CALL"
    EMAIL = "EMAIL"
    DEMO = "DEMO"


class ActivityResult(str, Enum):
    """Deal activity outcomes."""
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"
    POSTPONED = "POSTPONED"


@dataclass
class DealActivityPayload:
    """Validated webhook payload for deal activity."""
    deal_id: str
    tipo: ActivityType
    resultado: ActivityResult
    resumen: str
    transcript: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    timestamp: Optional[datetime] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for database insertion."""
        return {
            "deal_id": self.deal_id,
            "tipo": self.tipo.value,
            "resultado": self.resultado.value,
            "resumen": self.resumen,
            "transcript": self.transcript,
            "metadata": self.metadata or {},
            "timestamp": self.timestamp or datetime.utcnow(),
            "created_at": datetime.utcnow(),
        }


# ═══ SIGNATURE VALIDATION ═══

class WebhookSignatureValidator:
    """Validates incoming webhook signatures using HMAC-SHA256."""

    def __init__(self, webhook_secret: str):
        """Initialize validator with webhook secret.

        Args:
            webhook_secret: Secret key for HMAC validation
        """
        self.webhook_secret = webhook_secret

    def validate(
        self,
        body: str | bytes,
        signature: str,
    ) -> bool:
        """Validate webhook signature.

        Args:
            body: Raw request body (string or bytes)
            signature: X-Webhook-Signature header value

        Returns:
            True if signature is valid, False otherwise
        """
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured. Skipping signature validation.")
            return True

        # Normalize body to bytes
        if isinstance(body, str):
            body_bytes = body.encode('utf-8')
        else:
            body_bytes = body

        # Compute expected signature: HMAC-SHA256(secret, body)
        expected_signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            body_bytes,
            hashlib.sha256
        ).hexdigest()

        # Compare signatures (timing-safe comparison)
        return hmac.compare_digest(expected_signature, signature)


# ═══ DEAL ACTIVITY SERVICE ═══

class DealActivityService:
    """Service for processing deal activities."""

    def __init__(
        self,
        db_client,
        kafka_bootstrap_servers: str = "localhost:9092",
        kafka_topic: str = "deal-activities",
    ):
        """Initialize service.

        Args:
            db_client: Database client for persistence
            kafka_bootstrap_servers: Kafka brokers
            kafka_topic: Kafka topic for events
        """
        self.db = db_client
        self.kafka_bootstrap_servers = kafka_bootstrap_servers
        self.kafka_topic = kafka_topic
        self.producer: Optional[AIOKafkaProducer] = None

    async def initialize(self) -> None:
        """Initialize Kafka producer."""
        if not KAFKA_AVAILABLE:
            logger.warning("aiokafka not available. Events will not be published to Kafka.")
            return

        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            )
            await self.producer.start()
            logger.info(
                f"DealActivityService initialized: topic={self.kafka_topic}, "
                f"brokers={self.kafka_bootstrap_servers}"
            )
        except Exception as exc:
            logger.error(f"Failed to initialize Kafka producer: {exc}")

    async def shutdown(self) -> None:
        """Shutdown Kafka producer."""
        if self.producer:
            await self.producer.stop()
            logger.info("DealActivityService shutdown")

    async def process_activity(
        self,
        payload: DealActivityPayload,
    ) -> dict[str, Any]:
        """Process and ingest deal activity.

        Args:
            payload: Validated activity payload

        Returns:
            Dictionary with activity_id and status

        Raises:
            Exception: If database insertion fails
        """
        # Insert into deal_activities table
        activity_id = await self._insert_activity(payload)
        logger.info(f"Inserted deal activity {activity_id} for deal {payload.deal_id}")

        # Trigger probability recalculation (async, fire-and-forget)
        await self._trigger_probability_recalculation(payload.deal_id)

        # Publish to Kafka
        await self._publish_to_kafka(
            activity_id=activity_id,
            payload=payload,
        )

        return {
            "activity_id": activity_id,
            "deal_id": payload.deal_id,
            "status": "accepted",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _insert_activity(self, payload: DealActivityPayload) -> str:
        """Insert activity record into database.

        Args:
            payload: Activity payload

        Returns:
            Activity ID (UUID or database ID)

        Raises:
            Exception: If insertion fails
        """
        try:
            # TODO: Implement with actual database client (Prisma, SQLAlchemy, etc.)
            # For now, return a mock ID
            activity_data = payload.to_dict()

            # If using async database client:
            # activity = await self.db.deal_activities.create(activity_data)
            # return str(activity.id)

            # Mock implementation:
            import uuid
            activity_id = str(uuid.uuid4())
            logger.debug(f"Would insert activity: {activity_data}")
            return activity_id

        except Exception as exc:
            logger.error(f"Failed to insert deal activity: {exc}")
            raise

    async def _trigger_probability_recalculation(self, deal_id: str) -> None:
        """Trigger deal probability recalculation.

        Args:
            deal_id: Deal ID to recalculate
        """
        try:
            # TODO: Implement with actual deal engine
            # For example: await deal_engine.recalculate_probability(deal_id)

            logger.info(f"Triggered probability recalculation for deal {deal_id}")

        except Exception as exc:
            logger.error(f"Failed to recalculate probability for deal {deal_id}: {exc}")
            # Don't raise: probability recalculation failure shouldn't block webhook

    async def _publish_to_kafka(
        self,
        activity_id: str,
        payload: DealActivityPayload,
    ) -> None:
        """Publish activity to Kafka topic.

        Args:
            activity_id: Generated activity ID
            payload: Activity payload
        """
        if not self.producer:
            logger.debug("Kafka producer not available. Skipping publish.")
            return

        try:
            event = {
                "activity_id": activity_id,
                "deal_id": payload.deal_id,
                "tipo": payload.tipo.value,
                "resultado": payload.resultado.value,
                "resumen": payload.resumen,
                "transcript": payload.transcript,
                "metadata": payload.metadata or {},
                "timestamp": payload.timestamp.isoformat() if payload.timestamp else None,
                "published_at": datetime.utcnow().isoformat(),
            }

            # Partition by deal_id for ordering guarantees
            await self.producer.send_and_wait(
                self.kafka_topic,
                value=event,
                key=payload.deal_id.encode('utf-8'),
            )

            logger.info(f"Published deal activity {activity_id} to Kafka")

        except Exception as exc:
            logger.error(f"Failed to publish to Kafka: {exc}")
            # Don't raise: Kafka publish failure shouldn't block webhook


# ═══ PAYLOAD VALIDATION ═══

def validate_payload(body: dict[str, Any]) -> tuple[bool, Optional[str], Optional[DealActivityPayload]]:
    """Validate incoming webhook payload.

    Args:
        body: Request body dict

    Returns:
        Tuple of (is_valid, error_message, payload)
    """
    # Required fields
    required_fields = ["deal_id", "tipo", "resultado", "resumen"]
    for field in required_fields:
        if field not in body or not body[field]:
            return False, f"Missing required field: {field}", None

    # Validate deal_id
    deal_id = body.get("deal_id", "").strip()
    if not deal_id or len(deal_id) > 255:
        return False, "Invalid deal_id (max 255 chars)", None

    # Validate tipo
    try:
        tipo = ActivityType[body.get("tipo", "").upper()]
    except KeyError:
        valid_tipos = ", ".join([t.name for t in ActivityType])
        return False, f"Invalid tipo. Expected one of: {valid_tipos}", None

    # Validate resultado
    try:
        resultado = ActivityResult[body.get("resultado", "").upper()]
    except KeyError:
        valid_resultados = ", ".join([r.name for r in ActivityResult])
        return False, f"Invalid resultado. Expected one of: {valid_resultados}", None

    # Validate resumen
    resumen = body.get("resumen", "").strip()
    if not resumen or len(resumen) > 5000:
        return False, "Invalid resumen (max 5000 chars)", None

    # Optional fields
    transcript = body.get("transcript", "").strip() if body.get("transcript") else None
    if transcript and len(transcript) > 50000:
        return False, "transcript exceeds max length (50000 chars)", None

    metadata = body.get("metadata", {})
    if not isinstance(metadata, dict):
        return False, "metadata must be a dict", None

    # Optional timestamp
    timestamp = None
    if body.get("timestamp"):
        try:
            timestamp = datetime.fromisoformat(body["timestamp"])
        except (ValueError, TypeError):
            return False, "Invalid timestamp format (expected ISO 8601)", None

    payload = DealActivityPayload(
        deal_id=deal_id,
        tipo=tipo,
        resultado=resultado,
        resumen=resumen,
        transcript=transcript,
        metadata=metadata,
        timestamp=timestamp,
    )

    return True, None, payload
