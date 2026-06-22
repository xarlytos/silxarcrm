"""
AWS Secrets Manager Client
Provides encrypted secret retrieval with automatic caching and rotation support.
"""

import json
import logging
import os
from functools import lru_cache
from typing import Dict, Any, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class SecretsClient:
    """
    Unified secrets management client.
    Prioritizes AWS Secrets Manager, falls back to environment variables.
    """

    def __init__(
        self,
        region: str = "us-east-1",
        environment: str = "production",
        enable_local_fallback: bool = True,
    ):
        """Initialize secrets client."""
        self.region = region
        self.environment = environment
        self.enable_local_fallback = enable_local_fallback
        self._use_aws = self._check_aws_available()
        self._secret_cache: Dict[str, Any] = {}

        if self._use_aws:
            self.client = boto3.client("secretsmanager", region_name=region)
            logger.info(f"Using AWS Secrets Manager ({region})")
        else:
            logger.warning("AWS Secrets Manager not available; using environment variables")

    def _check_aws_available(self) -> bool:
        """Check if AWS credentials are available."""
        if not self.enable_local_fallback:
            return True

        try:
            sts = boto3.client("sts", region_name=self.region)
            sts.get_caller_identity()
            return True
        except Exception:
            return False

    def _get_secret_name(self, service: str) -> str:
        """Generate standard secret name."""
        return f"silxarcrm/{self.environment}/{service}"

    def _fetch_from_aws(self, service: str) -> Optional[Dict[str, Any]]:
        """Fetch secret from AWS Secrets Manager."""
        if not self._use_aws:
            return None

        secret_name = self._get_secret_name(service)
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            secret = json.loads(response["SecretString"])
            self._secret_cache[service] = secret
            logger.debug(f"Fetched {service} from Secrets Manager")
            return secret
        except ClientError as e:
            logger.warning(f"Failed to fetch {service} from Secrets Manager: {e}")
            return None

    def _get_from_env(self, *env_vars: str) -> Optional[str]:
        """Get value from environment variable (tries multiple names)."""
        for var in env_vars:
            value = os.getenv(var)
            if value:
                return value
        return None

    def get_gemini_key(self) -> str:
        """Get Gemini API key."""
        # Try cache first
        if "gemini" in self._secret_cache:
            return self._secret_cache["gemini"].get("api_key", "")

        # Try AWS
        secret = self._fetch_from_aws("gemini")
        if secret:
            return secret.get("api_key", "")

        # Fallback to environment
        return self._get_from_env("GEMINI_API_KEY") or ""

    def get_elevenlabs_key(self) -> str:
        """Get ElevenLabs API key."""
        if "elevenlabs" in self._secret_cache:
            return self._secret_cache["elevenlabs"].get("api_key", "")

        secret = self._fetch_from_aws("elevenlabs")
        if secret:
            return secret.get("api_key", "")

        return self._get_from_env("ELEVENLABS_API_KEY") or ""

    def get_twilio_credentials(self) -> Dict[str, str]:
        """Get Twilio credentials."""
        if "twilio" in self._secret_cache:
            secret = self._secret_cache["twilio"]
            return {
                "account_sid": secret.get("account_sid", ""),
                "auth_token": secret.get("auth_token", ""),
                "from_number": secret.get("from_number", ""),
            }

        secret = self._fetch_from_aws("twilio")
        if secret:
            return {
                "account_sid": secret.get("account_sid", ""),
                "auth_token": secret.get("auth_token", ""),
                "from_number": secret.get("from_number", ""),
            }

        return {
            "account_sid": self._get_from_env("TWILIO_ACCOUNT_SID") or "",
            "auth_token": self._get_from_env("TWILIO_AUTH_TOKEN") or "",
            "from_number": self._get_from_env("TWILIO_FROM_NUMBER") or "",
        }

    def get_openai_key(self) -> str:
        """Get OpenAI API key."""
        if "openai" in self._secret_cache:
            return self._secret_cache["openai"].get("api_key", "")

        secret = self._fetch_from_aws("openai")
        if secret:
            return secret.get("api_key", "")

        return self._get_from_env("OPENAI_API_KEY") or ""

    def get_webhook_credentials(self) -> Dict[str, str]:
        """Get webhook credentials."""
        if "webhook" in self._secret_cache:
            secret = self._secret_cache["webhook"]
            return {
                "webhook_url": secret.get("webhook_url", ""),
                "webhook_secret": secret.get("webhook_secret", ""),
            }

        secret = self._fetch_from_aws("webhook")
        if secret:
            return {
                "webhook_url": secret.get("webhook_url", ""),
                "webhook_secret": secret.get("webhook_secret", ""),
            }

        return {
            "webhook_url": self._get_from_env("BACKEND_WEBHOOK_URL") or "",
            "webhook_secret": self._get_from_env("BACKEND_WEBHOOK_SECRET") or "",
        }

    def get_calcom_credentials(self) -> Dict[str, str]:
        """Get Cal.com credentials."""
        if "calcom" in self._secret_cache:
            secret = self._secret_cache["calcom"]
            return {
                "api_key": secret.get("api_key", ""),
                "event_type_id": secret.get("event_type_id", ""),
            }

        secret = self._fetch_from_aws("calcom")
        if secret:
            return {
                "api_key": secret.get("api_key", ""),
                "event_type_id": secret.get("event_type_id", ""),
            }

        return {
            "api_key": self._get_from_env("CALCOM_API_KEY") or "",
            "event_type_id": self._get_from_env("CALCOM_EVENT_TYPE_ID") or "",
        }

    def clear_cache(self, service: Optional[str] = None):
        """Clear secret cache (useful after rotation)."""
        if service:
            self._secret_cache.pop(service, None)
            logger.info(f"Cleared cache for {service}")
        else:
            self._secret_cache.clear()
            logger.info("Cleared all secret caches")


# Singleton instance
_secrets_client: Optional[SecretsClient] = None


def get_secrets_client(
    region: str = "us-east-1",
    environment: str = "production",
) -> SecretsClient:
    """Get or create singleton secrets client."""
    global _secrets_client
    if _secrets_client is None:
        _secrets_client = SecretsClient(region=region, environment=environment)
    return _secrets_client
