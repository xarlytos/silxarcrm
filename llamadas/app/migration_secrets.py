"""Migration script to move secrets from environment variables to AWS Secrets Manager.

Usage:
    python migration_secrets.py --action export --env-file .env
    python migration_secrets.py --action import --region us-east-1
    python migration_secrets.py --action setup-rotation --region us-east-1
    python migration_secrets.py --action verify --region us-east-1
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SecretsMigration:
    """Handles migration of secrets from .env to AWS Secrets Manager."""

    # Complete list of all secrets extracted from config.py
    SECRETS_MAPPING = {
        # API Keys & Credentials
        "silxarcrm/gemini/api-key": "GEMINI_API_KEY",
        "silxarcrm/elevenlabs/api-key": "ELEVENLABS_API_KEY",
        "silxarcrm/twilio/account-sid": "TWILIO_ACCOUNT_SID",
        "silxarcrm/twilio/auth-token": "TWILIO_AUTH_TOKEN",
        "silxarcrm/twilio/from-number": "TWILIO_FROM_NUMBER",
        "silxarcrm/calcom/api-key": "CALCOM_API_KEY",
        "silxarcrm/slack/webhook-url": "SLACK_WEBHOOK_URL",
        "silxarcrm/pagerduty/integration-key": "PAGERDUTY_INTEGRATION_KEY",
        # Database & Data Storage
        "silxarcrm/redis/url": "REDIS_URL",
        "silxarcrm/database/url": "DATABASE_URL",
        "silxarcrm/supabase/url": "SUPABASE_URL",
        "silxarcrm/supabase/service-key": "SUPABASE_SERVICE_KEY",
        # Webhook & Integration
        "silxarcrm/webhook/backend-url": "BACKEND_WEBHOOK_URL",
        "silxarcrm/webhook/backend-secret": "BACKEND_WEBHOOK_SECRET",
        "silxarcrm/voice-config/api-key": "VOICE_CONFIG_API_KEY",
    }

    def __init__(self, region: str = "us-east-1"):
        """Initialize migration handler.

        Args:
            region: AWS region for Secrets Manager
        """
        self.region = region
        self.client = boto3.client("secretsmanager", region_name=region)
        self.exported_secrets: dict[str, str] = {}

    def export_from_env(self, env_file: str = ".env") -> dict[str, str]:
        """Export all secrets from .env file.

        Args:
            env_file: Path to .env file

        Returns:
            Dictionary of secret_name -> value
        """
        env_path = Path(env_file)

        if not env_path.exists():
            logger.error(f".env file not found at {env_file}")
            return {}

        secrets = {}
        env_vars = {}

        # Parse .env file
        try:
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue

                    if "=" in line:
                        key, value = line.split("=", 1)
                        env_vars[key.strip()] = value.strip()
        except IOError as e:
            logger.error(f"Failed to read .env file: {e}")
            return {}

        # Map environment variables to secrets
        for secret_name, env_var in self.SECRETS_MAPPING.items():
            if env_var in env_vars:
                value = env_vars[env_var]
                secrets[secret_name] = value
                logger.info(f"Exported {env_var} -> {secret_name}")
            else:
                logger.warning(f"Environment variable {env_var} not found in .env")

        self.exported_secrets = secrets
        return secrets

    def import_to_secrets_manager(self, secrets: dict[str, str]) -> bool:
        """Import secrets to AWS Secrets Manager.

        Args:
            secrets: Dictionary of secret_name -> value

        Returns:
            True if all secrets imported successfully
        """
        success = True

        for secret_name, secret_value in secrets.items():
            try:
                # Check if secret already exists
                try:
                    self.client.describe_secret(SecretId=secret_name)
                    logger.info(f"Secret {secret_name} already exists, updating...")
                    self.client.put_secret_value(
                        SecretId=secret_name, SecretString=secret_value
                    )
                except ClientError as e:
                    if e.response["Error"]["Code"] == "ResourceNotFoundException":
                        # Create new secret
                        self.client.create_secret(
                            Name=secret_name,
                            SecretString=secret_value,
                            Tags=[
                                {"Key": "Application", "Value": "silxarcrm"},
                                {"Key": "Environment", "Value": "production"},
                            ],
                        )
                        logger.info(f"Created secret {secret_name}")
                    else:
                        raise

            except ClientError as e:
                logger.error(f"Failed to import secret {secret_name}: {e}")
                success = False

        return success

    def setup_rotation(
        self, lambda_arn: str, rotation_days: int = 30, enabled: bool = True
    ) -> bool:
        """Configure automatic secret rotation for all secrets.

        Args:
            lambda_arn: ARN of Lambda function for rotation
            rotation_days: Days between rotations (default: 30)
            enabled: Whether to enable automatic rotation

        Returns:
            True if all rotations configured successfully
        """
        success = True

        for secret_name in self.exported_secrets.keys():
            try:
                self.client.rotate_secret(
                    SecretId=secret_name,
                    RotationLambdaARN=lambda_arn,
                    RotationRules={
                        "AutomaticallyAfterDays": rotation_days,
                        "Duration": 3,
                        "ScheduleExpression": f"rate({rotation_days} days)",
                    },
                )
                logger.info(f"Configured rotation for {secret_name} (every {rotation_days} days)")

            except ClientError as e:
                logger.error(f"Failed to configure rotation for {secret_name}: {e}")
                success = False

        return success

    def verify_secrets(self) -> dict[str, bool]:
        """Verify all secrets are accessible in Secrets Manager.

        Returns:
            Dictionary of secret_name -> accessible
        """
        results = {}

        for secret_name in self.SECRETS_MAPPING.keys():
            try:
                self.client.get_secret_value(SecretId=secret_name)
                results[secret_name] = True
                logger.info(f"✓ {secret_name}")
            except ClientError as e:
                results[secret_name] = False
                logger.error(f"✗ {secret_name}: {e}")

        return results

    def create_backup(self, backup_file: str = "secrets_backup.json"):
        """Create backup of exported secrets (encrypted in transit).

        Args:
            backup_file: Path to backup file
        """
        backup_path = Path(backup_file)

        try:
            with open(backup_path, "w") as f:
                json.dump(self.exported_secrets, f, indent=2)
            logger.info(f"Backup created: {backup_file}")
            logger.warning("IMPORTANT: This backup contains secrets. Keep it secure and encrypted.")

        except IOError as e:
            logger.error(f"Failed to create backup: {e}")

    def list_secrets(self) -> list[dict]:
        """List all secrets in Secrets Manager.

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


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate secrets from .env to AWS Secrets Manager"
    )
    parser.add_argument("--action", required=True, help="Action to perform")
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    parser.add_argument("--region", default="us-east-1", help="AWS region")
    parser.add_argument("--lambda-arn", help="Lambda ARN for rotation")
    parser.add_argument("--rotation-days", type=int, default=30, help="Days between rotations")
    parser.add_argument("--backup-file", default="secrets_backup.json", help="Backup file path")

    args = parser.parse_args()

    migration = SecretsMigration(region=args.region)

    if args.action == "export":
        logger.info("Exporting secrets from .env...")
        secrets = migration.export_from_env(args.env_file)
        logger.info(f"Exported {len(secrets)} secrets")
        migration.create_backup(args.backup_file)

    elif args.action == "import":
        logger.info("Importing secrets to AWS Secrets Manager...")
        if not migration.exported_secrets:
            migration.export_from_env(args.env_file)
        success = migration.import_to_secrets_manager(migration.exported_secrets)
        logger.info("Import completed" + (" successfully" if success else " with errors"))

    elif args.action == "setup-rotation":
        if not args.lambda_arn:
            logger.error("--lambda-arn is required for setup-rotation action")
            sys.exit(1)

        logger.info("Setting up automatic rotation...")
        migration.exported_secrets = {k: "" for k in migration.SECRETS_MAPPING.keys()}
        success = migration.setup_rotation(args.lambda_arn, args.rotation_days)
        logger.info("Rotation setup completed" + (" successfully" if success else " with errors"))

    elif args.action == "verify":
        logger.info("Verifying secrets in AWS Secrets Manager...")
        results = migration.verify_secrets()
        accessible = sum(1 for v in results.values() if v)
        logger.info(f"Verification complete: {accessible}/{len(results)} secrets accessible")

    elif args.action == "list":
        logger.info("Listing secrets in AWS Secrets Manager...")
        secrets = migration.list_secrets()
        for secret in secrets:
            logger.info(f"  - {secret['Name']} (Last updated: {secret['LastChangedDate']})")

    else:
        logger.error(f"Unknown action: {args.action}")
        sys.exit(1)


if __name__ == "__main__":
    main()
