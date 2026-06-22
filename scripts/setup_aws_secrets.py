#!/usr/bin/env python3
"""
AWS Secrets Manager Setup & Credential Rotation
Implements zero-trust credential management with automatic rotation.
"""

import json
import secrets
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import boto3
from botocore.exceptions import ClientError


class SecretsManagerSetup:
    """Manages AWS Secrets Manager setup and credential rotation."""

    def __init__(self, region: str = "us-east-1", environment: str = "production"):
        """Initialize Secrets Manager client."""
        self.region = region
        self.environment = environment
        self.client = boto3.client("secretsmanager", region_name=region)
        self.ssm_client = boto3.client("ssm", region_name=region)

    def _get_secret_name(self, service: str) -> str:
        """Generate secret name following AWS best practices."""
        return f"silxarcrm/{self.environment}/{service}"

    def _create_secret(self, service: str, secret_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a secret in AWS Secrets Manager."""
        secret_name = self._get_secret_name(service)

        try:
            # Attempt to update existing secret
            response = self.client.update_secret(
                SecretId=secret_name,
                SecretString=json.dumps(secret_data),
                ClientRequestToken=secrets.token_hex(16),
            )
            print(f"✓ Updated secret: {secret_name}")
            return response
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                # Create new secret
                response = self.client.create_secret(
                    Name=secret_name,
                    Description=f"{service} credentials for {self.environment}",
                    SecretString=json.dumps(secret_data),
                    Tags=[
                        {"Key": "Environment", "Value": self.environment},
                        {"Key": "Service", "Value": service},
                        {"Key": "ManagedBy", "Value": "credential-rotation"},
                    ],
                )
                print(f"✓ Created secret: {secret_name}")
                return response
            raise

    def setup_gemini_secret(self, api_key: str) -> bool:
        """Store Gemini API key in Secrets Manager."""
        try:
            secret_data = {
                "api_key": api_key,
                "service": "gemini",
                "created_at": datetime.utcnow().isoformat(),
                "rotation_enabled": True,
                "rotation_days": 90,
            }
            self._create_secret("gemini", secret_data)
            return True
        except Exception as e:
            print(f"✗ Failed to setup Gemini secret: {e}")
            return False

    def setup_elevenlabs_secret(self, api_key: str) -> bool:
        """Store ElevenLabs API key in Secrets Manager."""
        try:
            secret_data = {
                "api_key": api_key,
                "service": "elevenlabs",
                "created_at": datetime.utcnow().isoformat(),
                "rotation_enabled": True,
                "rotation_days": 90,
            }
            self._create_secret("elevenlabs", secret_data)
            return True
        except Exception as e:
            print(f"✗ Failed to setup ElevenLabs secret: {e}")
            return False

    def setup_twilio_secret(
        self, account_sid: str, auth_token: str, from_number: str
    ) -> bool:
        """Store Twilio credentials in Secrets Manager."""
        try:
            secret_data = {
                "account_sid": account_sid,
                "auth_token": auth_token,
                "from_number": from_number,
                "service": "twilio",
                "created_at": datetime.utcnow().isoformat(),
                "rotation_enabled": True,
                "rotation_days": 60,
            }
            self._create_secret("twilio", secret_data)
            return True
        except Exception as e:
            print(f"✗ Failed to setup Twilio secret: {e}")
            return False

    def setup_openai_secret(self, api_key: str) -> bool:
        """Store OpenAI API key in Secrets Manager."""
        try:
            secret_data = {
                "api_key": api_key,
                "service": "openai",
                "created_at": datetime.utcnow().isoformat(),
                "rotation_enabled": True,
                "rotation_days": 90,
            }
            self._create_secret("openai", secret_data)
            return True
        except Exception as e:
            print(f"✗ Failed to setup OpenAI secret: {e}")
            return False

    def setup_webhook_secrets(self, webhook_url: str, webhook_secret: str) -> bool:
        """Store webhook credentials in Secrets Manager."""
        try:
            secret_data = {
                "webhook_url": webhook_url,
                "webhook_secret": webhook_secret,
                "service": "webhook",
                "created_at": datetime.utcnow().isoformat(),
                "rotation_enabled": True,
                "rotation_days": 30,
            }
            self._create_secret("webhook", secret_data)
            return True
        except Exception as e:
            print(f"✗ Failed to setup webhook secret: {e}")
            return False

    def setup_calcom_secret(self, api_key: str, event_type_id: str) -> bool:
        """Store Cal.com credentials in Secrets Manager."""
        try:
            secret_data = {
                "api_key": api_key,
                "event_type_id": event_type_id,
                "service": "calcom",
                "created_at": datetime.utcnow().isoformat(),
                "rotation_enabled": True,
                "rotation_days": 90,
            }
            self._create_secret("calcom", secret_data)
            return True
        except Exception as e:
            print(f"✗ Failed to setup Cal.com secret: {e}")
            return False

    def enable_rotation_lambda(self, service: str, rotation_days: int = 30) -> bool:
        """
        Enable automatic rotation via Lambda function.
        Assumes Lambda function already exists as 'rotate-{service}-credentials'.
        """
        secret_name = self._get_secret_name(service)
        try:
            self.client.rotate_secret(
                SecretId=secret_name,
                RotationLambdaARN=f"arn:aws:lambda:{self.region}:ACCOUNT_ID:function:rotate-{service}-credentials",
                RotationRules={
                    "AutomaticallyAfterDays": rotation_days,
                    "Duration": "3h",
                    "ScheduleExpression": "rate(30 days)",
                },
            )
            print(f"✓ Enabled rotation for {service} (every {rotation_days} days)")
            return True
        except ClientError as e:
            if "not yet supported" in str(e):
                print(f"ℹ Lambda rotation not available; use manual rotation for {service}")
                return True
            print(f"✗ Failed to enable rotation for {service}: {e}")
            return False

    def get_secret(self, service: str) -> Optional[Dict[str, Any]]:
        """Retrieve a secret from Secrets Manager."""
        secret_name = self._get_secret_name(service)
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            return json.loads(response["SecretString"])
        except ClientError:
            return None

    def list_secrets(self) -> list:
        """List all managed secrets."""
        try:
            response = self.client.list_secrets(
                Filters=[
                    {
                        "Key": "name",
                        "Values": [f"silxarcrm/{self.environment}/"],
                    }
                ]
            )
            return response.get("SecretList", [])
        except ClientError:
            return []

    def rotate_all_credentials(self) -> Dict[str, bool]:
        """Rotate all stored credentials (manual rotation)."""
        results = {}
        services = ["gemini", "elevenlabs", "twilio", "openai", "webhook", "calcom"]

        for service in services:
            secret_name = self._get_secret_name(service)
            try:
                self.client.rotate_secret(
                    SecretId=secret_name,
                    ClientRequestToken=secrets.token_hex(16),
                )
                results[service] = True
                print(f"✓ Initiated rotation for {service}")
            except ClientError as e:
                results[service] = False
                print(f"✗ Failed to rotate {service}: {e}")

        return results

    def setup_parameter_store_backup(self, service: str) -> bool:
        """
        Backup secret metadata to Parameter Store (for quick reference).
        This stores non-sensitive metadata only; actual secrets stay in Secrets Manager.
        """
        secret = self.get_secret(service)
        if not secret:
            return False

        try:
            param_name = f"/silxarcrm/{self.environment}/{service}/metadata"
            metadata = {
                "service": service,
                "created_at": secret.get("created_at", ""),
                "rotation_enabled": secret.get("rotation_enabled", False),
                "rotation_days": secret.get("rotation_days", 0),
            }
            self.ssm_client.put_parameter(
                Name=param_name,
                Value=json.dumps(metadata),
                Type="String",
                Overwrite=True,
                Tags=[
                    {"Key": "Environment", "Value": self.environment},
                    {"Key": "Service", "Value": service},
                ],
            )
            print(f"✓ Backed up metadata for {service} to Parameter Store")
            return True
        except ClientError as e:
            print(f"✗ Failed to backup metadata: {e}")
            return False


def main():
    """Interactive setup wizard."""
    print("=" * 70)
    print("AWS Secrets Manager Setup & Credential Rotation")
    print("=" * 70)
    print()

    # Check AWS credentials
    try:
        sts = boto3.client("sts")
        identity = sts.get_caller_identity()
        print(f"✓ AWS Account: {identity['Account']}")
        print(f"✓ Principal: {identity['Arn']}")
    except Exception as e:
        print(f"✗ Failed to authenticate to AWS: {e}")
        sys.exit(1)

    environment = input("\nEnvironment (development/staging/production) [production]: ").strip() or "production"
    region = input("AWS Region [us-east-1]: ").strip() or "us-east-1"

    setup = SecretsManagerSetup(region=region, environment=environment)

    print(f"\n{environment.upper()} environment in {region}")
    print("-" * 70)

    credentials_to_setup = []

    # Gemini
    gemini_key = input("\nGemini API Key (leave blank to skip): ").strip()
    if gemini_key:
        if setup.setup_gemini_secret(gemini_key):
            credentials_to_setup.append("gemini")

    # ElevenLabs
    elevenlabs_key = input("ElevenLabs API Key (leave blank to skip): ").strip()
    if elevenlabs_key:
        if setup.setup_elevenlabs_secret(elevenlabs_key):
            credentials_to_setup.append("elevenlabs")

    # Twilio
    if input("Setup Twilio credentials? (y/n) [n]: ").lower() == "y":
        twilio_sid = input("Twilio Account SID: ").strip()
        twilio_token = input("Twilio Auth Token: ").strip()
        twilio_from = input("Twilio From Number: ").strip()
        if setup.setup_twilio_secret(twilio_sid, twilio_token, twilio_from):
            credentials_to_setup.append("twilio")

    # OpenAI
    openai_key = input("\nOpenAI API Key (leave blank to skip): ").strip()
    if openai_key:
        if setup.setup_openai_secret(openai_key):
            credentials_to_setup.append("openai")

    # Webhook
    if input("Setup Webhook credentials? (y/n) [n]: ").lower() == "y":
        webhook_url = input("Webhook URL: ").strip()
        webhook_secret = input("Webhook Secret: ").strip()
        if setup.setup_webhook_secrets(webhook_url, webhook_secret):
            credentials_to_setup.append("webhook")

    # Cal.com
    if input("Setup Cal.com credentials? (y/n) [n]: ").lower() == "y":
        calcom_key = input("Cal.com API Key: ").strip()
        calcom_id = input("Cal.com Event Type ID: ").strip()
        if setup.setup_calcom_secret(calcom_key, calcom_id):
            credentials_to_setup.append("calcom")

    # Setup Parameter Store backups
    print("\n" + "-" * 70)
    print("Backing up metadata to Parameter Store...")
    for service in credentials_to_setup:
        setup.setup_parameter_store_backup(service)

    # Display summary
    print("\n" + "=" * 70)
    print("SETUP COMPLETE")
    print("=" * 70)
    print(f"✓ Secrets configured: {len(credentials_to_setup)}")
    for service in credentials_to_setup:
        print(f"  - {service}")

    print("\nNext steps:")
    print("1. Update llamadas/app/config.py to fetch from Secrets Manager")
    print("2. Deploy Lambda rotation functions for automatic rotation")
    print("3. Test retrieval: python -c 'from secrets_client import SecretsClient; SecretsClient().get_gemini_key()'")
    print("4. Monitor rotations in CloudWatch Logs")


if __name__ == "__main__":
    main()
