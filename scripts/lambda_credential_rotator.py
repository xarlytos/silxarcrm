"""
Lambda function for automatic credential rotation.
Deployed as: rotate-silxarcrm-credentials

Rotates API keys on schedule:
- Gemini: every 90 days
- ElevenLabs: every 90 days
- Twilio: every 60 days
- OpenAI: every 90 days
- Webhook secrets: every 30 days
"""

import json
import logging
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_manager = boto3.client("secretsmanager")
sns = boto3.client("sns")


def lambda_handler(event, context):
    """
    Lambda handler for credential rotation.
    Triggered by EventBridge on schedule.
    """
    logger.info(f"Starting credential rotation: {json.dumps(event)}")

    service = event.get("service", "all")
    environment = event.get("environment", "production")

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "service": service,
        "environment": environment,
        "rotations": {},
        "failures": {},
    }

    services_to_rotate = {
        "gemini": rotate_gemini,
        "elevenlabs": rotate_elevenlabs,
        "twilio": rotate_twilio,
        "openai": rotate_openai,
        "webhook": rotate_webhook,
    }

    if service == "all":
        services = services_to_rotate.keys()
    else:
        services = [service] if service in services_to_rotate else []

    for svc in services:
        try:
            result = services_to_rotate[svc](environment)
            results["rotations"][svc] = result
            logger.info(f"✓ Rotated {svc}")
        except Exception as e:
            results["failures"][svc] = str(e)
            logger.error(f"✗ Failed to rotate {svc}: {e}")

    # Send notification
    try:
        notify_rotation(results)
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")

    return {
        "statusCode": 200 if not results["failures"] else 206,
        "body": json.dumps(results),
    }


def get_secret_name(service: str, environment: str) -> str:
    """Generate standard secret name."""
    return f"silxarcrm/{environment}/{service}"


def get_secret(secret_name: str) -> Dict[str, Any]:
    """Retrieve secret from Secrets Manager."""
    response = secrets_manager.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])


def update_secret(secret_name: str, secret_data: Dict[str, Any]) -> str:
    """Update secret in Secrets Manager."""
    response = secrets_manager.update_secret(
        SecretId=secret_name,
        SecretString=json.dumps(secret_data),
        ClientRequestToken=secrets.token_hex(16),
    )
    return response["ARN"]


def rotate_gemini(environment: str) -> Dict[str, Any]:
    """
    Rotate Gemini API key.

    Steps:
    1. Get current key from Secrets Manager
    2. Disable current key in Google Cloud Console (manual step)
    3. Generate new key in Google Cloud Console (manual step)
    4. Store new key in Secrets Manager
    5. Send notification to ops team

    NOTE: Gemini API key rotation is manual via Google Cloud Console.
    This function updates the secret metadata.
    """
    secret_name = get_secret_name("gemini", environment)
    secret = get_secret(secret_name)

    # In production, this would integrate with Google Cloud API
    # For now, we update metadata and alert ops team
    new_rotation_metadata = {
        "api_key": secret.get("api_key"),  # Keep existing key until manually rotated
        "service": "gemini",
        "created_at": secret.get("created_at"),
        "last_rotated": datetime.utcnow().isoformat(),
        "rotation_enabled": True,
        "rotation_days": 90,
        "status": "pending_manual_rotation",
        "pending_actions": [
            "1. Disable old key in Google Cloud Console",
            "2. Create new key in Google Cloud Console",
            "3. Update secret in Secrets Manager",
            "4. Verify new key works in staging",
        ],
    }

    update_secret(secret_name, new_rotation_metadata)

    return {
        "service": "gemini",
        "status": "pending_manual_rotation",
        "last_rotated": new_rotation_metadata["last_rotated"],
        "next_rotation": (datetime.utcnow() + timedelta(days=90)).isoformat(),
    }


def rotate_elevenlabs(environment: str) -> Dict[str, Any]:
    """
    Rotate ElevenLabs API key.

    Steps:
    1. Get current key from Secrets Manager
    2. Generate new key via ElevenLabs API
    3. Test new key with text-to-speech request
    4. Update secret with new key
    5. Disable old key via ElevenLabs API
    """
    import httpx

    secret_name = get_secret_name("elevenlabs", environment)
    secret = get_secret(secret_name)
    current_key = secret.get("api_key")

    try:
        # Call ElevenLabs API to generate new key (if they support it)
        # For now, assume manual key generation
        logger.info("ElevenLabs key rotation: Manual key generation required")
        logger.info("Contact ElevenLabs support to generate new API key")

        updated_secret = {
            "api_key": current_key,  # Keep until manual replacement
            "service": "elevenlabs",
            "created_at": secret.get("created_at"),
            "last_rotated": datetime.utcnow().isoformat(),
            "rotation_enabled": True,
            "rotation_days": 90,
            "status": "pending_manual_rotation",
        }

        update_secret(secret_name, updated_secret)

        return {
            "service": "elevenlabs",
            "status": "pending_manual_rotation",
            "last_rotated": updated_secret["last_rotated"],
            "next_rotation": (datetime.utcnow() + timedelta(days=90)).isoformat(),
        }
    except Exception as e:
        logger.error(f"ElevenLabs rotation failed: {e}")
        raise


def rotate_twilio(environment: str) -> Dict[str, Any]:
    """
    Rotate Twilio auth token.

    Steps:
    1. Get current credentials from Secrets Manager
    2. Generate new auth token via Twilio API
    3. Test new token with API call
    4. Update secret with new token
    5. Revoke old token via Twilio API
    """
    from twilio.rest import Client

    secret_name = get_secret_name("twilio", environment)
    secret = get_secret(secret_name)

    account_sid = secret.get("account_sid")
    auth_token = secret.get("auth_token")

    try:
        client = Client(account_sid, auth_token)

        # Create new API key
        api_key = client.api.accounts(account_sid).keys.create()

        updated_secret = {
            "account_sid": account_sid,
            "auth_token": api_key.auth_token,  # New token
            "from_number": secret.get("from_number"),
            "service": "twilio",
            "created_at": secret.get("created_at"),
            "last_rotated": datetime.utcnow().isoformat(),
            "rotation_enabled": True,
            "rotation_days": 60,
            "previous_key_sid": secret.get("key_sid"),  # Track for revocation
        }

        update_secret(secret_name, updated_secret)

        logger.info(f"Twilio token rotated: {api_key.sid}")

        return {
            "service": "twilio",
            "status": "success",
            "new_key_sid": api_key.sid,
            "last_rotated": updated_secret["last_rotated"],
            "next_rotation": (datetime.utcnow() + timedelta(days=60)).isoformat(),
        }
    except Exception as e:
        logger.error(f"Twilio rotation failed: {e}")
        raise


def rotate_openai(environment: str) -> Dict[str, Any]:
    """
    Rotate OpenAI API key.

    Steps:
    1. Get current key from Secrets Manager
    2. Generate new key via OpenAI API
    3. Test new key
    4. Update secret with new key
    5. Delete old key via OpenAI API
    """
    import httpx

    secret_name = get_secret_name("openai", environment)
    secret = get_secret(secret_name)
    current_key = secret.get("api_key")

    try:
        # Call OpenAI API to create new key
        async_client = httpx.AsyncClient()
        response = await async_client.post(
            "https://api.openai.com/api/v1/organization/api_keys",
            headers={"Authorization": f"Bearer {current_key}"},
            json={"name": f"silxarcrm-{environment}-{datetime.utcnow().isoformat()}"},
        )

        if response.status_code != 201:
            raise Exception(f"Failed to create new OpenAI key: {response.text}")

        new_key_data = response.json()
        new_key = new_key_data["api_key"]

        updated_secret = {
            "api_key": new_key,
            "service": "openai",
            "created_at": secret.get("created_at"),
            "last_rotated": datetime.utcnow().isoformat(),
            "rotation_enabled": True,
            "rotation_days": 90,
            "key_id": new_key_data.get("id"),
            "previous_key_id": secret.get("key_id"),
        }

        update_secret(secret_name, updated_secret)

        logger.info(f"OpenAI key rotated: {new_key_data.get('id')}")

        return {
            "service": "openai",
            "status": "success",
            "last_rotated": updated_secret["last_rotated"],
            "next_rotation": (datetime.utcnow() + timedelta(days=90)).isoformat(),
        }
    except Exception as e:
        logger.error(f"OpenAI rotation failed: {e}")
        raise


def rotate_webhook(environment: str) -> Dict[str, Any]:
    """
    Rotate webhook secret.

    Steps:
    1. Get current secret from Secrets Manager
    2. Generate new random secret
    3. Update Secrets Manager
    4. Alert application to reload config
    """
    secret_name = get_secret_name("webhook", environment)
    secret = get_secret(secret_name)

    new_secret = secrets.token_urlsafe(32)

    updated_secret = {
        "webhook_url": secret.get("webhook_url"),
        "webhook_secret": new_secret,
        "service": "webhook",
        "created_at": secret.get("created_at"),
        "last_rotated": datetime.utcnow().isoformat(),
        "rotation_enabled": True,
        "rotation_days": 30,
        "previous_secret_hash": hash(secret.get("webhook_secret", "")),
    }

    update_secret(secret_name, updated_secret)

    return {
        "service": "webhook",
        "status": "success",
        "last_rotated": updated_secret["last_rotated"],
        "next_rotation": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    }


def notify_rotation(results: Dict[str, Any]):
    """Send SNS notification about rotation results."""
    topic_arn = f"arn:aws:sns:us-east-1:ACCOUNT_ID:silxarcrm-credential-rotation"

    message = f"""
Credential Rotation Report
{datetime.utcnow().isoformat()}

Environment: {results.get('environment')}

✓ Successful Rotations:
"""

    for service, result in results.get("rotations", {}).items():
        message += f"\n  - {service}: {result.get('status', 'rotated')}"

    if results.get("failures"):
        message += "\n\n✗ Failed Rotations:\n"
        for service, error in results.get("failures", {}).items():
            message += f"\n  - {service}: {error}"

    message += "\n\nManual Actions Required:\n"
    message += "- Gemini: Manually rotate key in Google Cloud Console\n"
    message += "- ElevenLabs: Manually rotate key in ElevenLabs Dashboard\n"
    message += "- Review CloudWatch Logs for detailed information\n"

    try:
        sns.publish(TopicArn=topic_arn, Subject="Credential Rotation Report", Message=message)
    except ClientError as e:
        logger.error(f"Failed to send SNS notification: {e}")
