"""FastAPI routes for webhook handlers."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.observability.audit_logger import (
    AuditAction,
    get_audit_logger,
)
from .deal_activity import (
    DealActivityService,
    WebhookSignatureValidator,
    validate_payload,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Global service instances (initialized on startup)
_deal_activity_service: DealActivityService | None = None
_signature_validator: WebhookSignatureValidator | None = None


async def initialize_webhooks(db_client) -> None:
    """Initialize webhook services. Called on app startup.

    Args:
        db_client: Database client
    """
    global _deal_activity_service, _signature_validator

    # Initialize deal activity service
    _deal_activity_service = DealActivityService(
        db_client=db_client,
        kafka_bootstrap_servers=settings.kafka_bootstrap_servers,
        kafka_topic="deal-activities",
    )
    await _deal_activity_service.initialize()

    # Initialize signature validator
    _signature_validator = WebhookSignatureValidator(
        webhook_secret=settings.webhook_secret,
    )

    logger.info("Webhook services initialized")


async def shutdown_webhooks() -> None:
    """Shutdown webhook services. Called on app shutdown."""
    global _deal_activity_service

    if _deal_activity_service:
        await _deal_activity_service.shutdown()

    logger.info("Webhook services shutdown")


@router.post(
    "/deal-activity",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict[str, Any],
)
async def handle_deal_activity_webhook(request: Request) -> JSONResponse:
    """Handle incoming deal activity webhook.

    Endpoint: POST /webhooks/deal-activity
    Content-Type: application/json
    X-Webhook-Signature: <HMAC-SHA256 hex digest>

    Request body:
    {
        "deal_id": "string (required, max 255 chars)",
        "tipo": "CALL|EMAIL|DEMO (required)",
        "resultado": "SUCCESS|FAILED|PENDING|POSTPONED (required)",
        "resumen": "string (required, max 5000 chars)",
        "transcript": "string (optional, max 50000 chars)",
        "metadata": "object (optional)",
        "timestamp": "ISO 8601 (optional, defaults to now)"
    }

    Returns 202 Accepted:
    {
        "activity_id": "string",
        "deal_id": "string",
        "status": "accepted",
        "timestamp": "ISO 8601"
    }

    Returns 400 Bad Request if payload invalid
    Returns 401 Unauthorized if signature invalid
    Returns 500 Internal Server Error if database insert fails
    """
    if not _signature_validator or not _deal_activity_service:
        return JSONResponse(
            {"error": "Webhook service not initialized"},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        # Read raw body for signature validation
        raw_body = await request.body()

        # Validate signature
        signature = request.headers.get("X-Webhook-Signature", "")
        if not _signature_validator.validate(raw_body, signature):
            logger.warning(
                "Invalid webhook signature from %s",
                request.client.host if request.client else "unknown",
            )

            # Log access denial
            audit_logger = get_audit_logger()
            await audit_logger.log_access_control_event(
                user_id="webhook-system",
                action=AuditAction.ACCESS_DENIED,
                resource="webhooks/deal-activity",
                result=False,
                reason="Invalid signature",
            )

            return JSONResponse(
                {"error": "Unauthorized: invalid signature"},
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        # Parse JSON body
        try:
            body = await request.json()
        except Exception as exc:
            logger.error("Failed to parse JSON body: %s", exc)
            return JSONResponse(
                {"error": "Invalid JSON"},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Validate payload
        is_valid, error_msg, payload = validate_payload(body)
        if not is_valid:
            logger.warning("Invalid payload: %s", error_msg)
            return JSONResponse(
                {"error": error_msg},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Process activity
        result = await _deal_activity_service.process_activity(payload)

        # Log successful API call
        audit_logger = get_audit_logger()
        await audit_logger.log_api_call(
            user_id="webhook-system",
            api="webhooks",
            endpoint="deal-activity",
            method="POST",
            status_code=202,
            latency_ms=0,  # TODO: measure actual latency
            request_data=body,
            response_data=result,
        )

        return JSONResponse(result, status_code=status.HTTP_202_ACCEPTED)

    except Exception as exc:
        logger.error("Error processing deal activity webhook: %s", exc, exc_info=True)

        # Log error
        audit_logger = get_audit_logger()
        await audit_logger.log_api_call(
            user_id="webhook-system",
            api="webhooks",
            endpoint="deal-activity",
            method="POST",
            status_code=500,
            latency_ms=0,
            error=str(exc),
        )

        return JSONResponse(
            {"error": "Internal server error"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.get("/health")
async def webhook_health() -> JSONResponse:
    """Health check for webhook services.

    Returns:
    {
        "status": "ok",
        "deal_activity_service": bool,
        "signature_validator": bool
    }
    """
    return JSONResponse(
        {
            "status": "ok",
            "deal_activity_service": _deal_activity_service is not None,
            "signature_validator": _signature_validator is not None,
        }
    )
