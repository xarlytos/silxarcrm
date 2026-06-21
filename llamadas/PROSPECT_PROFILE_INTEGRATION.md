# Prospect Profile Engine - Guía de Integración en Codebase Actual

## Contexto del Proyecto

Tu sistema actual:
- **Pipeline:** Twilio + Gemini Live (o ElevenLabs STT + Gemini Chat + ElevenLabs TTS)
- **CRM:** PostgreSQL (conectado al backend Express)
- **Storage:** Redis (para sesiones temporales)
- **Puntos de integración:** `media_stream.py`, `chat_session.py`, `live_session.py`

---

## 1. Archivos a Crear

```
llamadas/app/
├── prospect/
│   ├── __init__.py
│   ├── profile_engine.py              # ← Nueva clase ProspectProfileEngine
│   ├── profile_cache.py               # ← Redis caching layer
│   ├── call_analyzer.py               # ← NLP + análisis de turnos
│   ├── objection_handler.py           # ← Estrategias de objeciones
│   └── privacy.py                     # ← GDPR compliance
│
└── conversation/
    └── prompts.py                     # ← MODIFICAR: inyectar perfil
```

---

## 2. Cambios en Archivos Existentes

### 2.1 `app/config.py` - Nuevas variables de entorno

```python
# Agregar después de línea 140 (antes de @property media_ws_url):

# --- Prospect Profile Engine ---
prospect_profile_enabled: bool = True
prospect_profile_cache_ttl: int = 7200  # 2 horas
prospect_profile_sync_interval: int = 30  # segundos
# Encrypt PII fields in database
prospect_profile_encrypt_pii: bool = True
prospect_profile_encryption_key: str = ""  # Debe venir de .env
```

### 2.2 `app/telephony/media_stream.py` - Cargar perfil

**ANTES** (línea ~46):
```python
async def _build_session(
    call_sid: str,
    phone: str,
    business_type: str,
    business_name: str,
    city: str,
    software_id: str = "",
    lead_id: str = "",
    spech_id: str = "",
    agente_id: int = 0,
) -> tuple[GeminiLiveSession | HybridSession, CallContext]:
    """Crea ctx + sesión..."""
    
    # Intentar cargar desde PostgreSQL compartido
    lead = None
    spech = None
    if software_id:
        lead = await postgres_repo.get_lead(phone, software_id)
        spech = await postgres_repo.get_spech(software_id, spech_id)
    
    # ... resto del código ...
```

**DESPUÉS** (insertar después de `# ... resto del código ...`):
```python
    # ═══ NUEVO: Prospect Profile Engine ═══
    if settings.prospect_profile_enabled:
        from app.prospect.profile_engine import ProspectProfileEngine
        from app.prospect.profile_cache import ProspectProfileCache
        
        # Inicializar engine y cache
        pool = await postgres_repo._get_pool()
        cache = ProspectProfileCache(settings.redis_url)
        await cache.init()
        engine = ProspectProfileEngine(pool, cache)
        
        # Cargar o crear perfil del prospect
        try:
            prospect_profile = await engine.load_or_create_profile(
                phone=phone,
                software_id=software_id,
                lead_id=lead_id or lead.get("id", "") if lead else None,
            )
            logger.info(
                f"Prospect profile loaded: {phone} "
                f"(temperature={prospect_profile.temperature.value}, "
                f"call #{prospect_profile.total_calls + 1})"
            )
        except Exception as exc:
            logger.warning(f"Failed to load prospect profile: {exc}")
            prospect_profile = None
        
        # Inyectar en contexto
        ctx.prospect_profile = prospect_profile
```

### 2.3 `app/conversation/prompts.py` - Inyectar perfil en system_prompt

**ANTES** (función `build_system_prompt`):
```python
def build_system_prompt(ctx: CallContext, spech_contenido: str = "", agent_config: dict | None = None) -> str:
    """Construye el system prompt para Gemini."""
    
    base_prompt = f"""
Eres un agente de ventas profesional para {ctx.business_name or 'nuestro software'}.
...
"""
    return base_prompt
```

**DESPUÉS** (inyectar perfil):
```python
def build_system_prompt(ctx: CallContext, spech_contenido: str = "", agent_config: dict | None = None) -> str:
    """Construye el system prompt para Gemini."""
    
    base_prompt = f"""
Eres un agente de ventas profesional para {ctx.business_name or 'nuestro software'}.
...
"""
    
    # ═══ NUEVO: Inyectar Prospect Profile ═══
    profile_section = ""
    if hasattr(ctx, 'prospect_profile') and ctx.prospect_profile:
        profile_section = f"""

═══════════════════════════════════════════════════════════
PROSPECT PROFILE (Load this to adapt your strategy)
═══════════════════════════════════════════════════════════
{ctx.prospect_profile.to_prompt_injection()}
═══════════════════════════════════════════════════════════
"""
    
    return base_prompt + profile_section
```

### 2.4 `app/gemini/chat_session.py` - Actualizar perfil en tiempo real

**En la clase `GeminiChatSession`, agregar después de `async def send_message`** (línea ~131):

```python
    async def send_message(self, text: str, role: str = "user") -> None:
        """Envía un mensaje de usuario y procesa la respuesta streaming."""
        self._history.append({"role": role, "parts": [{"text": text}]})

        # Notificar transcripción de entrada
        if self.on_transcript:
            await self.on_transcript("prospecto", text)

        # ═══ NUEVO: Prospect Profile Analysis ═══
        if self.ctx.prospect_profile:
            from app.prospect.call_analyzer import CallAnalyzer
            analyzer = CallAnalyzer()
            
            # Analizar turno del prospect
            analysis = await analyzer.analyze_prospect_turn(text, role="prospect")
            
            # Registrar en sesión (para fin de llamada)
            if not hasattr(self, '_turn_analyses'):
                self._turn_analyses = []
            self._turn_analyses.append(analysis)
            
            logger.debug(
                f"Turn {len(self._history)//2}: "
                f"intent={analysis.intent}, "
                f"objs={analysis.detected_objections}, "
                f"mots={analysis.detected_motivators}, "
                f"temp_delta={analysis.temperature_delta:+.2f}"
            )
            
            # Actualizar temperatura en caché (lazy)
            if hasattr(self, '_engine') and self._engine:
                new_score = max(0, min(1, 
                    self.ctx.prospect_profile.temperature_score + analysis.temperature_delta
                ))
                await self._engine._cache.update_temperature_lazy(
                    self.ctx.prospect_profile.id,
                    new_score
                )
        
        # ═══ Resto del código existente ═══
        # ... edge case handler, memory consistency, cached responses, etc ...
```

**En `__init__` del `GeminiChatSession`, agregar inicializadores**:

```python
    def __init__(self, ctx, system_prompt: str, ...):
        # ... código existente ...
        
        # ═══ NUEVO: Prospect Profile Engine ═══
        self._engine = None
        self._turn_analyses = []
```

### 2.5 `app/post_call/nurture_engine.py` - Sincronizar perfil al fin de llamada

**Agregar nuevo módulo** (o extender si existe):

```python
# app/post_call/prospect_profile_sync.py

async def sync_call_profile_updates(
    call_sid: str,
    prospect_profile: ProspectProfile,
    session: GeminiChatSession | HybridSession,
    call_duration_seconds: int,
) -> None:
    """Sincroniza cambios del perfil al fin de la llamada.
    
    Se ejecuta en background después de que la llamada termina.
    """
    from app.prospect.profile_engine import ProspectProfileEngine
    from app.prospect.call_analyzer import CallAnalyzer
    
    try:
        # Recrear engine
        pool = await postgres_repo._get_pool()
        engine = ProspectProfileEngine(pool)
        analyzer = CallAnalyzer()
        
        # 1. Guardar call transcript completo
        from app.crm import postgres_repo
        await postgres_repo.log_call(
            software_id=prospect_profile.software_id,
            lead_id=prospect_profile.lead_id,
            call_sid=call_sid,
            phone=prospect_profile.phone,
            transcript=session._history if hasattr(session, '_history') else [],
            duration=call_duration_seconds,
            outcome="completed",  # TODO: infer from session state
        )
        
        # 2. Calcular final temperature score
        turn_analyses = getattr(session, '_turn_analyses', [])
        if turn_analyses:
            temperature_delta = sum(a.temperature_delta for a in turn_analyses)
            final_score = max(0, min(1, 
                prospect_profile.temperature_score + temperature_delta
            ))
        else:
            final_score = prospect_profile.temperature_score
        
        # 3. Actualizar perfil en PostgreSQL
        prospect_profile = await engine.update_temperature_score(
            profile_id=prospect_profile.id,
            new_score=final_score,
            call_number=prospect_profile.total_calls,
        )
        
        # 4. Registrar todas las objeciones detectadas
        for analysis in turn_analyses:
            for obj_cat in analysis.detected_objections:
                await engine.add_objection(
                    profile_id=prospect_profile.id,
                    text=analysis.text,
                    category=obj_cat,
                    agent_response="[Recorded from call]",
                    effectiveness=0.5,  # Default, se actualiza si vuelve
                    call_number=prospect_profile.total_calls,
                )
            
            # 5. Registrar motivadores
            for motivator in analysis.detected_motivators:
                await engine.add_motivator(
                    profile_id=prospect_profile.id,
                    keyword=motivator,
                    sentiment=analysis.sentiment,
                    call_number=prospect_profile.total_calls,
                )
        
        logger.info(
            f"Prospect profile synced: {prospect_profile.phone} "
            f"(temperature: {prospect_profile.temperature.value})"
        )
        
    except Exception as exc:
        logger.error(f"Failed to sync prospect profile: {exc}")
        # No re-raise: no debe bloquear fin de llamada
```

### 2.6 `app/telephony/media_stream.py` - Hook fin de llamada

**En la función `handle_media_stream`, al final** (después de `finally` cleanup):

```python
async def handle_media_stream(websocket: WebSocket) -> None:
    """Orquestador del WebSocket de Twilio Media Streams."""
    
    # ... código existente ...
    
    try:
        # ... main loop ...
        pass
    
    finally:
        # ═══ NUEVO: Sincronizar perfil del prospect ═══
        if ctx and hasattr(ctx, 'prospect_profile') and ctx.prospect_profile:
            call_duration = time.time() - call_start_time
            try:
                from app.post_call.prospect_profile_sync import sync_call_profile_updates
                # Fire-and-forget: no esperar
                asyncio.create_task(
                    sync_call_profile_updates(
                        call_sid=call_sid,
                        prospect_profile=ctx.prospect_profile,
                        session=session,
                        call_duration_seconds=int(call_duration),
                    )
                )
            except Exception as exc:
                logger.warning(f"Failed to async sync profile: {exc}")
        
        # ... cleanup existente ...
```

---

## 3. Migraciones de Base de Datos

### 3.1 SQL: Crear tablas

```sql
-- File: alembic/versions/xxx_add_prospect_profiles.py
-- O ejecutar directamente en PostgreSQL:

BEGIN;

-- prospect_profiles
CREATE TABLE prospect_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  phone TEXT NOT NULL,
  lead_id UUID,
  
  temperature TEXT DEFAULT 'cold',
  temperature_score FLOAT DEFAULT 0.0,
  interest_level INT DEFAULT 1,
  
  estimated_budget_min DECIMAL(12, 2),
  estimated_budget_max DECIMAL(12, 2),
  estimated_budget_currency TEXT DEFAULT 'MXN',
  budget_confirmed BOOLEAN DEFAULT FALSE,
  
  family_status TEXT,
  children_count INT,
  years_in_business INT,
  business_stage TEXT,
  
  objections JSONB DEFAULT '[]'::jsonb,
  motivators JSONB DEFAULT '[]'::jsonb,
  context_notes JSONB DEFAULT '[]'::jsonb,
  
  persona_type TEXT,
  persona_confidence FLOAT DEFAULT 0.0,
  
  total_calls INT DEFAULT 0,
  last_called_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  last_update_at TIMESTAMP,
  
  gdpr_consent BOOLEAN DEFAULT FALSE,
  gdpr_consent_date TIMESTAMP,
  gdpr_consent_channel TEXT,
  data_deletion_requested_at TIMESTAMP,
  
  UNIQUE(software_id, phone),
  CONSTRAINT phone_format CHECK (phone ~ '^\+[0-9]{10,15}$' OR phone IS NULL)
);

CREATE INDEX idx_prospect_profiles_software_id ON prospect_profiles(software_id);
CREATE INDEX idx_prospect_profiles_temperature ON prospect_profiles(software_id, temperature);
CREATE INDEX idx_prospect_profiles_last_called ON prospect_profiles(software_id, last_called_at DESC);

-- call_transcripts
CREATE TABLE call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospect_profiles(id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,
  
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INT,
  call_number INT,
  
  turns JSONB DEFAULT '[]'::jsonb,
  
  call_outcome TEXT,
  temperature_before TEXT,
  temperature_after TEXT,
  temperature_change FLOAT,
  
  objections_found JSONB DEFAULT '[]'::jsonb,
  objections_handled_count INT DEFAULT 0,
  
  motivators_detected JSONB DEFAULT '[]'::jsonb,
  
  agent_notes TEXT,
  
  sentiment_trend JSONB,
  coherence_score FLOAT,
  objection_handling_score FLOAT
);

CREATE INDEX idx_call_transcripts_prospect ON call_transcripts(prospect_id);
CREATE INDEX idx_call_transcripts_software ON call_transcripts(software_id, started_at DESC);

-- objection_resolution_strategies
CREATE TABLE objection_resolution_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL,
  
  objection_category TEXT NOT NULL,
  objection_keywords TEXT[] NOT NULL,
  strategies JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  UNIQUE(software_id, objection_category)
);

COMMIT;
```

### 3.2 Migración de datos existentes

```sql
-- Mapear leads existentes a prospect_profiles (para no perder historial)
INSERT INTO prospect_profiles (software_id, phone, lead_id, gdpr_consent)
SELECT software_id, telefono, id, TRUE
FROM leads
WHERE telefono NOT IN (
    SELECT phone FROM prospect_profiles
)
ON CONFLICT (software_id, phone) DO NOTHING;
```

---

## 4. Ejemplo de Uso Completo

### Flujo de una llamada:

```python
# 1. Twilio POST /voice
#    → Dispara prewarm_session() en background
#    → Carga prospect_profile del Redis/PostgreSQL

# 2. WS /media abierto
#    → _build_session() obtiene profile
#    → build_system_prompt() inyecta: "Previous 'price' objection had 20% effectiveness..."

# 3. Prospect: "Es muy caro"
#    → GeminiChatSession.send_message() analiza
#    → CallAnalyzer detecta: objection=price, temp_delta=-0.1
#    → Cache: temperatura actualizada a 0.1 (de 0.2)
#    → Log en _turn_analyses para fin de llamada

# 4. Agente: "¿Cuántos clientes pierdes cada mes?" (ROI approach)
#    → Usa la estrategia más efectiva (60% vs 20%)

# 5. Prospect: "3-4 al mes"
#    → Nuevo análisis: motivator=aumentar_ventas, temp_delta=+0.15
#    → Temperatura ahora en 0.25

# 6. Agente: "Perfecto, demo en 10 min?"

# 7. Prospect: "Dale"
#    → Análisis final: acuerdo, temp_delta=+0.1
#    → Temperatura final: 0.35 (de 0.2) → pasa a WARM

# 8. Fin de llamada
#    → sync_call_profile_updates() (async, background)
#    → Guardar call_transcript con todos los turnos
#    → Actualizar prospect_profile en PostgreSQL
#    → prospect_profile.temperature = "warm"
#    → Registrar objeciones detectadas
#    → ✅ Listo para próxima llamada
```

---

## 5. Testing

```python
# tests/test_prospect_profile_integration.py

import pytest
from app.prospect.profile_engine import ProspectProfileEngine
from app.telephony.media_stream import _build_session


@pytest.mark.asyncio
async def test_profile_loaded_in_build_session(pg_pool, mocker):
    """Test que _build_session carga el perfil."""
    
    # Mock: crear un perfil existente
    pool = pg_pool
    engine = ProspectProfileEngine(pool)
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123",
        lead_id="lead_456"
    )
    
    # Agregar una objeción histórica
    await engine.add_objection(
        profile_id=profile.id,
        text="es muy caro",
        category="price",
        agent_response="ROI calc",
        effectiveness=0.8,
        call_number=1
    )
    
    # Llamar _build_session
    session, ctx = await _build_session(
        call_sid="test_123",
        phone="+5215551234567",
        business_type="dental",
        business_name="Mi Clínica",
        city="CDMX",
        software_id="soft_123",
        lead_id="lead_456",
    )
    
    # Verificar que el perfil fue cargado
    assert ctx.prospect_profile is not None
    assert ctx.prospect_profile.phone == "+5215551234567"
    assert len(ctx.prospect_profile.objections) == 1
    assert ctx.prospect_profile.objections[0].category == "price"


@pytest.mark.asyncio
async def test_profile_injection_in_prompt(pg_pool):
    """Test que el perfil se inyecta correctamente en el prompt."""
    
    from app.conversation.prompts import build_system_prompt
    from app.conversation.state import CallContext
    
    # Crear contexto con perfil
    profile = ProspectProfile(
        id="profile_123",
        software_id="soft_123",
        phone="+5215551234567",
        lead_id=None,
        temperature=Temperature.COLD,
        temperature_score=0.3,
        interest_level=2,
        # ... resto de fields ...
    )
    
    ctx = CallContext(
        call_sid="test_123",
        phone="+5215551234567",
        business_type="dental",
        business_name="Mi Clínica",
        city="CDMX",
        software_id="soft_123",
        prospect_profile=profile,
        # ... resto ...
    )
    
    prompt = build_system_prompt(ctx)
    
    # Verificar que el perfil está en el prompt
    assert "PROSPECT PROFILE" in prompt
    assert "COLD (0.3)" in prompt
    assert "Interest Level: 2/5" in prompt
```

---

## 6. Variables de Entorno (.env)

```bash
# --- Prospect Profile Engine ---
PROSPECT_PROFILE_ENABLED=true
PROSPECT_PROFILE_CACHE_TTL=7200
PROSPECT_PROFILE_SYNC_INTERVAL=30
PROSPECT_PROFILE_ENCRYPT_PII=true
PROSPECT_PROFILE_ENCRYPTION_KEY=your-encryption-key-here

# --- Si agregaste Redis ---
REDIS_URL=redis://localhost:6379/1
```

---

## 7. Rollout Strategy

### Fase 1: Shadow Mode (1 week)
```python
# En config.py
PROSPECT_PROFILE_ENABLED = True
PROSPECT_PROFILE_LOG_ONLY = True  # Log pero no inyectar en prompt
```

Beneficios:
- Cargar y analizar perfiles sin afectar llamadas
- Validar que datos se cargan correctamente
- Compilar baseline de métricas

### Fase 2: Gradual Rollout (1 week)
```python
PROSPECT_PROFILE_LOG_ONLY = False
PROSPECT_PROFILE_INJECTION_ROLLOUT_PCT = 10  # 10% de llamadas
```

Monitorear:
- Close rate cambios
- Latencia (P95 < 150ms)
- Errores de database

### Fase 3: Full Rollout (1 week)
```python
PROSPECT_PROFILE_INJECTION_ROLLOUT_PCT = 100  # Todas las llamadas
```

---

## 8. Monitoring & Alertas

```python
# app/observability/metrics.py

class ProspectProfileMetrics:
    """Métricas del Prospect Profile Engine."""
    
    def record_profile_load(self, duration_ms: float, success: bool):
        """Registra tiempo de carga de perfil."""
        metrics.histogram("prospect_profile.load_time_ms", duration_ms)
        if not success:
            metrics.increment("prospect_profile.load_errors")
    
    def record_turn_analysis(self, duration_ms: float, found_objs: int, found_mots: int):
        """Registra análisis de turno."""
        metrics.histogram("prospect_profile.turn_analysis_ms", duration_ms)
        metrics.gauge("prospect_profile.objs_detected", found_objs)
        metrics.gauge("prospect_profile.mots_detected", found_mots)
    
    def record_temperature_update(self, old_score: float, new_score: float):
        """Registra cambios de temperatura."""
        delta = new_score - old_score
        metrics.gauge("prospect_profile.temp_delta", delta)
```

**Alertas:**
```python
# Si latencia de profile load > 200ms
# Si database sync tarda > 1 segundo
# Si GDPR violations detectados
# Si temperature predictions < 60% accuracy (vs manual audit)
```

---

## Checklist Final

- [ ] Crear esquema PostgreSQL (3 tablas)
- [ ] Crear `app/prospect/*.py` (5 módulos)
- [ ] Modificar `config.py` (agregar vars)
- [ ] Modificar `media_stream.py` (cargar + sync)
- [ ] Modificar `prompts.py` (inyectar perfil)
- [ ] Modificar `chat_session.py` (analizar turnos)
- [ ] Crear `prospect_profile_sync.py` (fin de llamada)
- [ ] Tests unitarios + integration tests
- [ ] .env con vars nuevas
- [ ] Documentación en README
- [ ] Monitoreo + alertas
- [ ] Shadow mode testing (1 week)
- [ ] Gradual rollout (1 week)
- [ ] Full production (1 week)

