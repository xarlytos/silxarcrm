"""AWS Secrets Manager integration for secure credential management.

Provides SecretManager class for fetching secrets from AWS Secrets Manager
instead of environment variables. Supports secret rotation scheduling and fallback
to environment variables for development.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class SecretManager:
    """Manages secrets retrieval from AWS Secrets Manager with fallback to env vars."""

    def __init__(
        self,
        region: str = "us-east-1",
        use_env_fallback: bool = True,
        cache_ttl_seconds: int = 3600,
    ):
        """Initialize SecretManager.

        Args:
            region: AWS region for Secrets Manager
            use_env_fallback: Fall back to environment variables if secret not found
            cache_ttl_seconds: Cache TTL for secrets (default 1 hour)
        """
        self.region = region
        self.use_env_fallback = use_env_fallback
        self.cache_ttl_seconds = cache_ttl_seconds
        self._client = None
        self._cache: dict[str, tuple[Any, float]] = {}

    @property
    def client(self):
        """Lazy-load boto3 Secrets Manager client."""
        if self._client is None:
            self._client = boto3.client("secretsmanager", region_name=self.region)
        return self._client

    def get_secret(
        self, secret_name: str, key: Optional[str] = None, env_fallback: Optional[str] = None
    ) -> Optional[str]:
        """Retrieve a secret from AWS Secrets Manager.

        Args:
            secret_name: Name of the secret in Secrets Manager
            key: Optional JSON key within the secret
            env_fallback: Optional environment variable name to fall back to

        Returns:
            Secret value or None if not found

        Example:
            # Simple string secret
            api_key = manager.get_secret("gemini-api-key")

            # JSON secret with key extraction
            creds = manager.get_secret("db-credentials", key="password")

            # With environment variable fallback
            key = manager.get_secret("gemini-key", env_fallback="GEMINI_API_KEY")
        """
        import os

        # Check cache first
        if secret_name in self._cache:
            value, _ = self._cache[secret_name]
            return value

        try:
            response = self.client.get_secret_value(SecretId=secret_name)

            # Handle both string and JSON secrets
            if "SecretString" in response:
                secret = response["SecretString"]
                if key:
                    secret_dict = json.loads(secret)
                    value = secret_dict.get(key)
                else:
                    value = secret
            elif "SecretBinary" in response:
                value = response["SecretBinary"].decode("utf-8")
            else:
                value = None

            # Cache the result
            if value:
                self._cache[secret_name] = (value, None)

            return value

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.warning(
                f"Failed to retrieve secret '{secret_name}' from Secrets Manager: {error_code}"
            )

            # Fall back to environment variable
            if self.use_env_fallback and env_fallback:
                env_value = os.getenv(env_fallback)
                if env_value:
                    logger.info(f"Using environment variable '{env_fallback}' as fallback")
                    return env_value

            return None

    def put_secret(self, secret_name: str, secret_value: str) -> bool:
        """Create or update a secret in AWS Secrets Manager.

        Args:
            secret_name: Name of the secret
            secret_value: Secret value (string or JSON)

        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.put_secret_value(
                SecretId=secret_name, ClientRequestToken=None, SecretString=secret_value
            )
            logger.info(f"Successfully stored secret '{secret_name}'")

            # Invalidate cache
            if secret_name in self._cache:
                del self._cache[secret_name]

            return True

        except ClientError as e:
            logger.error(f"Failed to store secret '{secret_name}': {e}")
            return False

    def rotate_secret(
        self, secret_name: str, rotation_lambda_arn: str, rotation_rules: dict
    ) -> bool:
        """Configure automatic secret rotation.

        Args:
            secret_name: Name of the secret to rotate
            rotation_lambda_arn: ARN of Lambda function for rotation
            rotation_rules: Rotation rules dict with 'AutomaticallyAfterDays' key

        Returns:
            True if successful, False otherwise

        Example:
            manager.rotate_secret(
                "gemini-api-key",
                "arn:aws:lambda:us-east-1:ACCOUNT:function:rotate-secrets",
                {"AutomaticallyAfterDays": 30}
            )
        """
        try:
            self.client.rotate_secret(
                SecretId=secret_name,
                RotationLambdaARN=rotation_lambda_arn,
                RotationRules=rotation_rules,
            )
            logger.info(f"Configured rotation for secret '{secret_name}'")
            return True

        except ClientError as e:
            logger.error(f"Failed to configure rotation for '{secret_name}': {e}")
            return False

    def list_secrets(self, filters: Optional[dict] = None) -> list[dict]:
        """List all secrets in Secrets Manager.

        Args:
            filters: Optional filters for secret names

        Returns:
            List of secret metadata
        """
        try:
            paginator = self.client.get_paginator("list_secrets")
            secrets = []

            for page in paginator.paginate():
                secrets.extend(page.get("SecretList", []))

            return secrets

        except ClientError as e:
            logger.error(f"Failed to list secrets: {e}")
            return []

    def clear_cache(self, secret_name: Optional[str] = None):
        """Clear cache for a specific secret or all secrets.

        Args:
            secret_name: Optional secret name to clear (clears all if None)
        """
        if secret_name:
            self._cache.pop(secret_name, None)
        else:
            self._cache.clear()


# Global singleton instance
_secret_manager: Optional[SecretManager] = None


def get_secret_manager(
    region: str = "us-east-1", use_env_fallback: bool = True
) -> SecretManager:
    """Get or create the global SecretManager instance.

    Args:
        region: AWS region
        use_env_fallback: Fall back to environment variables

    Returns:
        SecretManager instance
    """
    global _secret_manager
    if _secret_manager is None:
        _secret_manager = SecretManager(region=region, use_env_fallback=use_env_fallback)
    return _secret_manager
