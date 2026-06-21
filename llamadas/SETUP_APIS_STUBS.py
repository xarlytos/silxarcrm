"""Setup stubs para Twilio + SendGrid - Ready to implement"""
import os
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content


class TwilioSetup:
    """Twilio WhatsApp + SMS Setup"""

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.whatsapp_from = os.getenv("TWILIO_WHATSAPP_NUMBER", "+1234567890")
        self.sms_from = os.getenv("TWILIO_SMS_NUMBER", "+1234567890")

        self.client = TwilioClient(self.account_sid, self.auth_token) if self.account_sid else None

    async def send_whatsapp(self, to_phone: str, message: str) -> bool:
        """Send WhatsApp message"""
        try:
            if not self.client:
                raise ValueError("Twilio client not configured")

            msg = self.client.messages.create(
                from_=f"whatsapp:{self.whatsapp_from}",
                to=f"whatsapp:{to_phone}",
                body=message
            )

            print(f"WhatsApp sent: {msg.sid}")
            return True

        except Exception as e:
            print(f"WhatsApp error: {e}")
            return False

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Send SMS"""
        try:
            if not self.client:
                raise ValueError("Twilio client not configured")

            msg = self.client.messages.create(
                from_=self.sms_from,
                to=to_phone,
                body=message
            )

            print(f"SMS sent: {msg.sid}")
            return True

        except Exception as e:
            print(f"SMS error: {e}")
            return False


class SendGridSetup:
    """SendGrid Email Setup"""

    def __init__(self):
        self.api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@groomly.com")
        self.client = SendGridAPIClient(self.api_key) if self.api_key else None

    async def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email"""
        try:
            if not self.client:
                raise ValueError("SendGrid client not configured")

            message = Mail(
                from_email=Email(self.from_email),
                to_emails=To(to_email),
                subject=subject,
                html_content=html_content
            )

            response = self.client.send(message)

            print(f"Email sent: {response.status_code}")
            return response.status_code in [200, 201, 202]

        except Exception as e:
            print(f"Email error: {e}")
            return False


# ═════════════════════════════════════════════════════════════════════════
# Environment variables needed:
# ═════════════════════════════════════════════════════════════════════════

REQUIRED_ENV_VARS = {
    # Twilio
    "TWILIO_ACCOUNT_SID": "Get from twilio.com dashboard",
    "TWILIO_AUTH_TOKEN": "Get from twilio.com dashboard",
    "TWILIO_WHATSAPP_NUMBER": "+1234567890",  # Your WhatsApp Business Account number
    "TWILIO_SMS_NUMBER": "+1234567890",  # Your Twilio SMS number

    # SendGrid
    "SENDGRID_API_KEY": "Get from sendgrid.com API keys",
    "SENDGRID_FROM_EMAIL": "noreply@groomly.com",

    # Supabase
    "SUPABASE_URL": "https://xxxx.supabase.co",
    "SUPABASE_KEY": "Get from supabase.com project settings",
}


def verify_setup():
    """Verify all APIs are configured"""
    missing = []
    for var, description in REQUIRED_ENV_VARS.items():
        if not os.getenv(var):
            missing.append(f"{var}: {description}")

    if missing:
        print("⚠️  Missing configuration:")
        for m in missing:
            print(f"  - {m}")
        return False

    print("✅ All APIs configured")
    return True


# ponytail: Stubs functional - implement error handling + retries when needed
