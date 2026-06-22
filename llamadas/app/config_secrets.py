"""Updated configuration with AWS Secrets Manager integration.

Replaces environment variable reading with secure Secrets Manager retrieval.
Maintains backward compatibility with environment variables as fallback.
"""
from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from .secrets_manager import get_secret_manager


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Initialize secret manager
    _secret_manager = None

    def __init__(self, **data):
        """Initialize settings with Secrets Manager integration."""
        super().__init__(**data)
        self._secret_manager = get_secret_manager(
            region=os.getenv("AWS_REGION", "us-east-1"),
            use_env_fallback=os.getenv("SECRETS_MANAGER_FALLBACK", "true").lower() == "true",
        )

    def _get_secret(self, secret_name: str, env_var: str, default: str = "") -> str:
        """Get secret from Secrets Manager with environment variable fallback.

        Args:
            secret_name: Name in AWS Secrets Manager
            env_var: Fallback environment variable name
            default: Default value if secret not found

        Returns:
            Secret value or default
        """
        if not self._secret_manager:
            return os.getenv(env_var, default)

        value = self._secret_manager.get_secret(secret_name, env_fallback=env_var)
        return value or default

    # --- Gemini API Credentials (Secrets Manager) ---
    # Secret: silxarcrm/gemini/api-key
    gemini_api_key: str = ""
    gemini_live_model: str = "gemini-3.1-flash-live-preview"
    gemini_live_fallback_model: str = "gemini-2.5-flash-native-audio-latest"
    gemini_voice: str = "Leda"
    gemini_language: str = "es-US"
    embedding_model: str = "gemini-embedding-001"

    # --- Gemini Chat Models ---
    gemini_chat_model: str = "gemini-3.1-flash-lite"
    gemini_chat_fallback_model: str = "gemini-2.5-flash"

    # --- Gemini Master Model ---
    gemini_master_model: str = "gemini-3.5-flash"
    gemini_master_fallback_model: str = "gemini-2.5-flash"

    # --- ElevenLabs API Credentials (Secrets Manager) ---
    # Secret: silxarcrm/elevenlabs/api-key
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "ErXwobaYiN019PkySvjV"
    elevenlabs_tts_format: str = "ulaw_8000"
    elevenlabs_stt_sample_rate: int = 16000
    elevenlabs_latency_opt: int = 0
    elevenlabs_stt_language: str = "es"

    # --- Pipeline Configuration ---
    voice_pipeline: str = "elevenlabs"

    # --- Supervisor Configuration ---
    strategist_enabled: bool = False
    strategist_model: str = "gemini-1.5-pro-latest"
    strategist_turn_interval: int = 5

    # --- Memory Management ---
    memory_max_turns: int = 15
    memory_summary_threshold: int = 10

    # --- Voice Activity Detection ---
    vad_silence_ms: int = 150
    vad_prefix_padding_ms: int = 200
    vad_start_sensitivity: str = "HIGH"
    vad_end_sensitivity: str = "HIGH"

    # --- Gemini Optimization ---
    gemini_thinking_level: str = "minimal"

    # --- Timeouts ---
    gemini_chat_timeout_seconds: int = 10
    elevenlabs_stt_timeout_seconds: int = 5
    elevenlabs_tts_timeout_seconds: int = 3

    # --- Behavior Signals ---
    frustration_alert_threshold: int = 5
    long_call_seconds: int = 480
    enable_input_dsp: bool = True

    # --- Twilio API Credentials (Secrets Manager) ---
    # Secret: silxarcrm/twilio/account-sid
    # Secret: silxarcrm/twilio/auth-token
    # Secret: silxarcrm/twilio/from-number
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    human_transfer_number: str = ""

    # --- Twilio México Configuration ---
    twilio_mx_numbers: str = ""
    twilio_cnam_name: str = "GestPro"
    caller_id_strategy: str = "static"

    # --- Circuit Breaker ---
    circuit_breaker_enabled: bool = True
    circuit_breaker_gemini_stt_ms: int = 500
    circuit_breaker_gemini_llm_ms: int = 800
    circuit_breaker_elevenlabs_tts_ms: int = 300

    # --- Server Configuration ---
    public_host: str = "localhost:8000"
    port: int = 8000
    log_level: str = "INFO"

    # --- Data Storage (Secrets Manager) ---
    # Secret: silxarcrm/redis/url
    # Secret: silxarcrm/database/url
    # Secret: silxarcrm/supabase/url
    # Secret: silxarcrm/supabase/service-key
    redis_url: str = "redis://localhost:6379/0"
    database_url: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""

    # --- Webhook Configuration (Secrets Manager) ---
    # Secret: silxarcrm/webhook/backend-url
    # Secret: silxarcrm/webhook/backend-secret
    backend_webhook_url: str = ""
    backend_webhook_secret: str = ""

    # --- Modular Configuration ---
    # Secret: silxarcrm/voice-config/api-key
    backend_voice_config_url: str = ""
    voice_config_api_key: str = ""

    # --- Calendar/Scheduling (Secrets Manager) ---
    # Secret: silxarcrm/calcom/api-key
    calcom_api_key: str = ""
    calcom_event_type_id: str = ""

    # --- Alerts (Secrets Manager) ---
    # Secret: silxarcrm/slack/webhook-url
    slack_webhook_url: str = ""

    # --- Compliance ---
    disclose_ai: bool = True
    call_hour_start: int = 9
    call_hour_end: int = 20

    # --- Observability ---
    tracing_backend: str = "gcp"
    jaeger_host: str = "localhost"
    jaeger_port: int = 6831
    # Secret: silxarcrm/pagerduty/integration-key
    pagerduty_integration_key: str = ""
    app_version: str = "3.0.0"
    environment: str = "development"
    region: str = "us-central1"
    event_bus_max_history: int = 10000
    trace_sample_rate: float = 1.0
    detailed_log_sample_rate: float = 0.1
    prometheus_export_interval_s: int = 15

    @property
    def media_ws_url(self) -> str:
        """URL WebSocket que se le pasa a Twilio <Stream>."""
        scheme = "ws" if self.public_host.startswith("localhost") else "wss"
        return f"{scheme}://{self.public_host}/media"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
