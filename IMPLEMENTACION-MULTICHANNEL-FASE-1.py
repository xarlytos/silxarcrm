"""
IMPLEMENTACIÓN MULTICHANNEL - FASE 1 (MVP)

Código funcional para:
- Channel Dispatcher
- Unified Session Manager
- WhatsApp Handler (Twilio)
- Adaptive NLU
- Compliance checks

Estado: LISTO PARA PRODUCCIÓN (con ajustes de config)
Dependencias: fastapi, twilio, supabase, redis, google-generativeai
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Protocol, Literal

import redis.asyncio as redis
from fastapi import FastAPI, Request, WebSocket, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import google.generativeai as genai
from supabase import create_client, Client as SupabaseClient
from twilio.rest import Client as TwilioClient
from twilio.twiml.messaging_response import MessagingResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ════════════════════════════════════════════════════════════════════════════════
# ENUMS & MODELS
# ════════════════════════════════════════════════════════════════════════════════

class ChannelType(str, Enum):
    """Canales soportados."""
    VOICE = "voice"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"


class ConversationState(str, Enum):
    """Estados del prospect."""
    DISCOVERY = "discovery"
    INTERESTED = "interested"
    DEMO_SCHEDULED = "demo_scheduled"
    DEMO_COMPLETED = "demo_completed"
    PROPOSAL = "proposal"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class Message(BaseModel):
    """Un mensaje en el historial compartido."""
    channel: ChannelType
    role: Literal["user", "assistant"]
    text: str
    timestamp: datetime
    media: Optional[list[dict]] = None

    def to_dict(self) -> dict:
        return {
            "channel": self.channel.value,
            "role": self.role,
            "text": self.text,
            "timestamp": self.timestamp.isoformat(),
            "media": self.media,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Message:
        data["channel"] = ChannelType(data["channel"])
        data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)


class ProspectData(BaseModel):
    """Datos del prospect (cargado una sola vez de CRM)."""
    phone: str
    nombre: str
    empresa: str
    ciudad: str
    email: Optional[str] = None
    business_type: str = "generico"
    software_id: str = ""
    lead_id: str = ""


class ChannelMessage(BaseModel):
    """Mensaje envelope universal."""
    channel: ChannelType
    phone: str
    session_id: str
    text: Optional[str] = None
    media: Optional[list[dict]] = None
    timestamp: datetime
    metadata: dict = {}


class ChannelResponse(BaseModel):
    """Respuesta del agente para enviar por canal."""
    text: str
    channel: ChannelType
    phone: str
    media: Optional[list[bytes]] = None
    requires_cta: bool = False
    cta_buttons: Optional[list[dict]] = None
    timestamp: datetime
    confidence: float = 0.85


class ConsentResult(BaseModel):
    """Resultado de verificación de consentimiento."""
    allowed: bool
    reason: Optional[str] = None
    consent_date: Optional[datetime] = None


class IntentResult(BaseModel):
    """Resultado de clasificación de intención."""
    intent: str
    confidence: float
    explanation: str
    channel: ChannelType


# ════════════════════════════════════════════════════════════════════════════════
# UNIFIED SESSION MANAGER
# ════════════════════════════════════════════════════════════════════════════════

class UnifiedSession:
    """Sesión unificada de un prospect a través de múltiples canales."""

    def __init__(self, phone: str, software_id: str, prospect: ProspectData):
        self.phone = phone
        self.software_id = software_id
        self.session_id = f"{phone}:{software_id}:{uuid.uuid4()}"

        self.prospect = prospect
        self.message_history: list[Message] = []
        self.state = ConversationState.DISCOVERY
        self.active_channels: set[ChannelType] = set()
        self.last_interaction: dict[ChannelType, datetime] = {}
        self.memory_summary: str = ""
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    async def add_message(
        self,
        channel: ChannelType,
        text: str,
        role: Literal["user", "assistant"],
    ) -> Message:
        """Agrega mensaje al historial."""
        msg = Message(
            channel=channel,
            role=role,
            text=text,
            timestamp=datetime.now(),
        )
        self.message_history.append(msg)
        self.last_interaction[channel] = datetime.now()
        self.active_channels.add(channel)
        self.updated_at = datetime.now()
        return msg

    async def get_conversation_summary(self, max_recent: int = 10) -> str:
        """Retorna resumen para inyectar en prompts."""
        recent = self.message_history[-max_recent:]
        text = "\n".join(
            f"{m.role.upper()}: {m.text[:100]}" for m in recent
        )
        return f"RESUMEN:\n{self.memory_summary}\n---RECIENTE---\n{text}"

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "phone": self.phone,
            "software_id": self.software_id,
            "prospect": self.prospect.model_dump(),
            "state": self.state.value,
            "active_channels": [c.value for c in self.active_channels],
            "message_history": [m.to_dict() for m in self.message_history],
            "memory_summary": self.memory_summary,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> UnifiedSession:
        prospect = ProspectData(**data["prospect"])
        session = cls(data["phone"], data["software_id"], prospect)
        session.session_id = data["session_id"]
        session.state = ConversationState(data["state"])
        session.active_channels = set(ChannelType(c) for c in data["active_channels"])
        session.message_history = [Message.from_dict(m) for m in data["message_history"]]
        session.memory_summary = data["memory_summary"]
        session.created_at = datetime.fromisoformat(data["created_at"])
        session.updated_at = datetime.fromisoformat(data["updated_at"])
        return session


# ════════════════════════════════════════════════════════════════════════════════
# SHARED MEMORY LAYER
# ════════════════════════════════════════════════════════════════════════════════

class SharedMemory:
    """Redis + Supabase para sesiones compartidas."""

    def __init__(self, redis_url: str, supabase_client: SupabaseClient):
        self.redis_url = redis_url
        self.supabase = supabase_client
        self.redis: Optional[redis.Redis] = None

    async def initialize(self):
        """Inicializa conexión Redis."""
        self.redis = await redis.from_url(self.redis_url)
        logger.info("SharedMemory initialized (Redis + Supabase)")

    async def load_session(self, phone: str, software_id: str) -> Optional[UnifiedSession]:
        """Carga sesión (Redis → Supabase)."""

        # 1. Intentar Redis
        if self.redis:
            cached = await self.redis.get(f"session:{phone}:{software_id}")
            if cached:
                data = json.loads(cached)
                logger.info(f"Session hit (Redis): {phone}")
                return UnifiedSession.from_dict(data)

        # 2. Cargar de Supabase
        try:
            sessions = await asyncio.to_thread(
                lambda: self.supabase.table("prospect_sessions")
                .select("*")
                .eq("phone", phone)
                .eq("software_id", software_id)
                .execute()
            )

            if not sessions.data:
                logger.info(f"No session found: {phone}")
                return None

            prospect_data = ProspectData(**sessions.data[0])
            session = UnifiedSession(phone, software_id, prospect_data)

            # Cargar historial de mensajes
            messages = await asyncio.to_thread(
                lambda: self.supabase.table("messages")
                .select("*")
                .eq("phone", phone)
                .order("timestamp")
                .execute()
            )

            session.message_history = [
                Message.from_dict(m) for m in messages.data
            ]

            # Guardar en Redis
            if self.redis:
                await self.redis.setex(
                    f"session:{phone}:{software_id}",
                    86400,  # 24 horas
                    json.dumps(session.to_dict()),
                )

            logger.info(f"Session hit (Supabase): {phone}")
            return session

        except Exception as e:
            logger.error(f"Error loading session: {e}")
            return None

    async def save_session(self, session: UnifiedSession):
        """Persiste sesión en ambos stores."""

        data = session.to_dict()

        # Supabase
        try:
            await asyncio.to_thread(
                lambda: self.supabase.table("prospect_sessions")
                .upsert({
                    "phone": session.phone,
                    "software_id": session.software_id,
                    "prospect": data["prospect"],
                    "state": data["state"],
                    "last_channel": list(session.active_channels)[-1].value if session.active_channels else None,
                    "updated_at": data["updated_at"],
                }, on_conflict="phone,software_id")
                .execute()
            )
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}")

        # Redis
        if self.redis:
            await self.redis.setex(
                f"session:{session.phone}:{session.software_id}",
                86400,
                json.dumps(data),
            )

    async def save_message(self, phone: str, msg: Message):
        """Guarda mensaje en historial."""
        try:
            await asyncio.to_thread(
                lambda: self.supabase.table("messages")
                .insert({
                    "phone": phone,
                    "channel": msg.channel.value,
                    "role": msg.role,
                    "text": msg.text,
                    "timestamp": msg.timestamp.isoformat(),
                })
                .execute()
            )
        except Exception as e:
            logger.error(f"Error saving message: {e}")

        # Invalidar Redis
        if self.redis:
            # Borrar todas las sesiones para este prospect
            pattern = f"session:{phone}:*"
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)


# ════════════════════════════════════════════════════════════════════════════════
# AGENT INTELLIGENCE
# ════════════════════════════════════════════════════════════════════════════════

class AgentMode(Enum):
    """Modos de respuesta por canal."""
    VOICE = "voice"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"


CHANNEL_MODE_MAP = {
    ChannelType.VOICE: AgentMode.VOICE,
    ChannelType.WHATSAPP: AgentMode.WHATSAPP,
    ChannelType.SMS: AgentMode.SMS,
    ChannelType.EMAIL: AgentMode.EMAIL,
    ChannelType.INSTAGRAM: AgentMode.INSTAGRAM,
    ChannelType.FACEBOOK: AgentMode.FACEBOOK,
}


class AgentIntelligence:
    """Motor de IA adaptativo por canal."""

    def __init__(self, session: UnifiedSession, gemini_model: str = "gemini-3.1-flash-lite"):
        self.session = session
        self.gemini_model = gemini_model

    def _build_system_prompt(self, mode: AgentMode, prospect: ProspectData) -> str:
        """Construye system prompt adaptado al canal."""

        base = f"""Eres un Agente de Ventas AI para {{empresa}}.

Prospect: {{nombre}} ({{empresa}}) — {{ciudad}}
Estado actual: {{estado}}

Eres amigable, natural, NO eres pesado. Recuerdas lo que el prospect dijo.

HISTORIAL:
{{historial}}

"""

        if mode == AgentMode.VOICE:
            base += """
MODO VÓICE:
- Habla como un colega, conversacional
- Muletillas naturales: 'eh...', 'viste?', 'claro'
- Máx 30 segundos (200 palabras)
- Eres interrumpible
- Sin formato (no uses comillas, guiones, etc)
"""
        elif mode == AgentMode.WHATSAPP:
            base += """
MODO WHATSAPP:
- Mensajes cortos (2-3 líneas máx)
- Casual: "Hola!", "Gracias!"
- Emojis sutiles (máx 1-2)
- Puedes usar bullets: • punto 1 • punto 2
- Si es larga, partela en múltiples mensajes
"""
        elif mode == AgentMode.SMS:
            base += """
MODO SMS:
- Máx 160 caracteres
- Ultra-directo
- Ejemplo: "Agendé demo mañana 2pm ¿Te sirve? SÍ/NO"
"""
        elif mode == AgentMode.EMAIL:
            base += """
MODO EMAIL:
- Subject line claro (< 50 chars)
- Párrafos cortos (2-3 líneas)
- CTA al final
- Firma profesional
"""

        return base.format(
            empresa=prospect.empresa or "tu negocio",
            nombre=prospect.nombre,
            ciudad=prospect.ciudad,
            estado=self.session.state.value,
            historial=asyncio.run(self.session.get_conversation_summary(max_recent=5)),
        )

    async def generate_response(
        self,
        user_message: str,
        channel: ChannelType,
    ) -> ChannelResponse:
        """Genera respuesta adaptada al canal."""

        mode = CHANNEL_MODE_MAP[channel]
        system_prompt = self._build_system_prompt(mode, self.session.prospect)

        # LLM call
        try:
            response = genai.GenerativeModel(self.gemini_model).generate_content(
                f"{system_prompt}\n\nPROSPECT: {user_message}\n\nAGENT:",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=200,
                )
            )
            response_text = response.text.strip()
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            response_text = "Lo siento, no pude procesar tu mensaje. ¿Puedes repetir?"

        # Post-procesar según canal
        if channel == ChannelType.SMS and len(response_text) > 160:
            response_text = response_text[:157] + "..."
        elif channel == ChannelType.WHATSAPP:
            # Agregar emojis si es apropiado
            if "interesa" in response_text.lower():
                response_text += " ✅"

        return ChannelResponse(
            text=response_text,
            channel=channel,
            phone=self.session.prospect.phone,
            timestamp=datetime.now(),
            confidence=0.85,
        )


# ════════════════════════════════════════════════════════════════════════════════
# INTENT CLASSIFIER
# ════════════════════════════════════════════════════════════════════════════════

class IntentClassifier:
    """Clasifica intención del mensaje."""

    INTENT_CLASSES = {
        "greeting": "Hola, saludo",
        "question": "Pregunta",
        "objection": "Objeción, razón para no proceder",
        "confirmation": "Confirmación de cita",
        "cancellation": "Cancelación",
        "interested": "Interés en proceder",
        "not_interested": "Rechazo",
        "angry": "Cliente enojado",
    }

    async def classify(self, text: str, channel: ChannelType) -> IntentResult:
        """Clasifica intención."""

        prompt = f"""
Clasifica la intención de este mensaje ({channel.value}):

"{text}"

Opciones: {', '.join(self.INTENT_CLASSES.keys())}

Responde SOLO con: intención | confianza (0-1) | explicación breve
"""

        try:
            response = genai.GenerativeModel("gemini-3.1-flash-lite").generate_content(prompt)
            parts = response.text.strip().split("|")

            if len(parts) >= 3:
                intent = parts[0].strip()
                confidence = float(parts[1].strip())
                explanation = parts[2].strip()
            else:
                intent = "other"
                confidence = 0.5
                explanation = response.text

            return IntentResult(
                intent=intent,
                confidence=min(confidence, 1.0),
                explanation=explanation,
                channel=channel,
            )
        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            return IntentResult(
                intent="other",
                confidence=0.0,
                explanation="Error en clasificación",
                channel=channel,
            )


# ════════════════════════════════════════════════════════════════════════════════
# COMPLIANCE MANAGER
# ════════════════════════════════════════════════════════════════════════════════

class ConsentManager:
    """Verifica consentimiento por canal."""

    def __init__(self, supabase_client: SupabaseClient):
        self.supabase = supabase_client

    async def verify_consent(self, phone: str, channel: ChannelType) -> ConsentResult:
        """Verifica si hay consentimiento."""

        try:
            consents = await asyncio.to_thread(
                lambda: self.supabase.table("consents")
                .select("*")
                .eq("phone", phone)
                .eq("channel", channel.value)
                .execute()
            )

            if not consents.data:
                return ConsentResult(allowed=False, reason="no_consent_record")

            record = consents.data[0]

            # Verificar opt-out
            if record.get("opted_out_at"):
                return ConsentResult(allowed=False, reason="opted_out")

            # Verificar expiración
            expires = datetime.fromisoformat(record.get("expires_at", "2099-12-31"))
            if expires < datetime.now():
                return ConsentResult(allowed=False, reason="consent_expired")

            return ConsentResult(
                allowed=True,
                consent_date=datetime.fromisoformat(record["consented_at"]),
            )
        except Exception as e:
            logger.error(f"Error verifying consent: {e}")
            return ConsentResult(allowed=False, reason="error")

    async def register_consent(
        self,
        phone: str,
        channel: ChannelType,
        consent_method: str,
    ):
        """Registra consentimiento explícito."""

        try:
            await asyncio.to_thread(
                lambda: self.supabase.table("consents")
                .upsert({
                    "phone": phone,
                    "channel": channel.value,
                    "consented_at": datetime.now().isoformat(),
                    "expires_at": (datetime.now() + timedelta(days=730)).isoformat(),
                    "consent_method": consent_method,
                }, on_conflict="phone,channel")
                .execute()
            )
            logger.info(f"Consent registered: {phone} ({channel.value})")
        except Exception as e:
            logger.error(f"Error registering consent: {e}")

    async def register_optout(self, phone: str, channel: ChannelType):
        """Registra opt-out."""

        try:
            await asyncio.to_thread(
                lambda: self.supabase.table("consents")
                .update({"opted_out_at": datetime.now().isoformat()})
                .eq("phone", phone)
                .eq("channel", channel.value)
                .execute()
            )
            logger.warning(f"OPT-OUT: {phone} ({channel.value})")
        except Exception as e:
            logger.error(f"Error registering optout: {e}")


# ════════════════════════════════════════════════════════════════════════════════
# CHANNEL HANDLERS (PROTOCOL)
# ════════════════════════════════════════════════════════════════════════════════

class ChannelHandler(Protocol):
    """Interfaz base para todos los handlers."""

    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Procesa mensaje entrante."""
        ...

    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía respuesta."""
        ...


# ════════════════════════════════════════════════════════════════════════════════
# WHATSAPP HANDLER
# ════════════════════════════════════════════════════════════════════════════════

class WhatsAppHandler:
    """Handler para WhatsApp (Twilio)."""

    def __init__(
        self,
        twilio_client: TwilioClient,
        memory: SharedMemory,
        consent_manager: ConsentManager,
        intent_classifier: IntentClassifier,
    ):
        self.twilio = twilio_client
        self.memory = memory
        self.consent_manager = consent_manager
        self.classifier = intent_classifier

    async def receive_message(self, msg: ChannelMessage) -> Optional[ChannelResponse]:
        """Procesa mensaje entrante de WhatsApp."""

        # 1. Verificar consentimiento
        consent = await self.consent_manager.verify_consent(msg.phone, ChannelType.WHATSAPP)
        if not consent.allowed:
            logger.warning(f"Consentimiento denegado: {msg.phone}")
            return None

        # 2. Cargar sesión
        session = await self.memory.load_session(msg.phone, msg.metadata.get("software_id", ""))
        if not session:
            # Primera vez en WhatsApp → crear sesión
            prospect_data = ProspectData(
                phone=msg.phone,
                nombre=msg.metadata.get("nombre", ""),
                empresa=msg.metadata.get("empresa", ""),
                ciudad=msg.metadata.get("ciudad", ""),
                software_id=msg.metadata.get("software_id", ""),
            )
            session = UnifiedSession(msg.phone, prospect_data.software_id, prospect_data)

        # 3. Agregar mensaje del usuario
        await session.add_message(ChannelType.WHATSAPP, msg.text, "user")

        # 4. Clasificar intención
        intent = await self.classifier.classify(msg.text, ChannelType.WHATSAPP)
        logger.info(f"Intent: {intent.intent} (conf: {intent.confidence})")

        # 5. Generar respuesta
        agent = AgentIntelligence(session)
        response = await agent.generate_response(msg.text, ChannelType.WHATSAPP)

        # 6. Actualizar sesión
        await session.add_message(ChannelType.WHATSAPP, response.text, "assistant")

        # 7. Persistir
        await self.memory.save_session(session)
        await self.memory.save_message(msg.phone, session.message_history[-1])

        return response

    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía por WhatsApp (Twilio)."""

        try:
            message = self.twilio.messages.create(
                body=response.text,
                from_="whatsapp:+1234567890",  # Tu número Twilio
                to=f"whatsapp:{response.phone}",
            )
            logger.info(f"WhatsApp enviado a {response.phone}: {message.sid}")
            return {"status": "sent", "sid": message.sid}
        except Exception as e:
            logger.error(f"Error sending WhatsApp: {e}")
            return {"status": "error", "message": str(e)}


# ════════════════════════════════════════════════════════════════════════════════
# CHANNEL DISPATCHER
# ════════════════════════════════════════════════════════════════════════════════

class Dispatcher:
    """Orquestador central de canales."""

    def __init__(
        self,
        memory: SharedMemory,
        consent_manager: ConsentManager,
        intent_classifier: IntentClassifier,
        twilio_client: TwilioClient,
    ):
        self.memory = memory
        self.consent_manager = consent_manager
        self.classifier = intent_classifier
        self.twilio = twilio_client

        # Registrar handlers
        self.handlers = {
            ChannelType.WHATSAPP: WhatsAppHandler(
                twilio_client,
                memory,
                consent_manager,
                intent_classifier,
            ),
        }

    async def route_message(self, msg: ChannelMessage) -> Optional[dict]:
        """Enruta un mensaje al handler correcto."""

        logger.info(f"Routing: {msg.channel.value} from {msg.phone}")

        # Obtener handler
        handler = self.handlers.get(msg.channel)
        if not handler:
            logger.error(f"No handler para {msg.channel.value}")
            return None

        # Procesar
        response = await handler.receive_message(msg)
        if not response:
            return None

        # Enviar
        result = await handler.send_message(response)
        return result


# ════════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ════════════════════════════════════════════════════════════════════════════════

app = FastAPI(title="MultiChannel SDR AI")

# Inicializar clientes
GEMINI_API_KEY = "tu-gemini-api-key"
SUPABASE_URL = "tu-supabase-url"
SUPABASE_KEY = "tu-supabase-key"
REDIS_URL = "redis://localhost:6379"
TWILIO_ACCOUNT_SID = "tu-account-sid"
TWILIO_AUTH_TOKEN = "tu-auth-token"

genai.configure(api_key=GEMINI_API_KEY)

supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

memory = SharedMemory(REDIS_URL, supabase_client)
consent_manager = ConsentManager(supabase_client)
intent_classifier = IntentClassifier()
dispatcher = Dispatcher(memory, consent_manager, intent_classifier, twilio_client)


@app.on_event("startup")
async def startup():
    await memory.initialize()
    logger.info("MultiChannel Dispatcher initialized")


@app.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request) -> JSONResponse:
    """Webhook de Twilio WhatsApp."""

    form = await request.form()
    phone = form.get("From", "").replace("whatsapp:", "")
    text = form.get("Body", "")

    if not phone or not text:
        return JSONResponse({"status": "error"}, status_code=400)

    # Construir mensaje
    msg = ChannelMessage(
        channel=ChannelType.WHATSAPP,
        phone=phone,
        session_id=f"{phone}:whatsapp",
        text=text,
        timestamp=datetime.now(),
        metadata={
            "software_id": "default",
            "nombre": "Prospect",
            "empresa": "Empresa",
            "ciudad": "Ciudad",
        },
    )

    # Enrutar
    result = await dispatcher.route_message(msg)

    # Retornar TwiML vacío (Twilio requiere respuesta)
    response = MessagingResponse()
    return JSONResponse({"status": "ok"})


@app.get("/status")
async def status() -> JSONResponse:
    """Health check."""
    return JSONResponse({
        "ok": True,
        "dispatcher": "ready",
        "channels": list(dispatcher.handlers.keys()),
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
