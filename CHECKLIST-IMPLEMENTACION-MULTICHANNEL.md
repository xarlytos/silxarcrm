# CHECKLIST DE IMPLEMENTACIÓN MULTICHANNEL

**Guía paso-a-paso para ir de 0 a producción en 8 semanas**

---

## FASE 0: PREPARACIÓN (Semana 1)

### Infraestructura & Setup

- [ ] **Supabase Schema**
  ```sql
  CREATE TABLE prospect_sessions_v2 (...)
  CREATE TABLE unified_messages_v2 (...)
  CREATE TABLE consents_v2 (...)
  CREATE INDEXES
  ```
  - [ ] Test INSERT/SELECT en cada tabla
  - [ ] Backup plan documentado

- [ ] **Variables de Entorno**
  ```bash
  MULTICHANNEL_ENABLED=false  # Feature flag
  CHANNELS_ACTIVE=voice,whatsapp
  META_ACCESS_TOKEN=...
  META_BUSINESS_ACCOUNT_ID=...
  SENDGRID_API_KEY=...
  REDIS_URL=redis://...
  ```
  - [ ] .env.example actualizado (sin secrets)
  - [ ] .env.local gitignored

- [ ] **Directorio de Código**
  ```
  llamadas/app/channels/
  ├─ __init__.py
  ├─ dispatcher.py
  ├─ session_manager.py
  ├─ memory.py
  ├─ agent_intelligence.py
  ├─ intent_classifier.py
  ├─ compliance.py
  ├─ handlers/
  │   ├─ __init__.py
  │   ├─ base.py
  │   ├─ voice.py
  │   └─ whatsapp.py
  └─ adaptor.py
  ```
  - [ ] Directorios creados
  - [ ] __init__.py en cada uno
  - [ ] .gitignore actualizado

- [ ] **Testing Setup**
  ```
  tests/channels/
  ├─ __init__.py
  ├─ test_dispatcher.py
  ├─ test_session_manager.py
  ├─ test_intent_classifier.py
  └─ test_compliance.py
  ```
  - [ ] pytest configurado (pytest.ini)
  - [ ] pytest-asyncio habilitado
  - [ ] Fixtures básicas creadas

### Documentación

- [ ] Arquitectura visual creada (diagrama)
- [ ] API contracts documentados (OpenAPI)
- [ ] Database schema documentado
- [ ] Team capacitado (1 reunión)

### Validación

- [ ] [ ] Código existente de voz todavía funciona
- [ ] [ ] Redis accesible desde dev
- [ ] [ ] Supabase accessible (test query)
- [ ] [ ] Feature flag `MULTICHANNEL_ENABLED=false` por defecto

---

## FASE 1: COMPATIBILITY LAYER (Semanas 2-3)

### Core Components

- [ ] **SharedMemoryV2**
  ```python
  # llamadas/app/memory_v2/memory.py
  class SharedMemoryV2:
      async def initialize()
      async def load_session(phone, software_id)
      async def save_session(session)
      async def save_message(phone, msg)
  ```
  - [ ] Métodos implementados
  - [ ] Redis caching funciona (TTL 24h)
  - [ ] Supabase fallback OK
  - [ ] Tests: `test_memory_v2.py` (8/8 passing)

- [ ] **UnifiedSession**
  ```python
  # llamadas/app/channels/session_manager.py
  class UnifiedSession:
      phone: str
      software_id: str
      message_history: list[Message]
      state: ConversationState
      active_channels: set[ChannelType]
  ```
  - [ ] Estructura definida
  - [ ] Métodos: add_message, get_conversation_summary
  - [ ] Serialización (to_dict, from_dict)
  - [ ] Tests: 100% coverage

- [ ] **ContextAdaptor**
  ```python
  # llamadas/app/channels/adaptor.py
  class ContextAdaptor:
      @staticmethod
      async def from_call_context(ctx: CallContext) -> UnifiedSession
      @staticmethod
      async def to_call_context(unified: UnifiedSession) -> CallContext
  ```
  - [ ] Mapeo de campos completo
  - [ ] Manejo de errores
  - [ ] Tests con data real

- [ ] **IntentClassifier**
  ```python
  # llamadas/app/channels/intent_classifier.py
  class IntentClassifier:
      async def classify(text: str, channel: ChannelType) -> IntentResult
  ```
  - [ ] Llamadas a Gemini funcionan
  - [ ] Parsing de respuesta OK
  - [ ] Confidence scores reales
  - [ ] Tests: 10 ejemplos de cada intent

### API & Webhooks

- [ ] **Feature Flag en Config**
  ```python
  # llamadas/app/config.py
  multichannel_enabled: bool = False
  channels_active: str = "voice"
  ```
  - [ ] Accesible desde app.state
  - [ ] Usado en startup event

- [ ] **Main.py actualizado**
  ```python
  # llamadas/app/main.py
  if settings.multichannel_enabled:
      dispatcher = Dispatcher(...)
      app.state.dispatcher = dispatcher
  ```
  - [ ] Startup hook OK
  - [ ] Dispatcher ready cuando flag=true
  - [ ] Logs informativos

### Database

- [ ] **Supabase tables created & indexed**
  - [ ] prospect_sessions_v2 (UNIQUE phone, software_id)
  - [ ] unified_messages_v2 (INDEX phone, timestamp)
  - [ ] consents_v2 (INDEX phone, channel)
  - [ ] Test queries rápidas (< 100ms)

### Testing

- [ ] **Unit Tests**
  ```bash
  pytest tests/channels/test_session_manager.py -v
  pytest tests/channels/test_memory_v2.py -v
  pytest tests/channels/test_intent_classifier.py -v
  pytest tests/channels/test_compliance.py -v
  ```
  - [ ] 100% passing
  - [ ] Coverage > 80%
  - [ ] No warnings

- [ ] **Integration Tests**
  ```bash
  pytest tests/integration/test_compat_layer.py -v
  ```
  - [ ] Crear UnifiedSession desde CallContext
  - [ ] Convertir de vuelta sin pérdida de datos
  - [ ] Persistencia Redis + Supabase OK

### Validación de Fase 1

- [ ] [ ] Código de voz SIGUE funcionando idéntico
- [ ] [ ] Feature flag `MULTICHANNEL_ENABLED=false` por defecto
- [ ] [ ] Todos los tests pasando
- [ ] [ ] Code review aprovado (1 revisor)
- [ ] [ ] Staging deployment sin issues

---

## FASE 2: CANALES (Semanas 4-6)

### WhatsApp Handler (Prioridad 1)

- [ ] **Estructura**
  ```python
  # llamadas/app/channels/handlers/whatsapp.py
  class WhatsAppHandler(ChannelHandler):
      async def receive_message(msg: ChannelMessage) -> ChannelResponse
      async def send_message(response: ChannelResponse) -> dict
  ```
  - [ ] Métodos implementados
  - [ ] Error handling completo

- [ ] **Integración Twilio**
  - [ ] Twilio account configurado
  - [ ] WhatsApp approval en Twilio (esperar 24-48h)
  - [ ] Webhook URL configurada
  - [ ] Signature validation OK

- [ ] **Compliance**
  - [ ] Verificación de consentimiento (consent manager)
  - [ ] Registro de consent para canal WHATSAPP
  - [ ] Opt-out keywords detectados

- [ ] **NLU Adaptativo**
  - [ ] AgentIntelligence.generate_response() modo WHATSAPP
  - [ ] Emojis agregados apropiadamente
  - [ ] Bullets formateados
  - [ ] Test: 5 mensajes reales

- [ ] **Mensajes de Prueba**
  - [ ] Test: send via Twilio API directly
  - [ ] Test: receive via webhook
  - [ ] Test: state persisted en Redis
  - [ ] Test: message en unified_messages_v2

- [ ] **Tests**
  ```bash
  pytest tests/channels/test_whatsapp_handler.py -v
  ```
  - [ ] Receive message
  - [ ] Send message
  - [ ] Template rendering
  - [ ] Compliance checks
  - [ ] 100% passing

### SMS Handler (Prioridad 2)

- [ ] **Estructura**
  ```python
  # llamadas/app/channels/handlers/sms.py
  class SMSHandler(ChannelHandler):
      async def receive_message(msg: ChannelMessage) -> ChannelResponse
      async def send_message(response: ChannelResponse) -> dict
  ```
  - [ ] Métodos implementados

- [ ] **Validación**
  - [ ] Truncate a 160 caracteres
  - [ ] Test: 10 mensajes de diferentes longitudes

- [ ] **Compliance**
  - [ ] Quiet hours (MX: 21:00-09:00)
  - [ ] Opt-out keywords ("STOP", "CANCELAR")
  - [ ] registro de optout automático

- [ ] **Tests**
  ```bash
  pytest tests/channels/test_sms_handler.py -v
  ```
  - [ ] Send SMS
  - [ ] Receive SMS
  - [ ] Opt-out detection
  - [ ] 100% passing

### Email Handler (Prioridad 3, opcional para Fase 2)

- [ ] **Estructura** (si tiempo permite)
  ```python
  # llamadas/app/channels/handlers/email.py
  class EmailHandler(ChannelHandler):
      async def send_message(response: ChannelResponse) -> dict
  ```

- [ ] **SendGrid Integration**
  - [ ] API key válida
  - [ ] Dynamic templates creados
  - [ ] Test send OK

### Dispatcher Mejorado

- [ ] **Enrutamiento**
  ```python
  # llamadas/app/channels/dispatcher.py
  dispatcher.route_message(msg) → handler.receive_message()
  ```
  - [ ] Todos los handlers mapeados
  - [ ] Error handling
  - [ ] Logging completo

- [ ] **Endpoints FastAPI**
  ```python
  @app.post("/channels/whatsapp")
  @app.post("/channels/sms")
  @app.post("/channels/email")  # optional
  ```
  - [ ] Creados
  - [ ] Signature validation OK
  - [ ] Logging de entrada

### Testing E2E

- [ ] **End-to-End Whitebox Test**
  ```python
  # tests/e2e/test_multichannel_flow.py
  
  # 1. Enviar mensaje WhatsApp
  msg = ChannelMessage(channel=WHATSAPP, phone="+52...")
  
  # 2. Verificar stored en BD
  assert message in supabase.table("unified_messages_v2")
  
  # 3. Verificar response
  assert response.text is not None
  assert response.channel == WHATSAPP
  ```
  - [ ] Test con 10 teléfonos reales (staging)
  - [ ] Verificar data en Supabase
  - [ ] Verificar logs
  - [ ] 100% passing

- [ ] **Load Test (Simulado)**
  ```bash
  pytest-stress tests/load/test_load.py --concurrency=10
  ```
  - [ ] 10 concurrent requests
  - [ ] P95 latency < 1 segundo
  - [ ] No crashes

### Validación de Fase 2

- [ ] [ ] WhatsApp fully operational
- [ ] [ ] SMS fully operational
- [ ] [ ] Compliance checks pasando
- [ ] [ ] Voz SIGUE funcionando
- [ ] [ ] Feature flag still `MULTICHANNEL_ENABLED=false` (default)
- [ ] [ ] Staging deployment exitosa
- [ ] [ ] Code review approved

---

## FASE 3: OPTIMIZACIÓN (Semanas 7-8)

### Metrics & Monitoring

- [ ] **Prometheus Metrics**
  ```python
  # llamadas/app/observability/multichannel_metrics.py
  message_by_channel = Counter(...)
  response_time = Histogram(...)
  consent_failures = Counter(...)
  ```
  - [ ] Instrumentadas todas las rutas
  - [ ] Exporta a /metrics

- [ ] **Dashboards**
  - [ ] Grafana dashboard creado
  - [ ] Alertas configuradas (latencia, errors)

- [ ] **Logging Centralizado**
  - [ ] Logs estruturados (JSON)
  - [ ] Contexto: channel, phone, intent
  - [ ] Nivel: DEBUG/INFO/WARN/ERROR

### Performance

- [ ] **Cache Agresivo**
  - [ ] Redis TTL optimizado por canal
  - [ ] Warming de cache al startup
  - [ ] Eviction policy: LRU

- [ ] **Database Optimization**
  - [ ] Índices creados en Supabase
  - [ ] Queries analizado (EXPLAIN)
  - [ ] Denormalization si aplica

- [ ] **Load Testing**
  ```bash
  k6 run tests/load/test_load.py --vus=50
  ```
  - [ ] 50 concurrent users
  - [ ] P99 latency < 2 segundos
  - [ ] Error rate < 0.1%

### Canary Rollout

- [ ] **Preparar Rollout**
  - [ ] Set `MULTICHANNEL_ENABLED=true` (10% traffic)
  - [ ] Monitoreo en vivo activado
  - [ ] Runbook de rollback escrito

- [ ] **Métricas de Success**
  - [ ] Error rate del multichannel < 1%
  - [ ] Latencia promedio < 500ms
  - [ ] Opt-in rate en WhatsApp > 60%
  - [ ] Follow-up completion > 80%

- [ ] **Rollback Plan**
  - [ ] Set `MULTICHANNEL_ENABLED=false`
  - [ ] Verificar voz todavía funciona
  - [ ] Comunicar a team
  - [ ] Post-mortem si aplica

### Documentación

- [ ] **API Documentation**
  - [ ] OpenAPI/Swagger updated
  - [ ] Ejemplos de cada endpoint
  - [ ] Error codes documentados

- [ ] **Runbooks**
  - [ ] Deployment procedure
  - [ ] Rollback procedure
  - [ ] Troubleshooting guide
  - [ ] On-call procedures

- [ ] **Team Training**
  - [ ] Demo del sistema
  - [ ] How to handle issues
  - [ ] How to escalate

### Security Review

- [ ] **Code Security**
  - [ ] OWASP Top 10 checklist
  - [ ] SQL injection: none (Supabase + ORM)
  - [ ] XSS: N/A (API only, no HTML)
  - [ ] CSRF: N/A (API with tokens)
  - [ ] Secrets not in code: verified
  - [ ] Dependencies up-to-date: checked

- [ ] **API Security**
  - [ ] Webhook signature validation OK
  - [ ] Rate limiting configured
  - [ ] CORS configured correctly
  - [ ] HTTPS enforced

- [ ] **Data Security**
  - [ ] PII encrypted in transit
  - [ ] Backups tested
  - [ ] GDPR compliance verified

### Validación de Fase 3

- [ ] [ ] Metrics en vivo
- [ ] [ ] Alertas funcionando
- [ ] [ ] Load testing > 50 users OK
- [ ] [ ] Security review passed
- [ ] [ ] Documentación completa
- [ ] [ ] Team trained

---

## FASE 4: PRODUCCIÓN (Semana 9)

### Pre-Launch Checklist

- [ ] **Datos & Backup**
  - [ ] Supabase backup taken
  - [ ] Redis snapshot saved
  - [ ] Rollback data ready

- [ ] **Monitoreo**
  - [ ] Dashboards en vivo
  - [ ] Alertas activas
  - [ ] Log aggregation OK
  - [ ] On-call schedule confirmed

- [ ] **Communication**
  - [ ] Equipo notificado
  - [ ] Clientes notificados (si aplica)
  - [ ] Status page actualizado

### Rollout Execution

- [ ] **Set Feature Flag**
  ```bash
  MULTICHANNEL_ENABLED=true
  CHANNELS_ACTIVE=voice,whatsapp,sms,email
  ```

- [ ] **Monitor Live**
  - [ ] Grafana dashboard
  - [ ] Log tail
  - [ ] Alert notifications
  - [ ] Team in Slack/Discord

- [ ] **Smoke Tests**
  - [ ] Send test message por cada canal
  - [ ] Verificar en Supabase
  - [ ] Verificar en dashboards

- [ ] **Success Criteria (24 horas)**
  - [ ] Error rate < 0.5%
  - [ ] P95 latency < 1 segundo
  - [ ] 1000+ mensajes procesados
  - [ ] Opt-in rate > 70%
  - [ ] Follow-up automation > 85%

### Post-Launch

- [ ] **Observación (48 horas)**
  - [ ] Monitoreo continuo
  - [ ] Bugs reportados = fix inmediato
  - [ ] Performance stable

- [ ] **Retroalimentación**
  - [ ] Team feedback recolectada
  - [ ] Ajustes menores implementados
  - [ ] Lessons learned documentados

- [ ] **Celebración 🎉**
  - [ ] Team reconocimiento
  - [ ] Release notes publicadas
  - [ ] Stakeholders notificados

---

## ACTIVIDADES RECURRENTES (Post-Launch)

### Semanal

- [ ] Revisar dashboards (Grafana)
- [ ] Verificar alertas (si hay)
- [ ] Check logs para anomalías

### Mensual

- [ ] Performance review
- [ ] Compliance audit
- [ ] Capacity planning

### Trimestral

- [ ] Architecture review
- [ ] Roadmap para nuevos canales (Facebook, Instagram)

---

## RIESGOS & PLANES B

| Riesgo | Probabilidad | Plan B |
|--------|-------------|--------|
| Regresión en voz | Media | Rollback `MULTICHANNEL_ENABLED=false` |
| Memory corruption | Baja | Restore from Supabase backup |
| API rate limit | Baja | Increase Twilio/Meta/SendGrid limits |
| Latencia aumentada | Media | Disable caching → enable caching |
| Compliance failure | Muy baja | Legal review, immediate fix |

---

## TRACKING

```
Fase 1 Status:
  Semana 2: 50% complete
  Semana 3: 100% complete, ready for Phase 2

Fase 2 Status:
  Semana 4: WhatsApp 80%, SMS 20%
  Semana 5: WhatsApp 100%, SMS 100%
  Semana 6: Email handler (optional), testing

Fase 3 Status:
  Semana 7: Metrics + monitoring 80%
  Semana 8: Canary rollout + docs 100%

Fase 4:
  Semana 9: Production release
```

---

## ÉXITO

**Cuando puedas:**

1. ✅ Prospect responde en WHATSAPP
2. ✅ Agent ve contexto de LLAMADA ANTERIOR
3. ✅ Respuesta es natural (no bot-like)
4. ✅ Conversion rate subió de 15% a 25%+
5. ✅ Follow-up automation pasó de 20% a 85%

→ **MISSION ACCOMPLISHED**
