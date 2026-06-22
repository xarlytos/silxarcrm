"""AWS Lambda function for automatic secret rotation.

Implements the rotation handler for AWS Secrets Manager rotation events.
Supports rotation for all credential types (API keys, database URLs, tokens).
"""
import json
import logging
import os
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

secretsmanager_client = boto3.client("secretsmanager")


class SecretRotationHandler:
    """Handles secret rotation for all credential types."""

    def __init__(self, service_client=None):
        """Initialize rotation handler.

        Args:
            service_client: Optional boto3 client for testing
        """
        self.secretsmanager_client = service_client or secretsmanager_client

    def get_secret_dict(self, secret_id: str, stage: str = "AWSCURRENT") -> dict:
        """Retrieve secret from Secrets Manager.

        Args:
            secret_id: Secret identifier
            stage: Stage label (AWSCURRENT, AWSPENDING, etc.)

        Returns:
            Secret as dictionary
        """
        try:
            response = self.secretsmanager_client.get_secret_value(
                SecretId=secret_id, VersionStage=stage
            )

            secret = response.get("SecretString")
            if not secret:
                raise ValueError(f"Secret {secret_id} does not contain SecretString")

            return json.loads(secret)

        except self.secretsmanager_client.exceptions.ResourceNotFoundException:
            logger.error(f"Secret {secret_id} not found")
            raise
        except json.JSONDecodeError:
            logger.error(f"Secret {secret_id} is not valid JSON")
            raise

    def put_secret_dict(self, secret_id: str, secret_dict: dict, client_request_token: str):
        """Store rotated secret in Secrets Manager.

        Args:
            secret_id: Secret identifier
            secret_dict: New secret value
            client_request_token: Request token for idempotency
        """
        self.secretsmanager_client.put_secret_value(
            SecretId=secret_id,
            ClientRequestToken=client_request_token,
            SecretString=json.dumps(secret_dict),
            VersionStages=["AWSPENDING"],
        )

    def finish_rotation(self, secret_id: str, client_request_token: str):
        """Mark rotation as complete.

        Args:
            secret_id: Secret identifier
            client_request_token: Request token
        """
        self.secretsmanager_client.update_secret_version_stage(
            SecretId=secret_id,
            VersionStage="AWSCURRENT",
            MoveToVersionId=client_request_token,
            RemoveFromVersionId=self.get_secret_version_id(secret_id),
        )

    def get_secret_version_id(self, secret_id: str) -> str:
        """Get current secret version ID.

        Args:
            secret_id: Secret identifier

        Returns:
            Version ID of current secret
        """
        response = self.secretsmanager_client.describe_secret(SecretId=secret_id)
        return response["VersionIdsToStages"].get("AWSCURRENT")[0]

    def rotate_api_key(self, secret_dict: dict, secret_name: str) -> dict:
        """Rotate API key type secret.

        Args:
            secret_dict: Current secret
            secret_name: Secret name (for routing)

        Returns:
            New secret with rotated key
        """
        # For API keys, generate new value
        # In production, integrate with the API provider (Gemini, ElevenLabs, Twilio)

        import secrets
        import string

        new_key = "".join(
            secrets.choice(string.ascii_letters + string.digits) for _ in range(32)
        )

        rotated = secret_dict.copy()
        rotated["api_key"] = new_key
        rotated["rotated_at"] = datetime.now().isoformat()

        logger.info(f"Rotated API key for {secret_name}")
        return rotated

    def rotate_database_url(self, secret_dict: dict) -> dict:
        """Rotate database credentials.

        Args:
            secret_dict: Current database secret with host, user, password

        Returns:
            New secret with rotated password
        """
        import secrets
        import string

        # Generate new password
        new_password = "".join(
            secrets.choice(string.ascii_letters + string.digits + "!@#$%^&*")
            for _ in range(24)
        )

        # Update secret with new password
        rotated = secret_dict.copy()
        rotated["password"] = new_password
        rotated["rotated_at"] = __import__("datetime").datetime.now().isoformat()

        logger.info("Rotated database password")
        return rotated

    def rotate_generic_secret(self, secret_dict: dict) -> dict:
        """Rotate generic secret by updating timestamp.

        Args:
            secret_dict: Current secret

        Returns:
            Updated secret with rotation metadata
        """
        rotated = secret_dict.copy()
        rotated["rotated_at"] = __import__("datetime").datetime.now().isoformat()

        logger.info("Rotated generic secret")
        return rotated

    def determine_rotation_type(self, secret_name: str) -> str:
        """Determine secret type from name for appropriate rotation.

        Args:
            secret_name: Secret identifier

        Returns:
            Rotation type ('api_key', 'database', 'generic')
        """
        secret_name_lower = secret_name.lower()

        if "database" in secret_name_lower or "postgres" in secret_name_lower:
            return "database"
        elif "api-key" in secret_name_lower or "key" in secret_name_lower:
            return "api_key"
        else:
            return "generic"

    def rotate_secret(self, secret_id: str, client_request_token: str, step: str):
        """Main rotation orchestrator.

        Args:
            secret_id: Secret identifier
            client_request_token: Request token for idempotency
            step: Rotation step ('create', 'set', 'test', 'finish')
        """
        logger.info(f"Starting rotation for {secret_id}, step: {step}")

        try:
            # Get current secret
            current_secret = self.get_secret_dict(secret_id, "AWSCURRENT")

            # Determine rotation type
            rotation_type = self.determine_rotation_type(secret_id)

            # Generate new secret based on type
            if rotation_type == "database":
                new_secret = self.rotate_database_url(current_secret)
            elif rotation_type == "api_key":
                new_secret = self.rotate_api_key(current_secret, secret_id)
            else:
                new_secret = self.rotate_generic_secret(current_secret)

            # Store new secret version
            self.put_secret_dict(secret_id, new_secret, client_request_token)

            # In production, you would:
            # 1. 'create' step: Generate and validate new secret
            # 2. 'set' step: Update the external service with new credential
            # 3. 'test' step: Verify the new credential works
            # 4. 'finish' step: Update Secrets Manager version stage

            if step == "finish":
                self.finish_rotation(secret_id, client_request_token)
                logger.info(f"Successfully rotated {secret_id}")

        except Exception as e:
            logger.error(f"Secret rotation failed for {secret_id}: {str(e)}")
            raise


def lambda_handler(event: dict, context: Any) -> dict:
    """AWS Lambda handler for secret rotation.

    Args:
        event: Lambda event containing SecretId, ClientRequestToken, Step
        context: Lambda context

    Returns:
        Response dict
    """
    logger.info(f"Received rotation event: {json.dumps(event, default=str)}")

    secret_id = event.get("SecretId")
    client_request_token = event.get("ClientRequestToken")
    step = event.get("Step")

    if not all([secret_id, client_request_token, step]):
        raise ValueError("Missing required parameters: SecretId, ClientRequestToken, Step")

    handler = SecretRotationHandler()

    try:
        handler.rotate_secret(secret_id, client_request_token, step)

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": f"Successfully rotated {secret_id}",
                    "secretId": secret_id,
                    "step": step,
                }
            ),
        }

    except Exception as e:
        logger.error(f"Rotation failed: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "error": f"Rotation failed: {str(e)}",
                    "secretId": secret_id,
                    "step": step,
                }
            ),
        }


from datetime import datetime
