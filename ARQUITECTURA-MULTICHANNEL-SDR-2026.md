# ARQUITECTURA MULTICANAL PARA SDR AI — 2026

**Documento de Investigación & Propuesta Arquitectónica**

---

## TABLA DE CONTENIDOS

1. [Estado Actual](#estado-actual)
2. [Propuesta Multicanal](#propuesta-multichannel)
3. [Componentes de Orquestación](#componentes-de-orquestación)
4. [Canal por Canal](#canal-por-canal)
5. [NLU Adaptativo por Canal](#nlu-adaptativo-por-canal)
6. [Memory Compartida](#memory-compartida)
7. [Priorización y Conflicto](#priorización-y-conflicto)
8. [Cumplimiento y Consentimiento](#cumplimiento-y-consentimiento)
9. [Stack de APIs](#stack-de-apis)
10. [Ejemplo End-to-End](#ejemplo-end-to-end)
11. [Roadmap de Implementación](#roadmap-de-implementación)

---

## ESTADO ACTUAL

**Arquitectura Monolítica (Twilio únicamente)**

```
Cliente (Teléfono)
     ↓ (Twilio Media Streams)
FastAPI /media WebSocket
     ↓
AudioBridge (conversión mu-law ↔ PCM 16k)
     ↓
GeminiLiveSession / HybridSession (ElevenLabs)
     ↓
System Prompt (inyectado con contexto del CRM)
     ↓
Conversation Store (Redis) + PostgreSQL (logging)
```

**Limitaciones:**
- Solo voz síncrona (no funciona en horarios nocturnos de EU para clientes LATAM)
- Colas de espera de Twilio (hasta 2min)
- Experiencia de usuario pobre en dispositivos móviles (llamadas no siempre funcionan en navegador)
- Sin persistencia más allá de la llamada (sin continuidad)
- Un canal = un flujo, imposible switchear a mitad de conversación

---

## PROPUESTA MULTICHANNEL

**Un mismo agente, 6 canales de comunicación:**

| Canal | Tecnología | Modo | Casos de Uso | Disponibilidad |
|-------|-----------|------|-------------|-----------------|
| **Teléfono** | Twilio Voice | Síncrono | Call center, urgencias | Comercial (9-18h) |
| **WhatsApp** | Twilio + Meta API | Asíncrono + Síncrono | Seguimiento, citas, nurturing | 24/7 |
| **SMS** | Twilio | Asíncrono | Recordatorios, promociones, no-show | 24/7 |
| **Email** | SendGrid | Asíncrono | Nurturing, propuestas, documentos | 24/7 |
| **Instagram DM** | Meta Graph API | Asíncrono | Social selling, engagement | 24/7 |
| **Facebook Messenger** | Meta Graph API | Asíncrono | Discovery, lead gen, soporte | 24/7 |

---

## COMPONENTES DE ORQUESTACIÓN

### 1. CHANNEL DISPATCHER (Núcleo)

**Responsabilidad:** Enrutar mensajes entrantes al handler correcto.

```python
# app/channels/dispatcher.py

from enum import Enum
from typing import Protocol

class ChannelType(str, Enum):
    VOICE = "voice"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"

class ChannelMessage:
    """Envelope universal para cualquier canal."""
    channel: ChannelType
    session_id: str  # unified across channels
    phone: str
    text: str | None  # for async
    media: list[dict] | None  # images, etc.
    timestamp: datetime
    metadata: dict  # channel-specific fields
        # WhatsApp: {"message_type": "template|text|media", "group_id": "..."}
        # Email: {"subject": "...", "thread_id": "..."}
        # Instagram: {"story_mentioned": False, "reply_to_story": True}

class ChannelHandler(Protocol):
    """Interfaz que todos los handlers deben cumplir."""
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Procesa un mensaje entrante."""
        ...
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía respuesta de vuelta por el canal."""
        ...
    
    async def handle_error(self, error: Exception, msg: ChannelMessage):
        """Manejo de fallos específico del canal."""
        ...

class Dispatcher:
    """Orquestador central."""
    def __init__(self):
        self.handlers: dict[ChannelType, ChannelHandler] = {}
        self.memory_layer = SharedMemory()  # Redis + Supabase
        self.state_engine = StateEngine()  # máquina de estado universal
    
    async def route_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Punto de entrada único."""
        # 1. Verificar consentimiento
        await self._verify_consent(msg)
        
        # 2. Cargar contexto compartido (prospect data, conversation history)
        context = await self.memory_layer.load_context(msg.phone)
        
        # 3. Enrutar al handler del canal
        handler = self.handlers[msg.channel]
        response = await handler.receive_message(msg)
        
        # 4. Actualizar memoria compartida
        await self.memory_layer.save_context(msg.phone, response)
        
        # 5. Enviar respuesta
        return await handler.send_message(response)
```

### 2. UNIFIED SESSION MANAGER

**Mantiene el hilo conversacional a través de canales.**

```python
# app/channels/session_manager.py

class UnifiedSession:
    """Representa el viaje del prospect a través de múltiples canales."""
    
    def __init__(self, phone: str, software_id: str):
        self.phone = phone
        self.software_id = software_id
        self.session_id = f"{phone}:{software_id}:{uuid.uuid4()}"
        
        # Historial compartido (todos los canales escriben aquí)
        self.message_history: list[Message] = []
        
        # Contexto de prospect (cargado una sola vez)
        self.prospect: ProspectData = None
        
        # Estado de la conversación (compartido)
        self.state: ConversationState = ConversationState.DISCOVERY
        
        # Canales activos
        self.active_channels: set[ChannelType] = set()
        
        # Última interacción por canal
        self.last_interaction: dict[ChannelType, datetime] = {}
        
        # Memoria de largo plazo (embeddings)
        self.memory_summary: str = ""
        self.memory_embeddings: list[float] = []
    
    async def add_message(
        self, 
        channel: ChannelType, 
        text: str, 
        role: Literal["user", "assistant"]
    ) -> Message:
        """Agrega un mensaje al historial compartido."""
        msg = Message(
            channel=channel,
            role=role,
            text=text,
            timestamp=datetime.now()
        )
        self.message_history.append(msg)
        self.last_interaction[channel] = datetime.now()
        self.active_channels.add(channel)
        
        # Guardar en Redis + Supabase
        await self._persist_message(msg)
        return msg
    
    async def get_conversation_summary(self, max_tokens: int = 1000) -> str:
        """Retorna resumen para inyectar en prompts."""
        # Combina últimos N mensajes + memory_summary
        recent = self.message_history[-10:]  # últimos 10
        text = "\n".join(f"{m.role.upper()}: {m.text}" for m in recent)
        return f"{self.memory_summary}\n---RECENT---\n{text}"
    
    async def mark_channel_stale(self, channel: ChannelType, timeout_hours: int = 24):
        """Marcar canal como inactivo."""
        if channel not in self.active_channels:
            return
        
        if datetime.now() - self.last_interaction[channel] > timedelta(hours=timeout_hours):
            self.active_channels.discard(channel)
```

### 3. AGENT INTELLIGENCE LAYER

**Misma IA, diferentes "modos de habla" por canal.**

```python
# app/channels/agent_intelligence.py

class AgentMode(Enum):
    """Personalidad adaptada al canal."""
    VOICE = "voice"  # Conversacional, rápido, interrumpible
    WHATSAPP = "whatsapp"  # Casual, emoji, breve, para leer rápido
    SMS = "sms"  # Ultra-breve, 160 chars, directo
    EMAIL = "email"  # Formal, estructurado, más largo
    INSTAGRAM = "instagram"  # Trendy, visual, narrativo
    FACEBOOK = "facebook"  # Híbrido, amigable, community-first

CHANNEL_MODE_MAP = {
    ChannelType.VOICE: AgentMode.VOICE,
    ChannelType.WHATSAPP: AgentMode.WHATSAPP,
    ChannelType.SMS: AgentMode.SMS,
    ChannelType.EMAIL: AgentMode.EMAIL,
    ChannelType.INSTAGRAM: AgentMode.INSTAGRAM,
    ChannelType.FACEBOOK: AgentMode.FACEBOOK,
}

class AgentIntelligence:
    """Núcleo de IA, con prompts adaptativos."""
    
    def __init__(self, session: UnifiedSession):
        self.session = session
        self.gemini_client = GeminiClient()
        self.elevenlabs_client = ElevenLabsClient()  # solo para voz
    
    async def generate_response(
        self,
        user_message: str,
        channel: ChannelType,
    ) -> AgentResponse:
        """Genera respuesta adaptada al canal."""
        
        mode = CHANNEL_MODE_MAP[channel]
        context = await self.session.get_conversation_summary()
        
        # Construir prompt adaptativo
        system_prompt = self._build_system_prompt(mode, self.session.prospect)
        
        # LLM call
        response_text = await self.gemini_client.generate(
            system_prompt=system_prompt,
            user_message=user_message,
            context=context,
            model="gemini-3.1-flash-lite",  # rápido para todos los canales
            temperature=0.7,  # natural pero consistente
        )
        
        # Post-procesar según canal
        if channel == ChannelType.SMS:
            response_text = self._trim_to_sms(response_text)
        elif channel == ChannelType.WHATSAPP:
            response_text = self._add_whatsapp_formatting(response_text)
        elif channel == ChannelType.EMAIL:
            response_text = self._format_email_body(response_text)
        elif channel == ChannelType.INSTAGRAM:
            response_text = self._add_instagram_emojis(response_text)
        
        return AgentResponse(
            text=response_text,
            channel=channel,
            mode=mode,
            timestamp=datetime.now(),
            confidence=0.85,
        )
    
    def _build_system_prompt(self, mode: AgentMode, prospect: ProspectData) -> str:
        """Prompt único con adaptaciones por modo."""
        
        base = f"""Eres un Agente de Ventas AI para {{empresa}}.
        
Prospect: {{nombre}} ({{empresa}}) — {{ciudad}}
Situación actual: {{estado_situacion}}

TÚ ERES: Agente SDR AI humanizado, que habla de manera natural, que recuerda 
lo que el prospect dijo, que no es pesado, que no insiste si dicen "no".

CONTEXTO COMPARTIDO:
{await self.session.get_conversation_summary()}

INSTRUCCIONES POR CANAL:
"""
        
        if mode == AgentMode.VOICE:
            base += """
- Habla como un colega, no como un bot.
- Sé natural: pausas, muletillas, ritmo conversacional.
- Eres interrumpible: si dice algo, calla y escucha.
- Máx 30 segundos por turno.
"""
        elif mode == AgentMode.WHATSAPP:
            base += """
- Mensajes cortos (2-3 líneas máx por mensaje).
- Casual pero profesional: "Hola!", "Gracias!", no "Estimado".
- Emojis sutiles (máx 1-2 por mensaje).
- Puedes usar bullets: • punto 1 • punto 2
- Si es larga la info, partela en múltiples mensajes.
"""
        elif mode == AgentMode.SMS:
            base += """
- Máx 160 caracteres (un SMS de verdad).
- Ultra-directo. Solo acción.
- Ej: "Agendé tu demo para mañana a las 2pm. ¿Te sirve? Responde SÍ/NO"
"""
        elif mode == AgentMode.EMAIL:
            base += """
- Subject line claro y no-spam.
- Saludo personalizado.
- Párrafos cortos (máx 2-3 líneas).
- CTA al final (link, responder, etc).
- Firma profesional con datos de contacto.
"""
        elif mode == AgentMode.INSTAGRAM:
            base += """
- Narrativo, storytelling.
- Emojis naturales 🎯
- Pregunta al final para engagement.
- Si es posible, menciona algo visual (foto, video).
- Tono amigable, millennial-friendly.
"""
        elif mode == AgentMode.FACEBOOK:
            base += """
- Comunidad-first: "¿Otros en el grupo qué opinan?"
- Reacción a comments, no solo responder.
- CTA claro: "Haz clic aquí" / "Lee más".
- Emojis acordes a conversación grupal.
"""
        
        return base.format(
            empresa=prospect.empresa,
            nombre=prospect.nombre,
            ciudad=prospect.ciudad,
            estado_situacion=self.session.state.value,
        )
```

---

## CANAL POR CANAL

### TELÉFONO (Twilio Voice)

**Arquitectura actual mejorada:**

```python
# app/channels/voice.py

class VoiceChannel(ChannelHandler):
    """Handler para llamadas telefónicas."""
    
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Recibe audio de Twilio."""
        # 1. Transcribir con ElevenLabs STT (o Google Speech-to-Text)
        text = await self.transcribe_audio(msg.media[0])
        
        # 2. Análisis de señales (emociones, intenciones)
        signals = await self.analyze_signals(text)
        
        # 3. Generar respuesta con IA
        response = await self.agent.generate_response(
            text, 
            ChannelType.VOICE,
            signals=signals
        )
        
        # 4. Sintetizar voz
        audio = await self.synthesize_voice(response.text)
        
        return ChannelResponse(
            text=response.text,
            channel=ChannelType.VOICE,
            media=[audio],
            requires_ack=False,  # voz en tiempo real, no espera confirmación
        )
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía audio a Twilio."""
        # Twilio Media Streams: enviar frames de PCM
        # via WebSocket /media
        return {"status": "sent", "duration_ms": len(response.media[0])}
    
    async def handle_error(self, error: Exception, msg: ChannelMessage):
        """Si falla, transfer a recepcionista."""
        # Twilio Routing: <Transfer> a número de recepción
        pass

VOICE_CONFIG = {
    "pipeline": "elevenlabs",  # STT + TTS ultrarápido
    "vad_silence_ms": 150,
    "max_response_time_ms": 800,  # <= 1s para ser natural
    "elevenlabs_latency_opt": 0,
}
```

### WHATSAPP (Twilio + Meta API)

**Síncrono durante horarios, asíncrono en off-hours:**

```python
# app/channels/whatsapp.py

class WhatsAppChannel(ChannelHandler):
    """Handler para WhatsApp."""
    
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Recibe mensaje de WhatsApp."""
        
        # 1. Cargar sesión del prospect
        session = await self.memory_layer.load_session(msg.phone)
        
        # 2. Detectar tipo de mensaje
        if msg.metadata.get("type") == "template_response":
            # Prospect respondió a un template (CTA)
            return await self._handle_template_response(msg, session)
        
        elif msg.text:
            # Mensaje de texto libre
            response = await self.agent.generate_response(
                msg.text,
                ChannelType.WHATSAPP,
            )
            return response
        
        elif msg.media:
            # Foto, video, documento
            return await self._handle_media(msg, session)
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía por WhatsApp API."""
        
        if response.requires_cta:
            # Usar template con botones
            return await self.twilio_client.send_template(
                phone=response.phone,
                template_name="sales_demo_cta",
                buttons=[
                    {"id": "yes", "text": "Sí, me interesa"},
                    {"id": "no", "text": "No, gracias"},
                ]
            )
        else:
            # Mensaje de texto libre
            return await self.twilio_client.send_message(
                phone=response.phone,
                text=response.text,
            )
    
    async def _handle_template_response(self, msg: ChannelMessage, session):
        """Prospect hizo clic en un botón de template."""
        button_id = msg.metadata.get("button_id")
        
        if button_id == "yes":
            # → Generar link de Calendly, enviar
            calendly_link = await self._generate_demo_link(session.prospect)
            return ChannelResponse(
                text=f"Perfecto. Te envío un link para agendar:\n{calendly_link}",
                channel=ChannelType.WHATSAPP,
            )
        else:
            # → Guardar opt-out, no insistir
            await self._register_optout(msg.phone, ChannelType.WHATSAPP)
            return ChannelResponse(
                text="Entiendo, sin problema. Si en el futuro te interesa, me avisas. ¡Éxito! 🎉",
                channel=ChannelType.WHATSAPP,
            )

WHATSAPP_CONFIG = {
    "templates": [
        {
            "name": "sales_demo_cta",
            "text": "¡Hola {{nombre}}! Creo que esto te puede servir. ¿Abrimos una demo rápida?",
            "buttons": ["Sí, me interesa", "No, gracias"]
        },
        {
            "name": "reminder_appointment",
            "text": "Recordatorio: tu cita es mañana a las {{hora}}. ¿Confirmas?",
            "buttons": ["Confirmo", "No puedo"]
        }
    ],
    "max_message_wait_hours": 24,  # Esperar respuesta antes de insistir
}
```

### SMS (Twilio)

**Ultra-breve, recordatorios y promociones:**

```python
# app/channels/sms.py

class SMSChannel(ChannelHandler):
    """Handler para SMS."""
    
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Recibe SMS."""
        
        # SMS es ultra-breve, pero puede contener respuestas tipo:
        # "SÍ" / "NO" / "CANCELAR" / números
        
        if msg.text.upper() in ("SÍ", "SI", "YES", "Y"):
            # Confirmación
            return await self._handle_confirmation(msg)
        elif msg.text.upper() in ("NO", "CANCELAR", "STOP"):
            # Opt-out
            await self._register_optout(msg.phone, ChannelType.SMS)
            return ChannelResponse(
                text="Entendido. Te hemos eliminado de nuestros recordatorios.",
                channel=ChannelType.SMS,
            )
        else:
            # Respuesta libre → enrutar a WhatsApp (mejor para conversación)
            # El prospect prefiere escribir → canalizar a asíncrono
            return ChannelResponse(
                text="Gracias! Te escribimos por WhatsApp para más detalle.",
                channel=ChannelType.SMS,
            )
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía SMS."""
        # Verificar que no exceda 160 caracteres
        text = response.text
        if len(text) > 160:
            # Truncar + link a más info
            text = text[:150] + "... (ver WhatsApp)"
        
        return await self.twilio_client.send_sms(
            phone=response.phone,
            text=text,
        )

SMS_USE_CASES = [
    {
        "trigger": "appointment_tomorrow",
        "template": "Recordatorio: tu cita es mañana a las {{hora}}. Responde SÍ para confirmar.",
    },
    {
        "trigger": "no_show_followup",
        "template": "¿Todo ok? No llegaste a tu cita. ¿Reprogramamos? Responde SÍ.",
    },
    {
        "trigger": "promotion",
        "template": "OFERTA: 30% descuento en paquetes anuales este fin de semana. Válido hasta mañana.",
    },
]
```

### EMAIL (SendGrid)

**Nurturing, propuestas, documentos:**

```python
# app/channels/email.py

class EmailChannel(ChannelHandler):
    """Handler para Email."""
    
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Procesa respuestas a email."""
        
        # Email entrante del prospect
        subject = msg.metadata.get("subject", "Re: ...")
        body = msg.text
        
        # Detectar intención
        intent = await self.classify_email_intent(body)
        # → "interested", "not_interested", "objection", "question"
        
        if intent == "interested":
            return ChannelResponse(
                text=self._build_proposal_email(msg.phone),
                channel=ChannelType.EMAIL,
                subject="Tu propuesta personalizada",
            )
        elif intent == "objection":
            return ChannelResponse(
                text=self._build_objection_response(body),
                channel=ChannelType.EMAIL,
                subject=f"Re: {subject}",
            )
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía email."""
        
        email_msg = {
            "to": response.phone,  # el email está en prospect.email
            "from_email": "agente@silxarcrm.com",
            "subject": response.subject,
            "html": self._build_html_template(response.text),
            "reply_to": "sales@silxarcrm.com",
        }
        
        return await self.sendgrid_client.send(email_msg)
    
    def _build_html_template(self, body: str) -> str:
        """Convierte Markdown → HTML profesional."""
        return f"""
        <html>
            <body style="font-family: Arial; color: #333;">
                {markdown.markdown(body)}
                <hr>
                <p style="font-size: 12px; color: #888;">
                    © 2026 SilxaCRM. <a href="{{unsubscribe_link}}">Desuscribirse</a>
                </p>
            </body>
        </html>
        """

EMAIL_NURTURE_SEQUENCE = [
    {
        "day": 0,
        "subject": "{{nombre}}, esto podría ahorrarle {{ahorro}} anuales",
        "body": "template: pain_problem.html",
    },
    {
        "day": 2,
        "subject": "Cómo {{empresa_similar}} resolvió esto",
        "body": "template: case_study.html",
    },
    {
        "day": 5,
        "subject": "{{nombre}}, una pregunta rápida...",
        "body": "template: objection_handler.html",
    },
    {
        "day": 7,
        "subject": "Mi oferta caduca el viernes",
        "body": "template: urgency.html",
    },
]
```

### INSTAGRAM & FACEBOOK (Meta Graph API)

**Social selling + community:**

```python
# app/channels/social.py

class InstagramChannel(ChannelHandler):
    """Instagram DM + Story mentions."""
    
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Recibe DM o story mention."""
        
        # Verificar si es reply a story
        if msg.metadata.get("reply_to_story"):
            # Prospect etiquetó al agente en su story
            return await self._handle_story_mention(msg)
        
        # DM regular
        response = await self.agent.generate_response(
            msg.text,
            ChannelType.INSTAGRAM,
        )
        
        # Agregar visual si es posible
        if response.can_include_media:
            media = await self._generate_carousel(response.text)
            response.media = [media]
        
        return response
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía por Instagram."""
        
        if response.media:
            # Carousel (máx 10 imágenes)
            return await self.meta_client.send_carousel(
                user_id=response.user_id,
                cards=response.media,
            )
        else:
            # Texto + emojis
            return await self.meta_client.send_message(
                user_id=response.user_id,
                text=response.text,
            )

class FacebookChannel(ChannelHandler):
    """Facebook Messenger + Page comments."""
    
    async def receive_message(self, msg: ChannelMessage) -> ChannelResponse:
        """Recibe mensaje en Messenger o comment."""
        
        # Detectar if es page comment o DM
        if msg.metadata.get("post_id"):
            # Es un comentario en un post
            # Responder públicamente (engagement)
            return ChannelResponse(
                text=f"@{msg.metadata.get('commenter_name')} Excelente pregunta! {{respuesta}}",
                channel=ChannelType.FACEBOOK,
                visibility="public",  # otros ven la respuesta
            )
        else:
            # DM privado
            response = await self.agent.generate_response(msg.text, ChannelType.FACEBOOK)
            return response
    
    async def send_message(self, response: ChannelResponse) -> dict:
        """Envía por Facebook."""
        
        if response.visibility == "public":
            # Responder a post
            return await self.meta_client.comment_post(
                post_id=response.post_id,
                text=response.text,
            )
        else:
            # DM privado
            return await self.meta_client.send_message(
                user_id=response.user_id,
                text=response.text,
            )
```

---

## NLU ADAPTATIVO POR CANAL

**Mismo LLM, pero diferentes instrucciones y contexto.**

### Clasificación de Intención (Universal)

```python
# app/channels/intent_classifier.py

class IntentClassifier:
    """Clasifica qué quiere hacer el prospect, independiente del canal."""
    
    INTENT_CLASSES = {
        "greeting": "Hola, saludo inicial",
        "question": "Pregunta sobre el servicio",
        "objection": "Objeción, razón para decir no",
        "confirmation": "Confirmación de cita/demo",
        "cancellation": "Cancelación",
        "interested": "Interés en proceder",
        "not_interested": "Rechazo explícito",
        "angry": "Cliente enojado",
        "other": "Otro",
    }
    
    async def classify(self, text: str, channel: ChannelType) -> IntentResult:
        """Clasifica intención."""
        
        # Prompt genérico
        prompt = f"""
        Clasificar la intención del siguiente mensaje (canal: {channel.value}):
        
        "{text}"
        
        Opciones: {', '.join(self.INTENT_CLASSES.keys())}
        
        Responde con: intención | confianza (0-1) | explicación breve
        """
        
        result = await self.gemini_client.generate(
            system_prompt="Eres un clasificador de intenciones. Sé preciso.",
            user_message=prompt,
        )
        
        intent, confidence, explanation = result.split("|")
        
        return IntentResult(
            intent=intent.strip(),
            confidence=float(confidence),
            explanation=explanation.strip(),
            channel=channel,
        )

# Uso
classifier = IntentClassifier()

# Voice: "Mira, no me interesa, gracias"
result_voice = await classifier.classify("Mira, no me interesa, gracias", ChannelType.VOICE)
# → Intent: "not_interested", Confidence: 0.95

# WhatsApp: "No gracias"
result_wa = await classifier.classify("No gracias", ChannelType.WHATSAPP)
# → Intent: "not_interested", Confidence: 0.90

# Email: "Gracias por la propuesta, pero en este momento tenemos presupuesto limitado."
result_email = await classifier.classify(
    "Gracias por la propuesta, pero en este momento tenemos presupuesto limitado.",
    ChannelType.EMAIL
)
# → Intent: "objection", Confidence: 0.88
```

### Prompts Adaptados por Canal

```python
# app/channels/adaptive_prompts.py

PROMPT_ADAPTATIONS = {
    ChannelType.VOICE: {
        "tone": "conversational",
        "format": "spoken",
        "constraints": [
            "Max 30 segundos (200 palabras)",
            "Usa muletillas naturales: 'eh...', '¿viste?', 'claro'",
            "Pausas donde corresponda",
            "Sin texto entre comillas",
        ],
    },
    ChannelType.WHATSAPP: {
        "tone": "casual_professional",
        "format": "messages",
        "constraints": [
            "Máx 3-4 líneas por mensaje",
            "Múltiples mensajes OK si es compleja la info",
            "Emojis sutiles (max 1-2)",
            "Bullets con • permitidos",
        ],
    },
    ChannelType.SMS: {
        "tone": "ultra_direct",
        "format": "text",
        "constraints": [
            "Máx 160 caracteres TOTALES",
            "Solo acción + CTA",
            "Ej válido: 'Agendé tu demo mañana 2pm. ¿Te sirve? Responde SÍ/NO'",
        ],
    },
    ChannelType.EMAIL: {
        "tone": "professional",
        "format": "structured",
        "constraints": [
            "Subject line < 50 chars, sin spam triggers",
            "Párrafos cortos (2-3 líneas)",
            "CTA clara al final",
            "Firma profesional",
        ],
    },
    ChannelType.INSTAGRAM: {
        "tone": "trendy_friendly",
        "format": "narrative",
        "constraints": [
            "Storytelling natural",
            "Emojis desenfadados 🎯",
            "Pregunta al final para engagement",
            "Menciona lo visual",
        ],
    },
    ChannelType.FACEBOOK: {
        "tone": "community_first",
        "format": "social",
        "constraints": [
            "Menciona a otros: '@persona'",
            "CTAs claros: 'Haz clic aquí'",
            "Reacciona a comments (no solo responder)",
        ],
    },
}

def adapt_prompt_to_channel(
    base_prompt: str,
    channel: ChannelType,
    prospect: ProspectData
) -> str:
    """Adapta un prompt base al canal."""
    
    adaptation = PROMPT_ADAPTATIONS[channel]
    
    enhanced = f"""{base_prompt}

--- ADAPTACIÓN PARA {channel.value.upper()} ---
Tono: {adaptation['tone']}
Formato: {adaptation['format']}

Restricciones:
"""
    for constraint in adaptation['constraints']:
        enhanced += f"\n• {constraint}"
    
    return enhanced
```

---

## MEMORY COMPARTIDA

**Un prospect = un historial unificado, accesible desde cualquier canal.**

### Arquitectura de Memoria

```python
# app/channels/memory.py

class SharedMemory:
    """Capa de memoria compartida: Redis (rápida) + Supabase (persistencia)."""
    
    def __init__(self, redis_url: str, supabase_client):
        self.redis = redis.from_url(redis_url)
        self.supabase = supabase_client
    
    async def load_session(self, phone: str) -> UnifiedSession:
        """Carga sesión completa del prospect."""
        
        # 1. Intentar Redis (más rápido)
        cached = await self.redis.get(f"session:{phone}")
        if cached:
            return UnifiedSession.from_json(cached)
        
        # 2. Si no está en cache, cargar de Supabase
        session_data = await self.supabase.table("prospect_sessions").select("*").eq(
            "phone", phone
        ).single().execute()
        
        # 3. Reconstruir historial
        messages = await self.supabase.table("messages").select("*").eq(
            "phone", phone
        ).order("timestamp").execute()
        
        session = UnifiedSession(phone=phone, software_id=session_data.software_id)
        session.message_history = [Message.from_row(m) for m in messages.data]
        session.prospect = ProspectData.from_row(session_data)
        
        # 4. Guardar en Redis con TTL 24h
        await self.redis.setex(
            f"session:{phone}",
            24 * 3600,
            session.to_json()
        )
        
        return session
    
    async def save_message(self, phone: str, msg: Message):
        """Guarda un mensaje en el historial (ambos canales)."""
        
        # 1. Supabase (persistencia)
        await self.supabase.table("messages").insert({
            "phone": phone,
            "channel": msg.channel.value,
            "role": msg.role,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat(),
        }).execute()
        
        # 2. Invalidar Redis cache
        await self.redis.delete(f"session:{phone}")
    
    async def summarize_conversation(self, phone: str, max_tokens: int = 1000) -> str:
        """Genera resumen para inyectar en prompts."""
        
        session = await self.load_session(phone)
        
        # Usar embeddings para extraer puntos clave
        messages = session.message_history[-20:]  # últimos 20
        
        # Llamar a Gemini para resumir
        summary = await self.gemini_client.generate(
            system_prompt="Eres un experto en generar resúmenes concisos de conversaciones.",
            user_message=f"Resume estos mensajes en {max_tokens} tokens, extrayendo puntos clave:\n\n" + 
                         "\n".join(f"{m.role}: {m.text}" for m in messages),
            model="gemini-3.1-flash-lite",
        )
        
        return summary

# Schema Supabase

SUPABASE_SCHEMA = """
-- Tabla: prospect_sessions (una fila por prospect por software)
CREATE TABLE prospect_sessions (
    id UUID PRIMARY KEY,
    phone TEXT NOT NULL,
    software_id TEXT NOT NULL,
    prospect_data JSONB,  -- nombre, empresa, ciudad, etc.
    state TEXT DEFAULT 'discovery',  -- discovery, interested, demo_scheduled, etc.
    last_channel TEXT,  -- último canal usado
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(phone, software_id)
);

-- Tabla: messages (historial compartido entre canales)
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    phone TEXT NOT NULL,
    channel TEXT NOT NULL,  -- 'voice', 'whatsapp', 'sms', 'email', 'instagram', 'facebook'
    role TEXT NOT NULL,  -- 'user' o 'assistant'
    text TEXT,
    media JSONB,  -- URLs de imágenes, etc.
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP,
    FOREIGN KEY(phone) REFERENCES prospect_sessions(phone)
);

-- Índices
CREATE INDEX idx_messages_phone_timestamp ON messages(phone, timestamp);
CREATE INDEX idx_sessions_software ON prospect_sessions(software_id);
"""
```

### Embeddings & Semantic Search

```python
# app/channels/memory_embeddings.py

class MemoryEmbeddings:
    """Busca semántica en historial de conversaciones."""
    
    async def store_embedding(self, phone: str, text: str, channel: ChannelType):
        """Genera embedding para un mensaje."""
        
        embedding = await self.gemini_client.embed(text)
        
        await self.supabase.table("message_embeddings").insert({
            "phone": phone,
            "channel": channel.value,
            "text": text,
            "embedding": embedding,  # vector de 768 dims
        }).execute()
    
    async def find_relevant_context(self, phone: str, query: str, top_k: int = 5) -> list[str]:
        """Busca contexto relevante para un mensaje."""
        
        query_embedding = await self.gemini_client.embed(query)
        
        # Búsqueda vectorial en Supabase (pgvector)
        results = await self.supabase.rpc(
            "search_embeddings",
            {"query_embedding": query_embedding, "phone": phone, "match_count": top_k}
        ).execute()
        
        return [r['text'] for r in results.data]
```

---

## PRIORIZACIÓN Y CONFLICTO

**¿Qué pasa si el prospect responde en 2+ canales simultáneamente?**

### Estrategia de Priorización

```python
# app/channels/conflict_resolution.py

class ConflictResolver:
    """Resuelve conflictos cuando hay múltiples mensajes simultáneos."""
    
    # Prioridad de canales (más urgente = mayor número)
    CHANNEL_PRIORITY = {
        ChannelType.VOICE: 10,  # Síncrono, urgente
        ChannelType.WHATSAPP: 8,  # Casi síncrono, popular
        ChannelType.FACEBOOK: 7,  # Social, público
        ChannelType.INSTAGRAM: 6,  # Social, más privado
        ChannelType.SMS: 5,  # Confirmaciones
        ChannelType.EMAIL: 3,  # Asíncrono, formal
    }
    
    async def resolve_conflict(self, messages: list[ChannelMessage]) -> ChannelType:
        """Determina cuál mensaje procesar primero."""
        
        # Ordenar por prioridad + timestamp
        sorted_msgs = sorted(
            messages,
            key=lambda m: (
                -self.CHANNEL_PRIORITY[m.channel],  # desc por prioridad
                m.timestamp  # asc por tiempo (más antiguo primero)
            )
        )
        
        winner = sorted_msgs[0].channel
        
        # Registrar otros mensajes como "pendientes"
        for msg in sorted_msgs[1:]:
            await self._queue_for_later(msg)
        
        logger.info(f"Conflicto resuelto: procesando {winner.value}")
        return winner
    
    async def _queue_for_later(self, msg: ChannelMessage):
        """Cola un mensaje para procesar cuando el actual termine."""
        
        await self.redis.lpush(
            f"pending_messages:{msg.phone}",
            msg.to_json()
        )
        
        # Agendar procesamiento en 5 segundos
        await self.scheduler.schedule(
            f"process_pending:{msg.phone}",
            delay=5,
        )

# Ejemplo: Prospect responde en WhatsApp + SMS a la vez

# Timestamp 10:00:00 - WhatsApp: "Sí, me interesa"
# Timestamp 10:00:02 - SMS: "Agendemos algo"

# ConflictResolver.resolve_conflict() →
# 1. Procesa WhatsApp (prioridad 8, + antiguo)
# 2. Encola SMS (prioridad 5) para procesar en 5 segundos
```

### Deduplicación de Respuestas

```python
# app/channels/deduplication.py

class ResponseDeduplicator:
    """Evita enviar respuestas duplicadas a múltiples canales."""
    
    async def should_send_to_channel(
        self,
        phone: str,
        response: ChannelResponse,
        candidate_channel: ChannelType
    ) -> bool:
        """¿Debe enviarse esta respuesta también a este canal?"""
        
        # 1. Obtener últimas respuestas enviadas
        last_responses = await self.supabase.table("sent_responses").select(
            "channel, text, created_at"
        ).eq("phone", phone).order("created_at", desc=True).limit(3).execute()
        
        # 2. Verificar si es duplicada
        for last_resp in last_responses.data:
            similarity = self._calculate_similarity(response.text, last_resp['text'])
            
            if similarity > 0.9:  # 90% similar
                logger.info(f"Duplicado detectado para {candidate_channel.value}")
                return False
        
        return True
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Similitud coseno entre dos textos."""
        # Usar embeddings
        pass
```

---

## CUMPLIMIENTO Y CONSENTIMIENTO

**Verificación en cada canal, respetar GDPR + CCPA + regulaciones locales.**

### Consentimiento Verificado

```python
# app/channels/compliance.py

class ConsentManager:
    """Maneja consentimiento por canal."""
    
    async def verify_consent(self, phone: str, channel: ChannelType) -> ConsentResult:
        """Verifica si tenemos permiso para escribir por este canal."""
        
        # 1. Buscar en base de consentimientos
        consent_record = await self.supabase.table("consents").select("*").eq(
            "phone", phone
        ).eq("channel", channel.value).single().execute()
        
        if not consent_record:
            # No hay registro → denegado
            return ConsentResult(
                allowed=False,
                reason="no_consent_record",
            )
        
        record = consent_record.data
        
        # 2. Verificar expiración (consentimiento típicamente 2 años)
        if record['expires_at'] < datetime.now():
            return ConsentResult(
                allowed=False,
                reason="consent_expired",
            )
        
        # 3. Verificar opt-out
        if record['opted_out_at']:
            return ConsentResult(
                allowed=False,
                reason="opted_out",
            )
        
        return ConsentResult(
            allowed=True,
            consent_date=record['consented_at'],
        )
    
    async def register_consent(
        self,
        phone: str,
        channel: ChannelType,
        consent_method: str,  # "phone_call", "sms_opt_in", "email_click", "instagram_follow"
    ):
        """Registra consentimiento explícito."""
        
        await self.supabase.table("consents").insert({
            "phone": phone,
            "channel": channel.value,
            "consented_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=730)).isoformat(),  # 2 años
            "consent_method": consent_method,
            "ip_address": self.request.client.host if self.request else None,
        }).execute()
    
    async def register_optout(self, phone: str, channel: ChannelType):
        """Registra opt-out (STOP en SMS, unsubscribe en email, etc)."""
        
        await self.supabase.table("consents").update({
            "opted_out_at": datetime.now().isoformat(),
        }).eq("phone", phone).eq("channel", channel.value).execute()
        
        # Alertar: prospect ha optado por no recibir
        logger.warning(f"OPT-OUT: {phone} en {channel.value}")

# Schema Supabase

CONSENT_SCHEMA = """
CREATE TABLE consents (
    id UUID PRIMARY KEY,
    phone TEXT NOT NULL,
    channel TEXT NOT NULL,  -- 'voice', 'whatsapp', 'sms', 'email', etc.
    consented_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    opted_out_at TIMESTAMP,
    consent_method TEXT,  -- cómo se obtuvo el consentimiento
    ip_address TEXT,
    created_at TIMESTAMP,
    UNIQUE(phone, channel)
);
"""
```

### Cumplimiento por Jurisdicción

```python
# app/channels/jurisdiction.py

JURISDICTION_RULES = {
    "MX": {
        "channels_allowed": [ChannelType.VOICE, ChannelType.WHATSAPP, ChannelType.SMS, ChannelType.EMAIL],
        "quiet_hours": {"start": "21:00", "end": "09:00"},  # no llamar 9pm-9am
        "consent_required": True,
        "optout_keywords": ["STOP", "CANCELAR", "BORRAR"],
    },
    "ES": {
        "channels_allowed": [ChannelType.WHATSAPP, ChannelType.EMAIL, ChannelType.SMS],
        "quiet_hours": None,  # sin restricción
        "consent_required": True,  # GDPR
        "optout_keywords": ["BAJA", "STOP"],
    },
    "US": {
        "channels_allowed": [ChannelType.VOICE, ChannelType.SMS, ChannelType.EMAIL],
        "quiet_hours": {"start": "21:00", "end": "08:00"},  # FCC rules
        "consent_required": True,  # TCPA
        "optout_keywords": ["STOP"],
        "do_not_call_registry": True,  # verificar DNC list
    },
}

class JurisdictionChecker:
    async def can_contact_via_channel(
        self,
        phone: str,
        channel: ChannelType,
        country_code: str
    ) -> bool:
        """¿Es legal contactar por este canal en este país?"""
        
        rules = JURISDICTION_RULES.get(country_code)
        if not rules:
            return False  # Conservador: si no conoce la jurisdicción, no contactar
        
        # 1. Verificar si el canal está permitido
        if channel not in rules["channels_allowed"]:
            return False
        
        # 2. Verificar quiet hours
        if rules.get("quiet_hours"):
            now = datetime.now().time()
            start = datetime.strptime(rules["quiet_hours"]["start"], "%H:%M").time()
            end = datetime.strptime(rules["quiet_hours"]["end"], "%H:%M").time()
            
            if start < now < end:
                return False  # Es hora de silencio
        
        # 3. Verificar DNC registry (si aplica)
        if rules.get("do_not_call_registry") and channel == ChannelType.VOICE:
            if await self._is_in_dnc_list(phone):
                return False
        
        # 4. Verificar consentimiento explícito
        if rules.get("consent_required"):
            consent = await self.consent_manager.verify_consent(phone, channel)
            if not consent.allowed:
                return False
        
        return True
```

---

## STACK DE APIs

**Integraciones requeridas por canal:**

| Componente | Proveedor | API | Uso | Costo Est. |
|-----------|-----------|-----|-----|-----------|
| **Voice** | Twilio | REST + WebSocket | Llamadas entrantes/salientes | $0.05/min |
| **WhatsApp** | Twilio + Meta | Twilio SDK / Graph API | Mensajes, templates | $0.005/msg |
| **SMS** | Twilio | REST | SMS bidireccional | $0.0075/msg |
| **Email** | SendGrid | REST | Transaccional + marketing | $0.10/1000 |
| **Instagram** | Meta Graph API | REST | DM + story mentions | Incluido en Meta |
| **Facebook** | Meta Graph API | REST | Messenger + page comments | Incluido en Meta |
| **LLM** | Google Gemini | REST | Inteligencia AI | $0.075/1M input tokens |
| **Voice Gen** | ElevenLabs | REST + WebSocket | TTS (opcional, si no usas Gemini) | $0.30/1M chars |
| **Memory** | Supabase | REST | PostgreSQL + vectors | $25-200/mes |
| **Cache** | Redis | TCP | Session caching | $6-50/mes (AWS) |

### Stack Simplificado (MVP)

```python
# app/channels/api_stack.py

API_PROVIDERS = {
    "twilio": {
        "account_sid": os.getenv("TWILIO_ACCOUNT_SID"),
        "auth_token": os.getenv("TWILIO_AUTH_TOKEN"),
        "phone_number": os.getenv("TWILIO_PHONE_NUMBER"),
        "endpoints": {
            "voice": "https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls",
            "whatsapp": "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages",
            "sms": "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages",
        }
    },
    "meta": {
        "access_token": os.getenv("META_ACCESS_TOKEN"),
        "business_account_id": os.getenv("META_BUSINESS_ACCOUNT_ID"),
        "endpoints": {
            "instagram": "https://graph.instagram.com/v18.0/me/messages",
            "facebook": "https://graph.instagram.com/v18.0/me/messages",
        }
    },
    "sendgrid": {
        "api_key": os.getenv("SENDGRID_API_KEY"),
        "endpoints": {
            "email": "https://api.sendgrid.com/v3/mail/send",
        }
    },
    "gemini": {
        "api_key": os.getenv("GEMINI_API_KEY"),
        "endpoints": {
            "chat": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
            "embed": "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent",
        }
    },
    "supabase": {
        "url": os.getenv("SUPABASE_URL"),
        "key": os.getenv("SUPABASE_KEY"),
    },
    "redis": {
        "url": os.getenv("REDIS_URL"),
    }
}

# Inicializar clientes
class APIClients:
    def __init__(self):
        from twilio.rest import Client as TwilioClient
        from sendgrid import SendGridAPIClient
        import google.generativeai as genai
        import supabase
        import redis
        
        self.twilio = TwilioClient(
            API_PROVIDERS["twilio"]["account_sid"],
            API_PROVIDERS["twilio"]["auth_token"],
        )
        self.sendgrid = SendGridAPIClient(API_PROVIDERS["sendgrid"]["api_key"])
        genai.configure(api_key=API_PROVIDERS["gemini"]["api_key"])
        self.gemini = genai.GenerativeModel("gemini-3.1-flash-lite")
        self.supabase = supabase.create_client(
            API_PROVIDERS["supabase"]["url"],
            API_PROVIDERS["supabase"]["key"],
        )
        self.redis = redis.from_url(API_PROVIDERS["redis"]["url"])
```

---

## EJEMPLO END-TO-END

**Prospect comienza en teléfono, continúa en WhatsApp.**

### Día 1 - Llamada Entrante

```
10:00 AM
─────────────────────────────────────────────
Twilio recibe llamada de +52 55 1234 5678
└─ /voice webhook
   └─ Dispatcher.route_message(
       channel=VOICE,
       phone="+52 55 1234 5678"
   )
   └─ Cargar sesión (Redis miss → Supabase)
      └─ ProspectData: Juan García, Clínica Dental, CDMX
   └─ Build system_prompt (modo VOICE)
   └─ AudioBridge setup (mu-law 8k ↔ PCM 16k)
   └─ Gemini Live Session init
      └─ "Hola Juan, soy tu agente de ventas. Te llamo porque detecté 
          que muchas clínicas en CDMX pierden pacientes de seguimiento..."

10:45 AM
─────────────────────────────────────────────
Juan: "Mira, sí tenemos ese problema de no-shows, pero no tenemos presupuesto"
└─ STT (ElevenLabs) → "Mira, sí tenemos ese problema de no-shows, pero no tenemos presupuesto"
└─ Intent classification: "objection" (presupuesto)
└─ Agent response: "Entiendo, Juan. Precisamente por eso muchas clínicas optan por 
   el plan básico que se paga con los primeros 5 no-shows evitados. ¿Te late 
   que veamos los números?"

11:00 AM
─────────────────────────────────────────────
Juan: "Dale, pero que sea rápido"
└─ Intent: "interested"
└─ Agent: "Perfecto. Te envío un link por WhatsApp en 2 minutos para que 
   veas la demo. ¿Ese número te sirve para recibir mensajes?"
└─ TTS (ElevenLabs) → audio

11:02 AM
─────────────────────────────────────────────
Agent envía template por WhatsApp:
┌─ WHATSAPP TEMPLATE ─────────────────────────┐
│ ¡Hola Juan! 👋                              │
│                                             │
│ Como hablamos hace poco, aquí va el link    │
│ a tu demo personalizada:                    │
│                                             │
│ [VER DEMO AQUÍ] ← botón                     │
│                                             │
│ ¿Preguntas? Responde por aquí               │
└─────────────────────────────────────────────┘

└─ Memory.save_message(phone, Message(
    channel=VOICE,
    role="assistant",
    text="... Demo link..."
  ))
└─ Memory.save_message(phone, Message(
    channel=WHATSAPP,
    role="assistant",
    text="¡Hola Juan! 👋..."
  ))
└─ Prospect session actualizada:
   state = "demo_scheduled"
   active_channels = {VOICE, WHATSAPP}
   last_interaction[VOICE] = 11:00
   last_interaction[WHATSAPP] = 11:02
```

### Día 2 - Seguimiento por WhatsApp

```
09:30 AM (al día siguiente)
─────────────────────────────────────────────
Juan NO ha hecho clic en el link de demo
└─ Trigger automático: "siguientes pasos" (1 día post-call)
└─ Agent genera mensaje de seguimiento:

┌─ WHATSAPP MESSAGE ──────────────────────────┐
│ Juan, ¿Cómo estás? 😊                       │
│                                             │
│ Solo checando: ¿viste la demo? Si te       │
│ quedan dudas, aquí estoy.                   │
│                                             │
│ [AGENDAR AHORA] ← botón                    │
└─────────────────────────────────────────────┘

└─ Memory.save_message(phone, Message(
    channel=WHATSAPP,
    role="assistant",
    text="Juan, ¿Cómo estás?..."
  ))

11:15 AM
─────────────────────────────────────────────
Juan responde por WhatsApp: "Mirá, justo veo eso. Una pregunta..."
└─ Twilio webhooks /whatsapp
└─ Dispatcher.route_message(
    channel=WHATSAPP,
    phone="+52 55 1234 5678",
    text="Mirá, justo veo eso. Una pregunta..."
  )
└─ Load session (Redis hit! Sesión activa)
└─ Intent classification: "question"
└─ Agent (modo WHATSAPP) responde:

┌─ WHATSAPP MESSAGE ──────────────────────────┐
│ ¡Dale! Dispara la pregunta, estoy acá 👂   │
└─────────────────────────────────────────────┘

└─ Message history ahora contiene:
   [1] VOICE: Agent intro call
   [2] VOICE: Juan's objection
   [3] VOICE: Agent response (presupuesto)
   [4] VOICE: Juan accepts
   [5] WHATSAPP: Demo link template
   [6] WHATSAPP: Seguimiento after 1 day
   [7] WHATSAPP: Juan's question
   [8] WHATSAPP: Agent's "Dispara la pregunta"
   
   → El agente tiene contexto completo de la llamada, 
     sin necesidad de repetir

11:20 AM
─────────────────────────────────────────────
Juan: "¿Cuánto cuesta exactamente? Vimos 500 pesos pero incluye todo?"
└─ Intent: "question" (precio)
└─ Agent (WHATSAPP mode):

┌─ WHATSAPP MESSAGE ──────────────────────────┐
│ Excelente pregunta 📊                       │
│                                             │
│ • $500/mes = Recordatorios automáticos      │
│ • Incluye: WhatsApp, SMS, Email             │
│ • Sin setup, sin contrato                   │
│ • Primeros 2 meses: 30% descuento           │
│                                             │
│ ¿Agendamos en tu calendario? Solo 15 min   │
│ [AGENDAR AQUÍ]                             │
└─────────────────────────────────────────────┘

└─ Agent nota: "Juan está muy caliente, 
   no debe dejar pasar esta conversación"
└─ Agenda meeting automático si no responde 
   en 2 horas
```

### Día 4 - Recordatorio por SMS (de bajo overhead)

```
08:00 AM
─────────────────────────────────────────────
Trigger: Juan tenía meeting agendado hoy a las 2pm
└─ Recordatorio automático por SMS (menor interruption):

┌─ SMS ──────────────────────────────────────┐
│ Recordatorio: demo hoy 2pm. Confirma SÍ/NO │
└────────────────────────────────────────────┘

Juan responde: "SÍ"
└─ Intent: "confirmation"
└─ Memory.update_session(state="demo_confirmed")
└─ Guardar en calendar
└─ Posible: enviar enlace de Zoom por email

10:00 AM
─────────────────────────────────────────────
Email de confirmación:
┌─ EMAIL ────────────────────────────────────┐
│ Subject: Tu demo con SilxaCRM - Hoy 2pm    │
│                                             │
│ ¡Hola Juan!                                │
│                                             │
│ Aquí está todo para tu demo hoy:           │
│                                             │
│ 📅 Hora: 14:00 (Hora CDMX)                 │
│ 🔗 Link: https://zoom.us/...              │
│ 🎯 Qué veremos:                            │
│   • Reducir no-shows de 30% a 5%           │
│   • ROI: recuperar $8500/año               │
│   • Setup en 30 minutos                    │
│                                             │
│ Nos vemos!                                 │
│ Tu agente AI 🤖                            │
└────────────────────────────────────────────┘

└─ Message history ahora tiene 15+ mensajes 
   de 4 canales diferentes, pero unificados:
   - Contexto coherente
   - Sin repetición
   - Flujo natural
```

---

## ROADMAP DE IMPLEMENTACIÓN

### Fase 1: MVP (Semanas 1-4)

**Objetivo:** Twilio Voice + WhatsApp + Memory Compartida

```python
# Entregables
[x] Channel Dispatcher (enrutamiento básico)
[x] UnifiedSession + SharedMemory (Redis + Supabase)
[x] WhatsApp Handler (templates + respuestas)
[x] NLU adaptativo (prompts por canal)
[x] Consent manager (verificación básica)

# Código en repo
llamadas/app/channels/
  ├─ __init__.py
  ├─ dispatcher.py          # router central
  ├─ session_manager.py     # UnifiedSession
  ├─ memory.py              # SharedMemory (Redis+Supabase)
  ├─ agent_intelligence.py  # LLM + modos adaptativos
  ├─ voice.py              # Refactor de VoiceChannel
  ├─ whatsapp.py           # Nuevo
  ├─ compliance.py          # Consentimiento
  └─ intent_classifier.py   # Clasificador universal

# Tests
tests/
  ├─ test_dispatcher.py
  ├─ test_unified_session.py
  ├─ test_whatsapp_channel.py

# Estimación: 160-180 horas
```

### Fase 2: Canales Asíncronos (Semanas 5-8)

**Objetivo:** SMS + Email + nurturing automático

```python
# Nuevos handlers
llamadas/app/channels/
  ├─ sms.py               # SMS confirmaciones + recordatorios
  ├─ email.py             # SendGrid integration + nurture sequences
  ├─ nurture_engine.py    # Automatización de secuencias

# Supabase tables nuevas
- nurture_sequences (definir secuencias)
- campaign_metrics (tracking)

# Estimación: 120 horas
```

### Fase 3: Social Channels (Semanas 9-12)

**Objetivo:** Instagram + Facebook (Meta Graph API)

```python
# Nuevos handlers
llamadas/app/channels/
  ├─ instagram.py
  ├─ facebook.py
  ├─ meta_client.py        # Wrapper de Meta Graph API

# Estimación: 100 horas
```

### Fase 4: Inteligencia Avanzada (Semanas 13-16)

**Objetivo:** Priorización, conflictos, embeddings semánticos

```python
# Nuevos módulos
llamadas/app/channels/
  ├─ conflict_resolution.py    # Multi-channel conflicts
  ├─ deduplication.py          # Evitar duplicados
  ├─ memory_embeddings.py      # Búsqueda semántica
  ├─ jurisdiction.py           # Compliance regional

# Estimación: 140 horas
```

---

## ARQUITECTURA FINAL (DIAGRAMA)

```
┌─────────────────────────────────────────────────────────────────┐
│                     INBOUND MESSAGES (Webhooks)                  │
├──────────┬─────────────┬────────┬──────────┬──────────┬──────────┤
│ Twilio   │ Twilio SMS  │SendGrid│ Meta WA  │ Meta IG  │ Meta FB  │
│ Voice    │             │Webhook │ Webhook  │ Webhook  │ Webhook  │
└──────────┴─────────────┴────────┴──────────┴──────────┴──────────┘
           │
           ↓
       ┌─────────────────────────────────────────┐
       │      CHANNEL DISPATCHER                 │
       │  (Enrutamiento universal)               │
       └─────────────────────────────────────────┘
           │
           ├──→ [Consent Manager] (GDPR/CCPA)
           │
           ├──→ [Jurisdiction Checker] (MX/ES/US rules)
           │
           ├──→ [Conflict Resolver] (si múltiples canales)
           │
           ↓
       ┌─────────────────────────────────────────┐
       │   UNIFIED SESSION MANAGER               │
       │  (Un prospect = un historial)           │
       │  • message_history                      │
       │  • active_channels                      │
       │  • state (DISCOVERY → DEMO_SCHEDULED)   │
       └─────────────────────────────────────────┘
           │
           ├──→ [SharedMemory Layer]
           │    • Redis (cache 24h)
           │    • Supabase (persistencia)
           │    • Embeddings (búsqueda semántica)
           │
           ├──→ [Agent Intelligence]
           │    • Gemini LLM (gemini-3.1-flash-lite)
           │    • NLU adaptativo (6 modos)
           │    • Intent classifier
           │
           └──→ [Channel Handler]
                • VoiceChannel (Twilio Media Streams)
                • WhatsAppChannel (Twilio API)
                • SMSChannel (Twilio)
                • EmailChannel (SendGrid)
                • InstagramChannel (Meta API)
                • FacebookChannel (Meta API)
                     │
                     ├──→ Format response (canvas, emojis, etc)
                     └──→ Send via provider API
                          ↓
                    OUTBOUND MESSAGES
```

---

## CONCLUSIÓN

Esta arquitectura multicanal:

✅ **Escalable:** Agregar canales es plugin (ChannelHandler)
✅ **Resiliente:** Memory compartida en Redis + Supabase
✅ **Compliant:** Consentimiento y cumplimiento por jurisdicción
✅ **Eficiente:** Evita repetición (contexto unificado)
✅ **Natural:** NLU adaptativo, no bot-like
✅ **Económica:** MVP cuesta ~$200/mes, scales con volumen

**Próximos pasos:**
1. Crear repositorio `channels/` en codebase existente
2. Implementar Fase 1 (Dispatcher + Session + WhatsApp)
3. Test end-to-end con 5-10 prospects reales
4. Iteración sobre NLU según feedback de llamadas
