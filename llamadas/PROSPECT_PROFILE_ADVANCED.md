# Prospect Profile Engine - Guía Avanzada

## Índice
1. [Patrones de Actualización Incremental](#1-patrones-de-actualización-incremental)
2. [Ciclo de Vida de Objeciones](#2-ciclo-de-vida-de-objeciones)
3. [Estrategias de Caché Redis](#3-estrategias-de-caché-redis)
4. [Inteligencia de Base de Datos](#4-inteligencia-de-base-de-datos)
5. [Circuit Breaker para Prospect Profile](#5-circuit-breaker-para-prospect-profile)

---

## 1. Patrones de Actualización Incremental

### 1.1 Actualización Lazy vs. Eager

**LAZY (Recomendado para latencia crítica):**
- Guardar cambios en Redis durante la llamada
- Escribir en PostgreSQL en background (después de `end_of_call`)
- Pro: 0ms latencia en llamada
- Con: Pérdida de datos si crash (mitigado con Redis persistence)

```python
# app/prospect/cache_layer.py
import redis.asyncio as redis
import json

class ProspectProfileCache:
    """Cache en Redis con fallback a PostgreSQL."""
    
    def __init__(self, redis_url: str):
        self.redis = None
        self.redis_url = redis_url
    
    async def init(self):
        self.redis = await redis.from_url(self.redis_url, decode_responses=True)
    
    async def get_cached_profile(self, profile_id: str) -> dict | None:
        """Obtiene del cache (Redis) o PostgreSQL."""
        # Intenta Redis primero
        if self.redis:
            cached = await self.redis.get(f"prospect:{profile_id}")
            if cached:
                logger.debug(f"Cache HIT for {profile_id}")
                return json.loads(cached)
        
        # Fallback a PostgreSQL (slow path)
        logger.debug(f"Cache MISS for {profile_id}, loading from DB")
        return await self._load_from_db(profile_id)
    
    async def update_temperature_lazy(self, profile_id: str, new_score: float):
        """Actualizar temperature en Redis (instantáneo)."""
        cached = await self.get_cached_profile(profile_id)
        if cached:
            cached["temperature_score"] = new_score
            # Guardar en Redis con TTL de 2 horas
            await self.redis.setex(
                f"prospect:{profile_id}",
                7200,
                json.dumps(cached)
            )
            # Marcar para sincronización en background
            await self.redis.sadd("profiles_dirty", profile_id)
            return
    
    async def sync_dirty_profiles_to_db(self, engine: ProspectProfileEngine):
        """Sincroniza todos los perfiles modificados a PostgreSQL.
        
        Se ejecuta en background cada 30 segundos o al fin de llamada.
        """
        dirty = await self.redis.smembers("profiles_dirty")
        for profile_id in dirty:
            cached = await self.redis.get(f"prospect:{profile_id}")
            if cached:
                data = json.loads(cached)
                # Actualizar en PostgreSQL
                await engine._sync_from_cache(profile_id, data)
                await self.redis.srem("profiles_dirty", profile_id)
                logger.info(f"Synced profile {profile_id} to PostgreSQL")
```

**EAGER (Cuando latencia no es crítica):**
- Guardar directamente en PostgreSQL después de cada turno
- Pro: Consistencia inmediata, no hay pérdida
- Con: +50-100ms por turno

```python
async def update_after_turn(engine, profile_id, new_data):
    """Actualización eager: escribe inmediatamente en DB."""
    # Timeout corto para no bloquear la conversación
    try:
        await asyncio.wait_for(
            engine.update_temperature_score(profile_id, new_data["temperature_score"]),
            timeout=0.5  # 500ms máximo
        )
    except asyncio.TimeoutError:
        logger.warning(f"Database update timeout for {profile_id}, usando lazy fallback")
        # Fallback a Redis
        await cache_layer.update_temperature_lazy(profile_id, new_data["temperature_score"])
```

### 1.2 Batch Updates para Eficiencia

```python
# Actualizar múltiples campos en 1 query
async def batch_update_prospect(
    conn: asyncpg.Connection,
    profile_id: str,
    updates: dict  # {"temperature_score": 0.7, "interest_level": 4, ...}
):
    """Actualización batch: todos los campos en 1 trip a DB."""
    
    # Construir SET dinámicamente
    set_clauses = []
    params = []
    param_idx = 1
    
    for field, value in updates.items():
        if field in ["temperature_score", "interest_level", "total_calls"]:
            set_clauses.append(f"{field} = ${param_idx}")
            params.append(value)
            param_idx += 1
    
    if not set_clauses:
        return
    
    query = f"""
    UPDATE prospect_profiles
    SET {', '.join(set_clauses)}, last_update_at = NOW()
    WHERE id = ${ param_idx}
    """
    params.append(profile_id)
    
    await conn.execute(query, *params)
```

---

## 2. Ciclo de Vida de Objeciones

### 2.1 Estados de una Objeción

```python
from enum import Enum
from datetime import datetime

class ObjectionState(Enum):
    DETECTED = "detected"          # 1er turno: identificada
    ADDRESSED = "addressed"        # Agente respondió
    RESOLVED = "resolved"          # Prospect aceptó respuesta
    ESCALATED = "escalated"        # Llevó a objeción más profunda
    AVOIDED = "avoided"            # Agente evitó abordarla
    RECURRING = "recurring"        # Vuelve a aparecer en llamada 2+


class ObjectionLifecycle:
    """Gestiona el ciclo de vida de objeciones."""
    
    async def track_objection_resolution(
        self,
        engine: ProspectProfileEngine,
        profile_id: str,
        objection_text: str,
        agent_response: str,
        prospect_response: str,  # Qué dijo el prospect después
        call_number: int,
    ):
        """Actualiza state y effectiveness de una objeción."""
        
        # Determinar estado basado en respuesta del prospect
        if "no, gracias" in prospect_response.lower() or "interesa no" in prospect_response.lower():
            state = ObjectionState.AVOIDED
            effectiveness = 0.2
        elif "ok" in prospect_response.lower() or "entiendo" in prospect_response.lower():
            state = ObjectionState.RESOLVED
            effectiveness = 0.8
        elif "pero" in prospect_response.lower() or "aunque" in prospect_response.lower():
            state = ObjectionState.ESCALATED
            effectiveness = 0.3
        else:
            state = ObjectionState.ADDRESSED
            effectiveness = 0.5
        
        # Registrar la objeción con state y effectiveness
        await engine.add_objection(
            profile_id=profile_id,
            text=objection_text,
            category=await self._infer_category(objection_text),
            agent_response=agent_response,
            effectiveness=effectiveness,
            call_number=call_number,
            state=state.value,  # Guardar en DB
        )
        
        logger.info(
            f"Objection lifecycle: {objection_text[:30]}... "
            f"→ {state.name} (effectiveness: {effectiveness:.0%})"
        )
    
    async def find_recurring_objections(
        self,
        engine: ProspectProfileEngine,
        profile_id: str,
    ) -> list[dict]:
        """Identifica objeciones que vuelven a aparecer (señal de urgencia)."""
        profile = await engine.load_or_create_profile(profile_id)
        
        # Contar por texto (fuzzy match)
        objection_groups = {}
        for obj in profile.objections:
            # Normalizar: lowercase, remove puntuación
            normalized = obj.text.lower().replace(".", "").replace("?", "")
            
            # Fuzzy match con otros
            matched = False
            for existing_key in objection_groups:
                if self._fuzzy_match(normalized, existing_key):
                    objection_groups[existing_key].append(obj)
                    matched = True
                    break
            
            if not matched:
                objection_groups[normalized] = [obj]
        
        # Retornar solo las que aparecen 2+ veces
        return [
            {
                "text": key,
                "count": len(objs),
                "calls": [o.call_number for o in objs],
                "last_effectiveness": objs[-1].effectiveness,
            }
            for key, objs in objection_groups.items()
            if len(objs) >= 2
        ]
    
    def _fuzzy_match(self, text1: str, text2: str, threshold: float = 0.7) -> bool:
        """Fuzzy match con Levenshtein."""
        from difflib import SequenceMatcher
        ratio = SequenceMatcher(None, text1, text2).ratio()
        return ratio >= threshold
```

### 2.2 Estrategia Adaptativa por Objeción Recurrente

```python
class AdaptiveObjectionHandler:
    """Ajusta la estrategia si una objeción recorre múltiples llamadas."""
    
    async def generate_adaptive_response(
        self,
        objection_text: str,
        history: list[Objection],
        call_number: int,
    ) -> str:
        """Genera respuesta diferente según historial de efectividad."""
        
        if len(history) == 1:
            # Primera vez: respuesta estándar
            return "Entiendo tu preocupación. Déjame explicar..."
        
        # Análisis de historial
        avg_effectiveness = sum(o.effectiveness for o in history) / len(history)
        
        if avg_effectiveness < 0.3:
            # ESTRATEGIA: La respuesta anterior NO FUNCIONÓ. Cambiar radicalmente.
            return f"""
Veo que hemos hablado de esto antes, y claramente mi respuesta anterior 
no te convenció. Déjame abordar esto de forma diferente:

[En vez de...]
En lugar de [respuesta anterior], lo que realmente te propongo es:
[Nueva estrategia radicalmente diferente]

¿Esto tiene más sentido para ti?
"""
        
        elif avg_effectiveness > 0.7:
            # ESTRATEGIA: Ya funciona. Reforzar pero sin insistir.
            return f"""
Como te mencioné en nuestra última llamada, esto es lo que funciona:
[Recordar respuesta efectiva anterior]

¿Esto sigue siendo válido para ti, o ha cambiado algo?
"""
        
        else:
            # ESTRATEGIA: Parcialmente efectivo. Ir más profundo.
            return f"""
Veo que esto es un punto importante para ti. Vamos a ir más a fondo:
¿Cuál es exactamente la preocupación detrás de esto?
[Hacer pregunta más profunda]
"""
```

---

## 3. Estrategias de Caché Redis

### 3.1 Arquitectura de Multi-tier Cache

```python
# Redis structure:
# prospect:{profile_id}                      → JSON completo (TTL: 2h)
# prospect:{profile_id}:temperature         → float (TTL: 5m) [hot key]
# prospect:{profile_id}:objections:recent    → list JSON (TTL: 1h)
# prospect_by_phone:{software_id}:{phone}   → {profile_id} (TTL: 24h)

class MultiTierCache:
    """Cache jerárquico: full profile vs hot fields."""
    
    async def get_temperature(self, profile_id: str) -> float:
        """Acceso ultra-rápido a temperature (hot key)."""
        val = await self.redis.get(f"prospect:{profile_id}:temperature")
        if val:
            return float(val)
        
        # Fallback
        profile = await self.get_full_profile(profile_id)
        return profile.temperature_score if profile else 0.0
    
    async def get_full_profile(self, profile_id: str) -> ProspectProfile | None:
        """Obtiene perfil completo (más caro)."""
        cached = await self.redis.get(f"prospect:{profile_id}")
        if cached:
            return ProspectProfile.from_dict(json.loads(cached))
        
        # Load from DB and cache
        profile = await self.db_engine.load_profile(profile_id)
        if profile:
            await self.redis.setex(
                f"prospect:{profile_id}",
                7200,
                json.dumps(profile.to_dict())
            )
        return profile
    
    async def update_temperature_with_ttl(self, profile_id: str, score: float):
        """Actualiza temperature en multiple tiers."""
        # Tier 1: Hot key (5 min TTL, acceso ultra-frecuente)
        await self.redis.setex(
            f"prospect:{profile_id}:temperature",
            300,
            score
        )
        
        # Tier 2: Full profile (2h TTL)
        profile = await self.get_full_profile(profile_id)
        if profile:
            profile.temperature_score = score
            await self.redis.setex(
                f"prospect:{profile_id}",
                7200,
                json.dumps(profile.to_dict())
            )
        
        # Mark for background sync
        await self.redis.sadd("dirty", profile_id)
```

### 3.2 Invalidación Inteligente de Caché

```python
class CacheInvalidationStrategy:
    """Estrategia de invalidación: qué actualizar, cuándo."""
    
    async def invalidate_profile(
        self,
        profile_id: str,
        reason: str,  # "call_end", "manual_update", "merge", etc
    ):
        """Invalida caché según el motivo."""
        
        if reason == "call_end":
            # Fin de llamada: invalidar todo, sincronizar a DB
            await self.redis.delete(f"prospect:{profile_id}")
            await self.redis.delete(f"prospect:{profile_id}:temperature")
            await self.redis.delete(f"prospect:{profile_id}:objections:recent")
            await self._sync_to_db(profile_id)
        
        elif reason == "manual_update":
            # Admin actualizó: invalidar todo pero mantener cache de sesión
            await self.redis.delete(f"prospect:{profile_id}")
            # Re-load en background
            asyncio.create_task(self.preload_profile(profile_id))
        
        elif reason == "merge":
            # Merge de perfiles: invalidar ambos
            # (cuando detectamos que phone es duplicado)
            pass
    
    async def preload_profile(self, profile_id: str):
        """Pre-carga desde DB (anticipatory caching)."""
        profile = await self.db_engine.load_profile(profile_id)
        if profile:
            await self.redis.setex(
                f"prospect:{profile_id}",
                7200,
                json.dumps(profile.to_dict())
            )
```

---

## 4. Inteligencia de Base de Datos

### 4.1 Vistas Materializadas para Reportes Rápidos

```sql
-- Vista: Prospects listos para cierre
CREATE MATERIALIZED VIEW prospects_ready_to_close AS
SELECT 
    pp.id,
    pp.phone,
    pp.temperature,
    pp.temperature_score,
    pp.interest_level,
    pp.estimated_budget_min,
    pp.estimated_budget_max,
    pp.total_calls,
    pp.last_called_at,
    -- Objeción más frecuente
    (pp.objections->>0->>'category') as last_objection,
    -- Score de estabilidad (qué tan consistente ha sido)
    STDDEV(CAST(ct.call_number AS FLOAT)) as consistency_score,
    COUNT(ct.id) as call_count
FROM prospect_profiles pp
LEFT JOIN call_transcripts ct ON pp.id = ct.prospect_id
WHERE pp.temperature IN ('warm', 'hot')
  AND pp.last_called_at > NOW() - INTERVAL '14 days'
  AND pp.gdpr_consent = TRUE
GROUP BY pp.id
HAVING COUNT(ct.id) >= 2
ORDER BY pp.temperature_score DESC, pp.interest_level DESC;

-- Refreshar cada 6 horas
CREATE SCHEDULE refresh_ready_to_close
EVERY 360 MINUTES DO
  REFRESH MATERIALIZED VIEW CONCURRENTLY prospects_ready_to_close;
```

### 4.2 Queries de Análisis Temporal

```sql
-- Temperature trajectory: cómo evoluciona el interés en el tiempo
SELECT 
    pp.id,
    pp.phone,
    json_build_object(
        'call_1', (SELECT temperature_score FROM call_transcripts 
                   WHERE prospect_id = pp.id ORDER BY started_at ASC LIMIT 1),
        'call_2', (SELECT temperature_score FROM call_transcripts 
                   WHERE prospect_id = pp.id ORDER BY started_at ASC OFFSET 1 LIMIT 1),
        'call_3', (SELECT temperature_score FROM call_transcripts 
                   WHERE prospect_id = pp.id ORDER BY started_at ASC OFFSET 2 LIMIT 1),
        'call_latest', pp.temperature_score
    ) as temperature_trajectory,
    CASE 
        WHEN pp.temperature_score > 0.7 THEN 'ASCENDING'
        WHEN pp.temperature_score < 0.3 THEN 'DESCENDING'
        ELSE 'STABLE'
    END as trend
FROM prospect_profiles pp
WHERE pp.software_id = $1
  AND pp.total_calls >= 2
ORDER BY pp.temperature_score DESC;

-- Objection effectiveness per category (¿qué tipo de objeción es más fácil de resolver?)
SELECT 
    objs->>'category' as category,
    COUNT(*) as times_encountered,
    AVG(CAST(objs->>'effectiveness' AS FLOAT)) as avg_resolution_rate,
    MAX(CAST(objs->>'effectiveness' AS FLOAT)) as best_case,
    MIN(CAST(objs->>'effectiveness' AS FLOAT)) as worst_case,
    STRING_AGG(DISTINCT objs->>'agent_response', ' | ') as successful_responses
FROM prospect_profiles pp,
     jsonb_array_elements(pp.objections) as objs
WHERE pp.software_id = $1
  AND CAST(objs->>'effectiveness' AS FLOAT) > 0.6
GROUP BY category
ORDER BY avg_resolution_rate DESC;
```

### 4.3 Particionamiento para Escalabilidad

```sql
-- Particionar call_transcripts por fecha (para millones de registros)
CREATE TABLE call_transcripts_2024_q1 PARTITION OF call_transcripts
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE call_transcripts_2024_q2 PARTITION OF call_transcripts
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Query automáticamente va a la partición correcta
SELECT * FROM call_transcripts WHERE started_at > '2024-03-01';
-- → PostgreSQL prune automáticamente a call_transcripts_2024_q1
```

---

## 5. Circuit Breaker para Prospect Profile

### 5.1 Fallbacks en Cascada

```python
class ProspectProfileCircuitBreaker:
    """Maneja fallos de carga del perfil sin detener la llamada."""
    
    async def load_profile_with_fallbacks(
        self,
        phone: str,
        software_id: str,
    ) -> ProspectProfile:
        """Load con 3 niveles de fallback."""
        
        # Nivel 1: Redis (más rápido, <10ms)
        try:
            profile = await self.cache.get_from_redis(phone)
            if profile:
                logger.info(f"Profile loaded from Redis (latency: <10ms)")
                return profile
        except Exception as e:
            logger.warning(f"Redis error: {e}, falling back to DB")
        
        # Nivel 2: PostgreSQL (medio, <100ms)
        try:
            profile = await self.db.load_profile(phone, software_id)
            if profile:
                # Cache en Redis para próximas veces
                await self.cache.save_to_redis(profile)
                logger.info(f"Profile loaded from DB (latency: <100ms)")
                return profile
        except asyncio.TimeoutError:
            logger.warning(f"DB timeout after 100ms, using minimal profile")
        except Exception as e:
            logger.error(f"DB error: {e}, falling back to minimal")
        
        # Nivel 3: Minimal Profile (instant, basado en phone solo)
        logger.warning(f"Using minimal profile for {phone}")
        return ProspectProfile.minimal(phone=phone, software_id=software_id)
    
    @staticmethod
    def minimal(phone: str, software_id: str) -> ProspectProfile:
        """Perfil minimal: solo datos que tenemos (phone)."""
        return ProspectProfile(
            id=f"minimal_{phone}",
            software_id=software_id,
            phone=phone,
            lead_id=None,
            temperature=Temperature.COLD,
            temperature_score=0.0,
            interest_level=1,
            # ... resto en defaults ...
        )
```

### 5.2 Timeout Exponencial

```python
class TimeoutStrategy:
    """Ajusta timeouts dinámicamente según latencia."""
    
    def __init__(self):
        self.latency_history = []
    
    async def load_profile_adaptive(self, profile_id: str):
        """Load con timeout adaptativo basado en historial."""
        
        # Calcular percentil 95 de latencia histórica
        if self.latency_history:
            p95 = sorted(self.latency_history)[-max(1, len(self.latency_history) // 20)]
            timeout = min(p95 * 1.5, 150)  # Max 150ms
        else:
            timeout = 100  # Default
        
        start = time.time()
        try:
            profile = await asyncio.wait_for(
                self.engine.load_profile(profile_id),
                timeout=timeout / 1000.0
            )
            latency = (time.time() - start) * 1000
            self.latency_history.append(latency)
            return profile
        
        except asyncio.TimeoutError:
            logger.warning(f"Load timeout after {timeout}ms")
            return ProspectProfile.minimal(profile_id)
```

---

## 6. Queries Útiles para Debugging

### 6.1 Auditoría de un Prospect

```sql
-- Ver TODO el historial de un prospect
SELECT 
    pp.id,
    pp.phone,
    pp.temperature,
    pp.temperature_score,
    pp.total_calls,
    ARRAY_AGG(
        json_build_object(
            'call_number', ct.call_number,
            'date', ct.started_at,
            'outcome', ct.call_outcome,
            'temp_before', ct.temperature_before,
            'temp_after', ct.temperature_after,
            'objections_found', ct.objections_found,
            'duration', ct.duration_seconds
        ) ORDER BY ct.started_at
    ) as call_history,
    pp.objections,
    pp.motivators,
    pp.context_notes
FROM prospect_profiles pp
LEFT JOIN call_transcripts ct ON pp.id = ct.prospect_id
WHERE pp.software_id = $1 AND pp.phone = $2
GROUP BY pp.id, pp.phone, pp.temperature, pp.temperature_score, pp.total_calls,
         pp.objections, pp.motivators, pp.context_notes;

-- Ver todas las transcripciones de un prospect (para replay/análisis)
SELECT 
    started_at,
    call_sid,
    turns,
    call_outcome,
    agent_notes
FROM call_transcripts
WHERE prospect_id = $1
ORDER BY started_at DESC;
```

### 6.2 Performance Diagnostics

```sql
-- Tabla: ¿cuáles queries son lentas?
SELECT 
    query,
    calls,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%prospect_profiles%'
ORDER BY mean_time DESC;

-- Fragmentation check (vacuum si > 30%)
SELECT 
    schemaname,
    tablename,
    ROUND(
        (EXTRACT(EPOCH FROM now()) - EXTRACT(EPOCH FROM last_vacuum)) / 86400
    ) as days_since_vacuum,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables
WHERE tablename IN ('prospect_profiles', 'call_transcripts')
ORDER BY dead_ratio DESC;
```

---

## 7. Testing

```python
# tests/test_prospect_profile_engine.py

import pytest
from app.prospect.profile_engine import ProspectProfileEngine, Temperature

@pytest.fixture
async def engine(pg_pool):
    return ProspectProfileEngine(pg_pool)


@pytest.mark.asyncio
async def test_load_or_create_new_profile(engine):
    """Test crear nuevo perfil."""
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123"
    )
    
    assert profile.phone == "+5215551234567"
    assert profile.temperature == Temperature.COLD
    assert profile.temperature_score == 0.0
    assert profile.total_calls == 0


@pytest.mark.asyncio
async def test_temperature_progression(engine):
    """Test que temperature_score cambia correctamente."""
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123"
    )
    
    # Simular mejora gradual
    for score in [0.2, 0.4, 0.65, 0.85]:
        profile = await engine.update_temperature_score(
            profile.id, score, call_number=1
        )
        assert profile.temperature_score == score
    
    # Verificar que llegó a HOT
    assert profile.temperature == Temperature.HOT


@pytest.mark.asyncio
async def test_objection_effectiveness_tracking(engine):
    """Test que se registran objeciones con efectividad."""
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123"
    )
    
    await engine.add_objection(
        profile_id=profile.id,
        text="Es muy caro",
        category="price",
        agent_response="Te muestro ROI",
        effectiveness=0.8,
        call_number=1
    )
    
    # Recargar y verificar
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123"
    )
    
    assert len(profile.objections) == 1
    assert profile.objections[0].category == "price"
    assert profile.objections[0].effectiveness == 0.8


@pytest.mark.asyncio
async def test_gdpr_consent_tracking(engine):
    """Test GDPR compliance."""
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123"
    )
    
    # Verificar que nuevo perfil NO tiene consentimiento
    assert profile.gdpr_consent == False
    
    # Simular consentimiento
    await engine.set_gdpr_consent(profile.id)
    profile = await engine.load_or_create_profile(
        phone="+5215551234567",
        software_id="soft_123"
    )
    
    assert profile.gdpr_consent == True
```

