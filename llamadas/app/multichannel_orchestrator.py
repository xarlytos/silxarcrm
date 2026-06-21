"""MEJORA 5: Multicanal Orchestrator - Coordinar WhatsApp, Email, SMS"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class Channel(Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    SMS = "sms"
    PHONE = "phone"
    NONE = "none"


@dataclass
class ChannelMessage:
    """Mensaje adaptado a un canal específico"""
    channel: Channel
    text: str
    timestamp: datetime


class MultiChannelOrchestrator:
    """Orquestar 4 canales B2B: WhatsApp, Email, SMS, Phone"""

    def __init__(self, twilio_client=None, sendgrid_client=None, db_client=None):
        self.twilio = twilio_client
        self.sendgrid = sendgrid_client
        self.db = db_client

    async def route_message(
        self,
        prospect_id: str,
        message: str,
        priority: str = "normal"
    ) -> bool:
        """Enviar mensaje por mejor canal disponible"""

        # Preferencia por defecto para B2B
        preference_order = [
            Channel.WHATSAPP,
            Channel.EMAIL,
            Channel.SMS,
            Channel.PHONE,
        ]

        # TODO: Cargar preferencias del prospect si existen

        for channel in preference_order:
            try:
                success = await self._send_by_channel(prospect_id, message, channel)
                if success:
                    logger.info(f"Message sent via {channel.value} to {prospect_id}")
                    return True
            except Exception as e:
                logger.warning(f"Failed to send via {channel.value}: {e}")
                continue

        # Si todos fallan, queue para retry
        logger.error(f"All channels failed for {prospect_id}. Queueing for retry.")
        await self._queue_for_retry(prospect_id, message)

        return False

    async def _send_by_channel(
        self,
        prospect_id: str,
        message: str,
        channel: Channel
    ) -> bool:
        """Enviar por canal específico"""

        # Adaptar mensaje al canal
        adapted_message = self._adapt_message_for_channel(message, channel)

        if channel == Channel.WHATSAPP:
            return await self._send_whatsapp(prospect_id, adapted_message)

        elif channel == Channel.EMAIL:
            return await self._send_email(prospect_id, adapted_message)

        elif channel == Channel.SMS:
            return await self._send_sms(prospect_id, adapted_message)

        elif channel == Channel.PHONE:
            logger.info(f"[TODO] Schedule phone call for {prospect_id}")
            return False  # Phone calls scheduled differently

        return False

    def _adapt_message_for_channel(self, message: str, channel: Channel) -> str:
        """Adaptar mensaje al tono/limite del canal"""

        if channel == Channel.WHATSAPP:
            # Casual, emojis, corto
            return f"{message} 😊\n¿Te interesa hablar ahora?"

        elif channel == Channel.SMS:
            # Muy corto (160 chars max)
            return message[:150]

        elif channel == Channel.EMAIL:
            # Formal, profesional
            return f"""
            Hola,

            {message}

            Saludos,
            [Agente]
            """

        elif channel == Channel.PHONE:
            return message

        return message

    async def _send_whatsapp(self, prospect_id: str, message: str) -> bool:
        """Enviar WhatsApp via Twilio"""
        try:
            if not self.twilio:
                logger.warning("Twilio client not configured")
                return False

            # TODO: Implementar con Twilio API
            # message = self.twilio.messages.create(
            #     from_="whatsapp:+1...",
            #     to=f"whatsapp:+{phone}",
            #     body=message
            # )
            logger.info(f"[TODO] Send WhatsApp to {prospect_id}")
            return True

        except Exception as e:
            logger.error(f"WhatsApp send failed: {e}")
            return False

    async def _send_email(self, prospect_id: str, message: str) -> bool:
        """Enviar Email via SendGrid"""
        try:
            if not self.sendgrid:
                logger.warning("SendGrid client not configured")
                return False

            # TODO: Implementar con SendGrid API
            logger.info(f"[TODO] Send Email to {prospect_id}")
            return True

        except Exception as e:
            logger.error(f"Email send failed: {e}")
            return False

    async def _send_sms(self, prospect_id: str, message: str) -> bool:
        """Enviar SMS via Twilio"""
        try:
            if not self.twilio:
                logger.warning("Twilio client not configured")
                return False

            # TODO: Implementar con Twilio API
            logger.info(f"[TODO] Send SMS to {prospect_id}")
            return True

        except Exception as e:
            logger.error(f"SMS send failed: {e}")
            return False

    async def _queue_for_retry(self, prospect_id: str, message: str):
        """Queue mensaje para reintentar después"""
        # TODO: Implementar con BD
        logger.info(f"[TODO] Queue message for {prospect_id} for retry")


class UnifiedMemory:
    """Memoria unificada visible en todos los canales"""

    def __init__(self, prospect_id: str, db_client=None):
        self.prospect_id = prospect_id
        self.db = db_client

    async def load_context(self) -> str:
        """Cargar contexto completo de todos los canales"""

        # TODO: Implementar query real a BD que obtenga:
        # - Profile del prospect
        # - Últimas 3 interacciones (cualquier canal)
        # - Estado actual del deal

        context = f"""
        PROSPECT: {self.prospect_id}

        RECENT INTERACTIONS (all channels):
        [Últimas 3 interacciones]

        CURRENT STATE:
        [Status del deal]
        """

        return context

    async def log_interaction(
        self,
        channel: Channel,
        direction: str,  # "inbound", "outbound"
        message: str,
        timestamp: datetime = None
    ):
        """Loguear interacción en cualquier canal"""

        if timestamp is None:
            timestamp = datetime.now()

        # TODO: Guardar en BD
        logger.info(
            f"Logged {direction} {channel.value} for {self.prospect_id} at {timestamp}"
        )
