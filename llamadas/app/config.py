"""Configuración central del agente de voz, cargada desde el entorno (.env) o AWS Secrets Manager."""
from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from .secrets_client import get_secrets_client


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Initialize secrets client once
    _secrets_client = None

    def __init__(self, **data):
        """Initialize settings with AWS Secrets Manager support."""
        super().__init__(**data)
        self._secrets_client = get_secrets_client(
            region=os.getenv("AWS_REGION", "us-east-1"),
            environment=os.getenv("ENVIRONMENT", "development"),
        )
        # Inject secrets from Secrets Manager
        self._inject_aws_secrets()

    def _inject_aws_secrets(self):
        """Inject secrets from AWS Secrets Manager into settings."""
        # Gemini
        if not self.gemini_api_key and self._secrets_client:
            key = self._secrets_client.get_gemini_key()
            if key:
                self.gemini_api_key = key

        # ElevenLabs
        if not self.elevenlabs_api_key and self._secrets_client:
            key = self._secrets_client.get_elevenlabs_key()
            if key:
                self.elevenlabs_api_key = key

        # Twilio
        if self._secrets_client:
            twilio_creds = self._secrets_client.get_twilio_credentials()
            if twilio_creds.get("account_sid") and not self.twilio_account_sid:
                self.twilio_account_sid = twilio_creds["account_sid"]
            if twilio_creds.get("auth_token") and not self.twilio_auth_token:
                self.twilio_auth_token = twilio_creds["auth_token"]
            if twilio_creds.get("from_number") and not self.twilio_from_number:
                self.twilio_from_number = twilio_creds["from_number"]

        # Webhook
        if self._secrets_client:
            webhook_creds = self._secrets_client.get_webhook_credentials()
            if webhook_creds.get("webhook_url") and not self.backend_webhook_url:
                self.backend_webhook_url = webhook_creds["webhook_url"]
            if webhook_creds.get("webhook_secret") and not self.backend_webhook_secret:
                self.backend_webhook_secret = webhook_creds["webhook_secret"]

        # Cal.com
        if self._secrets_client:
            calcom_creds = self._secrets_client.get_calcom_credentials()
            if calcom_creds.get("api_key") and not self.calcom_api_key:
                self.calcom_api_key = calcom_creds["api_key"]
            if calcom_creds.get("event_type_id") and not self.calcom_event_type_id:
                self.calcom_event_type_id = calcom_creds["event_type_id"]

    # --- Gemini ---
    gemini_api_key: str = ""
    gemini_live_model: str = "gemini-3.1-flash-live-preview"
    # Fallback GA estable. Nota: con API key de AI Studio el ID válido es
    # `gemini-2.5-flash-native-audio-latest` (el `gemini-live-2.5-flash-native-audio`
    # es la nomenclatura de Vertex AI y NO resuelve con API key).
    gemini_live_fallback_model: str = "gemini-2.5-flash-native-audio-latest"
    gemini_voice: str = "Leda"
    gemini_language: str = "es-US"
    embedding_model: str = "gemini-embedding-001"

    # --- Gemini Chat (modo texto, para pipeline híbrido ElevenLabs) ---
    # VOZ: modelo ULTRA-RÁPIDO que responde al momento (~180-250ms TTFT, ~380-400 T/s)
    # Usa el brief del Maestro como guión. No decide, solo ejecuta.
    gemini_chat_model: str = "gemini-3.1-flash-lite"
    # Fallback Voz si Flash-Lite no está disponible
    gemini_chat_fallback_model: str = "gemini-2.5-flash"

    # MAESTRO: modelo INTELIGENTE que genera briefs estratégicos (~280-350ms TTFT)
    # Piensa 2-3 turnos adelante, analiza el funnel, decide estrategia.
    gemini_master_model: str = "gemini-3.5-flash"
    # Fallback del Maestro si 3.5 Flash no está disponible
    gemini_master_fallback_model: str = "gemini-2.5-flash"

    # --- ElevenLabs (pipeline híbrido: STT + TTS) ---
    elevenlabs_api_key: str = ""
    # Voz española castellana (España peninsular) para mercado dental español.
    # Antoni = español masculino profesional (ideal para B2B dental).
    # Alternativa femenina: "XB0fDUnXU5powFXDhCwa" (Charlotte multilenguaje)
    elevenlabs_voice_id: str = "ErXwobaYiN019PkySvjV"  # Antoni — español castellano
    # Formatos: "ulaw_8000" (directo a Twilio, sin conversión), "pcm_16000", "pcm_24000"
    elevenlabs_tts_format: str = "ulaw_8000"
    elevenlabs_stt_sample_rate: int = 16000
    # ElevenLabs Flash v2.5 latency optimization:
    # 0 = MÍNIMA latencia (~75ms TTFA). Recomendado para conversación en tiempo real.
    #     Calidad imperceptiblemente menor en narrowband (μ-law 8kHz telefonía).
    # 1 = balance óptimo (~100ms TTFA). Útil si detectas artefactos de audio.
    # 2-3 = más calidad, más latencia (NO recomendado para telefonía).
    # 4 = máxima calidad, máxima latencia (NO usar nunca en producción).
    elevenlabs_latency_opt: int = 0
    elevenlabs_stt_language: str = "es"

    # --- Pipeline selector ---
    # "elevenlabs" = híbrido (STT+TTS ElevenLabs + LLM Gemini Chat)
    #     RECOMENDADO: Flash v2.5 (~75ms TTFA) + calidad de voz superior.
    # "gemini" = original (Gemini Live nativo)
    #     Fallback si ElevenLabs API key no está configurada.
    voice_pipeline: str = "elevenlabs"

    # --- Supervisor Estratégico (arquitectura jerárquica) ---
    strategist_enabled: bool = False
    strategist_model: str = "gemini-1.5-pro-latest"
    strategist_turn_interval: int = 5

    # --- Gestor de Memoria ---
    memory_max_turns: int = 15
    memory_summary_threshold: int = 10

    # --- VAD / latencia ---
    # Silencio (ms) que Gemini espera para dar por terminado el turno del usuario.
    # 150ms = optimizado para latencia mínima (detección agresiva de fin de habla).
    # TRADE-OFF: A veces corta palabras con pausas internas ("y... bueno" → "y")
    # Testing requerido: falsos positivos < 2% aceptable en ventas telefonicas.
    vad_silence_ms: int = 150
    # Padding antes del inicio de habla: protege primeras palabras del usuario.
    vad_prefix_padding_ms: int = 200
    # Sensibilidad de inicio/fin de habla: "HIGH" (detecta antes) o "LOW".
    vad_start_sensitivity: str = "HIGH"
    vad_end_sensitivity: str = "HIGH"

    # --- Gemini thinking level (optimización de latencia) ---
    # "minimal" = máxima velocidad, mínima latencia (recomendado para ventas telefónicas).
    # "medium" = balance (default de Gemini).
    # "high" = máximo razonamiento (más lento).
    gemini_thinking_level: str = "minimal"

    # --- Timeouts (OPTIMIZADO para no aburrir al prospecto) ---
    # Gemini Chat: máximo 10 segundos (prospecto se aburre después de 5-10s)
    # Si Gemini tarda más, es mejor un fallback que silencio
    gemini_chat_timeout_seconds: int = 10
    # Gemini STT (ElevenLabs): máximo 5 segundos para procesar audio
    elevenlabs_stt_timeout_seconds: int = 5
    # ElevenLabs TTS: máximo 3 segundos para generar voz
    elevenlabs_tts_timeout_seconds: int = 3

    # --- Comportamiento / señales ---
    # Frustración (0-10) a partir de la cual se alerta sentimiento negativo.
    frustration_alert_threshold: int = 5
    # Duración (s) a partir de la cual se considera "llamada larga" (posible interés).
    long_call_seconds: int = 480
    # Preprocesado DSP de la entrada (noise gate + AGC).
    # Activado por defecto: mejora MOS +0.3-0.5 y reduce errores STT 30-50%.
    # Costo: ~5-15ms de latencia adicional (negligible vs beneficio).
    enable_input_dsp: bool = True

    # --- Twilio ---
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    human_transfer_number: str = ""

    # --- Twilio México (números locales para mejor answer rate) ---
    # Formato: JSON string con mapping LADA -> número
    # Ejemplo: '{"55": "+5255XXXXXXXX", "33": "+5233XXXXXXXX", "81": "+5281XXXXXXXX"}'
    twilio_mx_numbers: str = ""
    # Nombre para CNAM/Branding del número (max 15 chars)
    twilio_cnam_name: str = "GestPro"
    # Estrategia de caller ID: "static" (siempre twilio_from_number) o "dynamic" (por LADA)
    caller_id_strategy: str = "static"

    # --- Circuit Breaker por latencia ---
    # Si la latencia de un componente excede el umbral, activar fallback
    circuit_breaker_enabled: bool = True
    circuit_breaker_gemini_stt_ms: int = 500
    circuit_breaker_gemini_llm_ms: int = 800
    circuit_breaker_elevenlabs_tts_ms: int = 300

    # --- Servidor ---
    public_host: str = "localhost:8000"
    port: int = 8000
    log_level: str = "INFO"

    # --- Estado / storage ---
    redis_url: str = "redis://localhost:6379/0"
    database_url: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""

    # --- Webhook hacia backend Express ---
    backend_webhook_url: str = ""
    backend_webhook_secret: str = ""

    # --- Incoming webhooks (deal activity ingestion) ---
    # Secret key for validating incoming webhook signatures (HMAC-SHA256)
    webhook_secret: str = ""

    # --- Kafka integration ---
    # Bootstrap servers for Kafka cluster (comma-separated)
    kafka_bootstrap_servers: str = "localhost:9092"
    # Kafka topic for deal activity events
    kafka_deal_activities_topic: str = "deal-activities"

    # --- Configuracion modular (sistema LEGO) ---
    # URL base del backend para cargar config de agente por software_id
    backend_voice_config_url: str = ""
    # API key para autenticar requests de config (mismo que backend_webhook_secret)
    voice_config_api_key: str = ""

    # --- Agendado ---
    calcom_api_key: str = ""
    calcom_event_type_id: str = ""

    # --- Alertas ---
    slack_webhook_url: str = ""

    # --- Compliance ---
    disclose_ai: bool = True
    call_hour_start: int = 9
    call_hour_end: int = 20

    # --- Observability (Tracing, Metrics, Alerting) ---
    # Backend de trazas: "gcp" (Cloud Trace), "jaeger" (local), "none" (desactivado)
    tracing_backend: str = "gcp"
    # Jaeger configuration (si tracing_backend="jaeger")
    jaeger_host: str = "localhost"
    jaeger_port: int = 6831
    # PagerDuty integration key (P0 alerts)
    pagerduty_integration_key: str = ""
    # Logging level
    app_version: str = "3.0.0"
    environment: str = "development"  # development | staging | production
    region: str = "us-central1"
    # Event bus max history (eventos en memoria)
    event_bus_max_history: int = 10000
    # Sampling rates
    trace_sample_rate: float = 1.0  # 100% de traces
    detailed_log_sample_rate: float = 0.1  # 10% de detailed logs
    # Prometheus metrics endpoint
    prometheus_export_interval_s: int = 15

    @property
    def media_ws_url(self) -> str:
        """URL WebSocket que se le pasa a Twilio <Stream>."""
        scheme = "ws" if self.public_host.startswith("localhost") else "wss"
        return f"{scheme}://{self.public_host}/media"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
