# MULTICHANNEL: REQUISITOS TÉCNICOS, COMPLIANCE & COSTOS

---

## 1. REQUISITOS TÉCNICOS POR CANAL

### TELÉFONO (Twilio Voice)

| Aspecto | Detalle | Notas |
|--------|---------|-------|
| **API** | Twilio Voice REST + Media Streams | WebSocket para audio en tiempo real |
| **Codec** | mu-law 8kHz | Estándar telefonía |
| **Latencia Requerida** | < 200ms TTFA | 75-150ms con ElevenLabs |
| **Throughput** | 1 sesión = 1 conexión | Máx ~1000 sesiones simultáneas en un servidor |
| **Prerequisitos** | Número Twilio válido, configuración TwiML | Whitelist de IPs si aplica |
| **Auth** | Account SID + Auth Token | OAuth2 opcional |
| **Compliance** | Registro de llamadas (obligatorio MX) | Consentimiento explícito |
| **Precio** | $0.05/min saliente, $0.01-0.02/min entrante | Más caro, pero síncrono |

**Stack Actual:**
```
Twilio Voice → AudioBridge → GeminiLive/ElevenLabs STT
                                      ↓ (respuesta)
                           ElevenLabs TTS → AudioBridge → Twilio
```

---

### WHATSAPP (Twilio + Meta API)

| Aspecto | Detalle | Notas |
|--------|---------|-------|
| **API** | Twilio Messaging API O Meta Graph API | Twilio más simple, Meta nativo |
| **Autenticación** | Twilio: Account SID + Auth Token | Meta: Long-lived access token + Business ID |
| **Rate Limit** | ~60 msg/segundo por vendor | Throttling automático |
| **Media Support** | Sí (imágenes, documentos, video) | Máx 16MB |
| **Templates** | Sí (HSM) | Requiere aprobación Meta |
| **Webhooks** | Webhook para mensajes entrantes | Retry automático si fails |
| **Consentimiento** | OBLIGATORIO (opt-in) | Cuotas regulares si no hay interacción |
| **Mensajes Garantizados** | Sí (delivery confirmation) | Timestamps de entrega |
| **Compliance** | Respetar "business hours" local | Ajustar timezone |
| **Precio** | $0.0075-0.015/msg (variable por país) | Más barato que SMS |

**Flujo:**
```
WhatsApp ← Webhook (Twilio/Meta)
   ↓
Dispatcher → Intent classifier
   ↓
AgentIntelligence (modo WHATSAPP)
   ↓
Formatted response (emojis, bullets)
   ↓
Twilio/Meta API → WhatsApp
```

**Aprobación de Templates (CRÍTICO):**
```
Meta requiere que:
1. Template esté pre-aprobado en Business Manager
2. Variables se reemplacen en runtime
3. Máximo 1000 templates por business account

Ejemplo template aprobado:
"¡Hola {{1}}! 👋 Creo que esto te puede servir. {{2}}"
Valor en runtime: "{{1}}" = "Juan", "{{2}}" = link
```

---

### SMS (Twilio)

| Aspecto | Detalle | Notas |
|--------|---------|-------|
| **API** | Twilio Messaging API | Simple REST |
| **Encoding** | UTF-8 (190 chars), Unicode si es necesario (67 chars) | Evitar acentos agresivos |
| **Rate Limit** | ~60 msg/segundo | Por subaccount |
| **Consentimiento** | OBLIGATORIO (compliance MX/US/EU) | TCPA en US, similar en MX |
| **Opt-out Keywords** | "STOP", "CANCELAR", "BAJA" | Detectar automáticamente |
| **Delivery Confirmation** | Sí (status callback) | Webhook requerido |
| **Precio** | $0.0050-0.0075/msg | Muy barato |
| **Use Cases** | Confirmaciones, recordatorios, urgencias | NO para conversación larga |
| **Compliance** | No contactar 9pm-9am (MX) | Respetar quiet hours |

**Validación de SMS:**
```python
# Antes de enviar SMS
if len(msg) > 160:
    # Truncar + remitir a WhatsApp
    msg = msg[:150] + " ... (ver WhatsApp)"

# Detectar opt-out
if any(keyword in msg.upper() for keyword in ["STOP", "CANCELAR"]):
    await register_optout(phone, ChannelType.SMS)
```

---

### EMAIL (SendGrid)

| Aspecto | Detalle | Notas |
|--------|---------|-------|
| **API** | SendGrid v3 REST | Simple, confiable |
| **Rate Limit** | Depende de plan | Pro: 5M/mes, ilimitado con API |
| **SMTP** | SMTP server opcional | REST preferible para escalabilidad |
| **Autenticación** | API Key | Bearer token en header |
| **Compliance** | GDPR (unsubscribe link obligatorio) | CAN-SPAM, CASL |
| **Bounce Handling** | Webhooks para bounces/spam reports | Automático en SendGrid |
| **Attachments** | Sí (base64 inline) | Máx 30MB |
| **Precio** | $9.95-99/mes (planes) o $0.10/1000 | Free tier: 100/día |
| **Deliverability** | Excelente (99%+) | SPF/DKIM/DMARC configurados |
| **Templates** | Dynamic templates (Handlebars) | Reutilizable, versioning |

**Plantilla email (ejemplo):**
```html
<!--SendGrid Dynamic Template-->
<h1>Hola {{prospect.nombre}}!</h1>
<p>En {{prospect.empresa}} hemos visto que:</p>
<ul>
  <li>Pierden {{stats.no_shows}}% de citas</li>
  <li>Esto representa ${{stats.loss}} anuales</li>
</ul>
<a href="{{demo_link}}" class="btn">Agendar demo de 15 min</a>
```

**Compliance obligatoria:**
```html
<p style="font-size: 10px;">
  <a href="{{unsubscribe_link}}">Desuscribirse</a> | 
  <a href="{{preferences_link}}">Preferencias</a>
</p>
```

---

### INSTAGRAM (Meta Graph API)

| Aspecto | Detalle | Notas |
|--------|---------|-------|
| **API** | Meta Graph API v18.0+ | Mismo token que Facebook |
| **Canales** | DM + Story mentions | Story = más viral |
| **Webhooks** | Webhook para nuevos mensajes | Retry x3 si fails |
| **Media** | Imágenes, carruseles, stories | Máx 8MB por archivo |
| **Rate Limit** | ~60 msg/segundo | Shared con Facebook |
| **Consentimiento** | NO obligatorio (usuario optó seguir) | Pero respetar community guidelines |
| **Autenticación** | Long-lived token (60 días auto-refresh) | Business Manager |
| **Compliance** | Instagram ToS (no spam, phishing, etc) | Meta puede bloquear business account |
| **Precio** | INCLUIDO en Meta Business suite | Solo pagar por ads si quieres promoción |

**Casos de uso:**
```
1. Story Mention:
   Prospect etiqueta al agente en su story
   → Webhook dispara
   → Agent responde por DM
   
2. DM directo:
   Prospect envía DM
   → Webhook dispara
   → Generate respuesta (modo INSTAGRAM: trendy, narrativo)
   
3. Conversación Continua:
   Un DM puede llevar a conversación multi-mensaje
   → Usar context (mensaje anterior)
   → Emojis naturales
```

---

### FACEBOOK (Meta Graph API)

| Aspecto | Detalle | Notas |
|--------|---------|-------|
| **API** | Meta Graph API (mismo que Instagram) | Mismo token |
| **Canales** | Messenger + Page comments | Públicos (comments) vs privados (DM) |
| **Webhooks** | Page_messages, message_postbacks | Postbacks para CTAs |
| **Media** | Imágenes, videos, carruseles | Templates similares a WhatsApp |
| **Rate Limit** | ~60 msg/segundo | Shared con Instagram |
| **Consentimiento** | NO obligatorio (usuario optó) | Business page = lower trust |
| **Autenticación** | Page access token (long-lived) | Refresh cada 60 días |
| **Compliance** | Facebook Community Standards | Más estricto que Instagram |
| **Precio** | INCLUIDO | Solo pagar por ads |

**Diferencia Messenger vs Comments:**
```
MESSENGER (Privado):
- Lead entra en conversación 1:1
- Mejor para sales/seguimiento
- Más conversacional

PAGE COMMENTS (Público):
- Otros ven la interacción
- Community-first
- Mejor para discovery/engagement
- Usar @mentions para engagement
```

---

## 2. MATRIZ DE COMPLIANCE

### Por Jurisdicción

| Jurisdicción | Hora Silencio | Canales OK | Consentimiento | Opt-out Keyword | DNC Registry | Notas |
|-------------|--------------|-----------|----------------|-----------------|-------------|-------|
| **MÉXICO** | 21:00 - 09:00 | Teléfono, WhatsApp, SMS, Email | SÍ (AEPD-like) | CANCELAR, STOP | N/A | Ley Telecom MX |
| **ESPAÑA** | N/A | WhatsApp, Email, SM, DM | SÍ (GDPR) | BAJA, STOP | SÍ (CNMC) | Más estricto |
| **USA** | 21:00 - 08:00 | SMS, Voice, Email | SÍ (TCPA) | STOP | SÍ (DNC list) | Máx multas |
| **LATAM** | 21:00 - 09:00 | Similar MX | SÍ | CANCELAR | N/A | Varía por país |

### Checklist de Compliance

```python
COMPLIANCE_CHECKS = {
    "mexico": {
        "voice": {
            "quiet_hours": ("21:00", "09:00"),
            "consent_required": True,
            "opt_out_keywords": ["CANCELAR", "STOP", "BORRAR"],
            "recording_required": True,  # AEPD
            "legal_basis": "Telecom MX Art. 74",
        },
        "whatsapp": {
            "quiet_hours": None,  # 24/7 OK si hay consentimiento
            "consent_required": True,  # HSM requires opt-in
            "opt_out_keywords": ["CANCELAR", "STOP"],
            "template_approval": True,  # Meta approval
        },
        "sms": {
            "quiet_hours": ("21:00", "09:00"),
            "consent_required": True,
            "opt_out_keywords": ["CANCELAR", "STOP"],
        },
        "email": {
            "quiet_hours": None,
            "consent_required": True,  # Similar GDPR
            "unsubscribe_required": True,
            "preference_center": True,
        },
    }
}

async def check_compliance(phone, channel, country):
    rules = COMPLIANCE_CHECKS[country][channel]
    
    # 1. Verificar quiet hours
    if rules.get("quiet_hours"):
        if is_in_quiet_hours(rules["quiet_hours"]):
            return False, "quiet_hours"
    
    # 2. Verificar consentimiento
    if rules.get("consent_required"):
        if not await has_consent(phone, channel):
            return False, "no_consent"
    
    # 3. Verificar opt-out
    if phone in DO_NOT_CALL_LIST:
        return False, "dnc_list"
    
    return True, "ok"
```

---

## 3. TABLA DE COSTOS (USD/mes)

### Escenario: 10,000 prospects, 30% conversion, 3 toques por prospect

**10,000 prospects × 30% interested = 3,000 conversaciones**
**3,000 × 3 toques promedio = 9,000 touchpoints/mes**

| Canal | Precio Unit | # Mensajes | Costo/mes | Acum. |
|-------|-----------|-----------|-----------|-------|
| **Teléfono** | $0.05/min | 3,000 × 2min | $300 | $300 |
| **WhatsApp** | $0.0075/msg | 3,000 (promedio 2 msgs) | $45 | $345 |
| **SMS** | $0.005/msg | 2,000 (confirmaciones) | $10 | $355 |
| **Email** | $0.10/1000 | 2,000 (nurturing) | $0.20 | $355 |
| **Instagram** | FREE | — | $0 | $355 |
| **Facebook** | FREE | — | $0 | $355 |
| **LLM (Gemini)** | $0.075/1M tokens | ~5M tokens/mes | $0.375 | $355 |
| **Voice Gen (optional)** | $0.30/1M chars | ~1M chars/mes | $0.30 | $355 |
| **Memory (Supabase)** | $25-100/mes | Storage + queries | $50 | $405 |
| **Cache (Redis)** | $6-20/mes | Sessions + cache | $10 | $415 |

**TOTAL: ~$415/mes para 10,000 prospects (4 céntimos por prospect)**

### Scaling

| Escenario | Prospects | Touchpoints | Teléfono | WhatsApp | Total |
|-----------|-----------|------------|----------|----------|-------|
| MVP | 100 | 300 | $15 | $2 | $30 |
| Small | 1,000 | 3,000 | $150 | $20 | $250 |
| **Medium** | **10,000** | **9,000** | **$300** | **$45** | **$415** |
| Large | 50,000 | 45,000 | $1,500 | $225 | $2,100 |
| XL | 100,000 | 90,000 | $3,000 | $450 | $4,200 |

---

## 4. REQUISITOS DE INFRAESTRUCTURA

### Desarrollo

```
Laptop + Docker:
- Redis (docker run redis)
- Supabase local (supabase start)
- Ngrok para webhooks (ngrok http 8000)
- FastAPI (uvicorn)
```

### Staging

```
AWS/GCP:
- EC2 t3.small (2 vCPU, 2GB RAM) — $20/mes
- RDS PostgreSQL (supabase managed)
- ElastiCache Redis (6GB) — $15/mes
- Load balancer (si múltiples instancias)
Total: ~$150/mes
```

### Producción

```
AWS/GCP:
- EC2 c5.xlarge (4 vCPU, 8GB RAM) × 2 — $200/mes
- RDS PostgreSQL (db.t4g.medium, replication) — $100/mes
- ElastiCache Redis (cluster, 20GB) — $50/mes
- NAT Gateway — $30/mes
- CloudFront (si distribución global) — $20/mes
- Backups automatizados — $20/mes
Total: ~$420/mes

+ Supabase enterprise (si aplica) — $500/mes
Total infraestructura: ~$920/mes
```

---

## 5. INTEGRACIONES REQUERIDAS

### API Keys & Credentials

```bash
# .env (NUNCA en repo)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_TEMPLATE_NAMESPACE=... # Meta HSM namespace

META_ACCESS_TOKEN=EAAAH...
META_BUSINESS_ACCOUNT_ID=123...
META_PAGE_ID=... # Para Facebook page

SENDGRID_API_KEY=SG.xxx...
SENDGRID_SENDER_EMAIL=noreply@company.com

GEMINI_API_KEY=AIzaSy...

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhb... # service_role (server-side only)

REDIS_URL=redis://user:pass@host:6379/0
```

### SDKs Requeridos

```python
# requirements.txt

# Twilio (voice + messaging)
twilio==9.3.2

# Google Gemini
google-generativeai==0.5.2

# Supabase
supabase==2.4.3

# Redis
redis==5.0.1

# FastAPI
fastapi==0.109.0
uvicorn==0.27.0

# Async HTTP
httpx==0.27.0

# Pydantic (validation)
pydantic==2.6.2

# Logging & Monitoring
python-json-logger==2.0.7
prometheus-client==0.19.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.2
```

---

## 6. SECURITY REQUIREMENTS

### Validación de Webhooks

```python
# Twilio webhook signature
from twilio.request_validator import RequestValidator

@app.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    form = await request.form()
    
    # Validar que viene de Twilio
    validator = RequestValidator(TWILIO_AUTH_TOKEN)
    request_valid = validator.validate(
        request.url,
        form,
        request.headers.get("X-Twilio-Signature", "")
    )
    
    if not request_valid:
        raise HTTPException(status_code=403, detail="Invalid signature")
```

### Encryption

```python
# Cifrar datos sensibles en Supabase
from cryptography.fernet import Fernet

cipher = Fernet(ENCRYPTION_KEY)
encrypted_phone = cipher.encrypt(phone.encode())

# Almacenar encrypted_phone en base de datos
```

### Rate Limiting

```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/whatsapp/webhook")
@limiter.limit("1000/hour")  # Por IP
async def whatsapp_webhook(request: Request):
    # ...
    pass
```

---

## 7. TESTING STRATEGY

### Unit Tests

```python
# tests/channels/test_intent_classifier.py
@pytest.mark.asyncio
async def test_classify_greeting():
    classifier = IntentClassifier()
    result = await classifier.classify("Hola!", ChannelType.WHATSAPP)
    assert result.intent == "greeting"
    assert result.confidence > 0.7
```

### Integration Tests

```python
# tests/integration/test_whatsapp_e2e.py
@pytest.mark.asyncio
async def test_whatsapp_flow_end_to_end():
    """Test completo: recibir → procesar → responder."""
    msg = ChannelMessage(
        channel=ChannelType.WHATSAPP,
        phone="+52 55 1234 5678",
        text="¿Cuánto cuesta?"
    )
    
    response = await dispatcher.route_message(msg)
    
    assert response.text is not None
    assert "precio" in response.text.lower()
    assert response.channel == ChannelType.WHATSAPP
```

### Load Tests

```python
# tests/load/test_load.py (k6.io)
import http from 'k6/http';

export default function () {
  for (let i = 0; i < 100; i++) {
    http.post('http://localhost:8000/channels/whatsapp', {
      From: `whatsapp:+525512345${i}`,
      Body: 'Hola'
    });
  }
}
```

---

## 8. DEPLOYMENT CHECKLIST

- [ ] Supabase schema migrado
- [ ] Redis cluster configurado
- [ ] Twilio account preparado
- [ ] Meta business account y tokens
- [ ] SendGrid configurado
- [ ] DNS + SSL certificados
- [ ] Firewalls y security groups
- [ ] Webhooks apuntando a dominio correcto
- [ ] Monitoring y alertas activas
- [ ] Backups automáticos
- [ ] Load testing pasado
- [ ] Compliance review aprobada
- [ ] Documentación actualizada
- [ ] Team capacitado
- [ ] Rollback plan documentado

---

## 9. RESUMEN EJECUTIVO

**Si quieres multichannel:**

✅ **INVERSIÓN INICIAL:** $0 (APIs gratuitas/trial)
✅ **COSTO MENSUAL:** $415 (10k prospects) + $920 infraestructura
✅ **TIEMPO IMPLEMENTACIÓN:** 8 semanas (Fase 1-3 completa)
✅ **ROI:** Mejora 40-60% en conversión al permitir seguimiento asíncrono

**Recomendación:** 
- Empezar con WhatsApp + SMS (4 semanas)
- Agregar Email (2 semanas)
- Luego social (Instagram/Facebook)
- Teléfono ya lo tienes, solo lo unes al orquestador
