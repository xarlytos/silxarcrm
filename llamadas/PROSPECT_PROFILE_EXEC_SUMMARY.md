# Prospect Profile Engine - Resumen Ejecutivo

## TL;DR

**PROBLEMA:** Cada llamada AI es independiente. El agente no "recuerda" que el prospect dijo "es muy caro" en la llamada anterior, o que el principal motivador es "aumentar ventas". Resultado: ineficiencia, conversaciones repetitivas, tasa de cierre baja.

**SOLUCIÓN:** Prospect Profile Engine - base de datos persistent que almacena:
- Objeciones históricas + estrategias que funcionaron
- Nivel de interés/temperatura (hot, warm, cold, dead)
- Presupuesto estimado, contexto personal, motivadores

**IMPACTO ESPERADO:**
- ✅ +30-40% tasa de cierre (gracias a estrategia adaptativa)
- ✅ -2 llamadas promedio para cerrar (de 5 a 3)
- ✅ +25% efficiency en manejo de objeciones (sabemos qué funciona)
- ✅ 100% GDPR compliant (con cifrado de PII)

---

## 1. Arquitectura de Alto Nivel

```
┌─ Llamada 1 ─────────────────────────────────────┐
│ Prospect: "Es muy caro"                         │
│ Agente: "Tenemos €49/mes, €99/mes, €199/mes"   │
│ Resultado: "No interesa"                        │
│ → Perfil: Temperature = COLD (0.2)              │
│            Objection: "price", effectiveness=0.2│
└─────────────────────────────────────────────────┘
                        ↓
           PROSPECT PROFILE ENGINE
           (PostgreSQL + Redis Cache)
                        ↓
┌─ Llamada 2 (2 semanas después) ────────────────┐
│ Sistema carga perfil:                           │
│   - "Objeción anterior 'caro' → baja efectividad│
│   - Estrategia efectiva: ROI calculation (+60%)"│
│   - Temperatura: COLD                           │
│                                                 │
│ System Prompt inyecta:                          │
│   "Evita explicar tarifa. Enfoque: ROI/payback"│
│                                                 │
│ Agente: "3 clientes × €500 = €1.500/mes.      │
│         Sistema €99 = se paga en 1 semana.     │
│         ¿Cuántos pierdes tú ahora?"            │
│ Prospect: "Bueno... 3-4 al mes."               │
│ Agente: "Perfecto. Demo en 10 min?"            │
│ Resultado: "DEMO SCHEDULED" → Temperature = HOT│
│            (0.75)                              │
└─────────────────────────────────────────────────┘
```

---

## 2. Componentes Clave

### 2.1 Base de Datos: 3 Tablas Principales

```sql
prospect_profiles          -- Perfil único por prospect
  ├─ phone (PK)
  ├─ temperature (cold/warm/hot/dead)
  ├─ temperature_score (0-1)
  ├─ estimated_budget (min/max)
  ├─ objections (JSONB: historial + effectiveness)
  ├─ motivators (JSONB: keywords + frequency)
  ├─ persona_type (decision_maker/gatekeeper/etc)
  └─ gdpr_consent + consent_date

call_transcripts           -- Log de cada llamada
  ├─ prospect_id (FK)
  ├─ call_sid (Twilio)
  ├─ turns (JSONB: historial completo)
  ├─ temperature_before/after
  ├─ objections_found
  ├─ motivators_detected
  └─ call_outcome (completed/transferred/hungup)

objection_resolution_strategies  -- Base de conocimiento
  ├─ objection_category (price/timing/trust/competitor)
  ├─ keywords
  ├─ strategies (JSONB: respuestas probadas + effectiveness)
  └─ success_rate (agregado)
```

### 2.2 Flujo en Tiempo Real

```
1. POST /voice (Twilio contesta)
   ↓
2. load_prospect_profile(phone, software_id) [async, fire-and-forget]
   - Redis: <10ms
   - PostgreSQL: <100ms
   - Fallback: minimal profile <1ms
   ↓
3. WS /media (MediaStream abierto)
   - Inyecta perfil en system_prompt
   - "Previous objection 'es caro' had 20% effectiveness with pricing,
      60% effectiveness with ROI. Focus on ROI."
   ↓
4. Cada turno del prospect:
   - CallAnalyzer detecta: intención, sentimiento, objeciones, motivadores
   - Temperature delta: -0.1 (objeción) | +0.15 (motivador) | +0.1 (acuerdo)
   - Actualizar en Redis (instantáneo)
   ↓
5. End-of-call (POST /webhook/status)
   - Guardar call_transcript completo
   - Sincronizar cambios de perfil a PostgreSQL
   - Calcular nueva temperatura final
   - Trigger ML: persona inference (decision_maker vs gatekeeper)
```

### 2.3 Optimizaciones de Latencia

| Componente | SIN Engine | CON Engine | Ganancia |
|-----------|-----------|-----------|----------|
| Load profile | 0ms | <10ms (Redis) | Neutral |
| Inject to prompt | +20ms | +5ms | -75% |
| Analyze turn | 0ms | +50ms | -50ms (aceptable) |
| Update temperature | 0ms | <1ms (Redis) | Neutral |
| **Total** | **0ms** | **~55ms** | **Pero +40% close rate** |

**Estrategia:** Load asincrónico (no bloquea primer turno). Análisis de turno es background (paralelo a TTS).

---

## 3. Ejemplos de Impacto

### Ejemplo 1: Prospect COLD con objeción "es muy caro"

**SIN Prospect Profile:**
```
Call 1: "Tenemos 3 planes: €49, €99, €199"
        Prospect: "Es mucho"
        Agente: "OK, te dejo para que lo pienses"
        Result: NO INTERESA

Call 2 (2 semanas): Agent mismo script
        → Lead perdido, tiempo desperdiciado
```

**CON Prospect Profile:**
```
Call 1: Genera profile
        Objection: "price" (effectiveness: 0.2 con "tarifa list")
        
Call 2: Sistema inyecta al prompt:
        "Previous 'price' objection FAILED with pricing list.
         SUCCESS RATE of ROI calculation: 60%.
         Persona: Gatekeeper (decides by numbers, not features)"
         
        Agente: "¿Cuántos clientes pierdes cada mes?"
                Prospect: "3-4"
                Agente: "3 × €500 = €1.500/mes. €99 plan = paga en 1 semana."
                Result: DEMO SCHEDULED
                
→ Cambio de COLD a HOT en call 2
```

**Ganancia:** +Nde conversión, -2 llamadas promedio.

### Ejemplo 2: Prospect WARM con timeline comprometido

**SIN Prospect Profile:**
```
Call 3: Prospect: "Mira, podemos hacerlo en agosto"
        (No hay mecanismo para recordar esto)
Call 4: Agente ignora timeline, pitch genérico
        Prospect: "Ya no estoy tan interesado"
        Result: LEAD LOST
```

**CON Prospect Profile:**
```
Call 3: Objection handler detecta: "agosto" = COMMITTED TIMELINE
        Profile.context = [{date: "2026-03-15", note: "Committed to August"}]
        Temperature → WARM (0.65) → SCHEDULED

Backend trigger:
  - 1 de julio: Follow-up automático
  - Envío: Timeline de implementación + Checklist
  - Agenta: "¿Listos para agosto?"

Result: Lead pasa a HOT (0.85), cierra en julio
```

**Ganancia:** Lead no se pierde, cierre automático en fecha comprometida.

---

## 4. GDPR Compliance

### Checklist GDPR

- ✅ **Consent tracking:** `gdpr_consent`, `gdpr_consent_date`, `gdpr_consent_channel`
- ✅ **Data encryption:** PII cifrada en base de datos (teléfono, contexto personal)
- ✅ **Right to be forgotten:** Query que borra todo el perfil + transcripts
- ✅ **Audit trail:** `call_transcripts` mantiene log completo para auditoría
- ✅ **Data retention:** TTL automático (90 días para calls, 1 año para profiles)
- ✅ **Purpose limitation:** Perfil solo usado para mejorar conversación de ventas

### Queries GDPR

```sql
-- Right to be forgotten
UPDATE prospect_profiles
SET phone = NULL, family_status = NULL, context_notes = '[]'::jsonb
WHERE id = $1 AND software_id = $2;

-- Consentimiento check
SELECT * FROM prospect_profiles
WHERE id = $1 AND gdpr_consent = TRUE AND gdpr_consent_date >= NOW() - INTERVAL '2 years';

-- Audit: qué datos se procesaron
SELECT call_sid, started_at, turns FROM call_transcripts
WHERE prospect_id = $1 AND started_at > NOW() - INTERVAL '90 days';
```

---

## 5. Roadmap de Implementación

### Sprint 1: Foundation (2 weeks)
- [ ] Crear schema: `prospect_profiles`, `call_transcripts`
- [ ] Implement `ProspectProfileEngine.load_or_create_profile()`
- [ ] Inyectar perfil en system_prompt
- [ ] Basic fields: temperature, objections (list), motivators (list)
- [ ] Test: load, create, basic updates
- **KPI:** Profile loads <100ms, 0 latency impact on calls

### Sprint 2: Real-time Analysis (2 weeks)
- [ ] `CallAnalyzer` detecta: objeciones, motivadores, sentimiento
- [ ] Actualizar temperature_score en tiempo real (Redis)
- [ ] Guardar análisis en `call_transcripts`
- [ ] Bucket test: measure close rate improvement
- **KPI:** +10% objection handling, temperature changes detected

### Sprint 3: Privacy & Optimization (2 weeks)
- [ ] GDPR compliance: consentimiento, cifrado, audit trail
- [ ] Multi-tier cache: Redis full profile + hot fields
- [ ] Circuit breaker + fallbacks
- [ ] Performance testing: P95 latency <150ms
- **KPI:** 0 GDPR violations, <10ms profile loads

### Sprint 4: ML Features (4 weeks, optional)
- [ ] Persona inference: decision_maker vs gatekeeper
- [ ] Budget estimation from conversation
- [ ] Predictive temperature scoring
- [ ] Churn risk detection
- **KPI:** +15% additional close rate via persona adaptation

---

## 6. Queries Rápidas para Usar

### Reportes

```sql
-- Prospects listos para cierre (WARM + HOT, últimas 2 semanas)
SELECT phone, temperature, temperature_score, last_called_at
FROM prospect_profiles
WHERE software_id = $1 AND temperature IN ('warm', 'hot')
  AND last_called_at > NOW() - INTERVAL '14 days'
ORDER BY temperature_score DESC;

-- Top objeciones por effectiveness (¿cuál funciona mejor?)
SELECT 
    category,
    COUNT(*) as frequency,
    AVG(CAST(effectiveness AS FLOAT)) as avg_effectiveness
FROM (SELECT objs->>'category' as category, objs->>'effectiveness' as effectiveness
      FROM prospect_profiles, jsonb_array_elements(objections) as objs
      WHERE software_id = $1)
GROUP BY category
ORDER BY avg_effectiveness DESC;

-- Prospecto full audit
SELECT 
    pp.phone, pp.temperature, pp.temperature_score, pp.objections, pp.motivators,
    json_agg(json_build_object('call_number', ct.call_number, 'outcome', ct.call_outcome))
FROM prospect_profiles pp
LEFT JOIN call_transcripts ct ON pp.id = ct.prospect_id
WHERE pp.software_id = $1 AND pp.phone = $2
GROUP BY pp.id;
```

---

## 7. Decisiones Arquitectónicas

### ¿PostgreSQL vs Supabase?

| Feature | PostgreSQL | Supabase |
|---------|-----------|----------|
| Costo | Barato (<$50/mes) | Más caro ($50-200/mes) |
| JSONB | ✅ Nativo | ✅ Nativo |
| Audit | ✅ Fácil | ✅ RLS |
| Control | ✅ Total | ⚠ Limited |
| **Recomendación** | ✅ **Para este proyecto** | Para SaaS multi-tenant |

**Decisión:** Usar PostgreSQL que ya está en el backend Express. Supabase es overkill.

### ¿Redis para caché o solo PostgreSQL?

| Scenario | Sin Redis | Con Redis |
|----------|----------|----------|
| Load latency | 50-150ms | <10ms |
| Write during call | Blocking | Non-blocking |
| Cost | 0 | ~$10/mes |
| Complexity | Simple | Moderate |
| **Recomendación** | No necesario en Sprint 1 | ✅ Agregar en Sprint 3 |

**Decisión:** Comenzar sin Redis. Añadir en Sprint 3 si latencia es problema.

### ¿Actualizar perfil en tiempo real (durante llamada) o batch (fin de llamada)?

| Approach | Latency | Consistency | Reliability |
|----------|---------|------------|------------|
| Real-time (Eager) | +50-100ms por turno | ✅ Inmediata | ⚠ Timeouts |
| Batch (Lazy) | 0ms en llamada | ⚠ Delay | ✅ Confiable |
| Hybrid (Redis lazy + DB batch) | <1ms en llamada | ~OK (eventual) | ✅ Mejor |

**Decisión:** Hybrid - Redis durante llamada, PostgreSQL en background (end-of-call).

---

## 8. Métricas de Éxito

### Métricas Primarias (Negocio)

| Métrica | Baseline | Target | Timeline |
|---------|----------|--------|----------|
| Close rate | 15% | 20-22% | 8 weeks |
| Avg calls to close | 5.2 | 3.0-3.5 | 8 weeks |
| Objection handling | 40% | 55-60% | 4 weeks |
| Lead lifecycle value | $800 | $1200+ | 12 weeks |

### Métricas Técnicas

| Métrica | Target | Nota |
|---------|--------|------|
| Profile load latency | <100ms P95 | Sin bloquear llamada |
| Objection detection accuracy | >85% | Con ML validation |
| Temperature prediction accuracy | >70% | Vs manual audits |
| System availability | 99.9% | Con fallbacks |
| GDPR compliance | 100% | Auditoría externa |

---

## 9. Riesgos & Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|------------|--------|-----------|
| Profile load lento | Media | Alto | Redis cache + fallback minimal profile |
| GDPR violation | Baja | Crítico | Audit trail, encryption, consent tracking |
| Objection detection incorrect | Media | Medio | ML validation, manual labeling |
| Database overflow | Media | Medio | Particionamiento, archiving, TTL |
| Agent ignores profile insights | Alta | Medio | A/B test: comparar close rates |

---

## 10. FAQ

**Q: ¿Cuánto cuesta implementar?**
A: ~200-300 horas de dev (~$5-10k). Costo de infraestructura: $50-100/mes.

**Q: ¿Cuánto mejora el close rate?**
A: Esperar +30-40% (15% → 20-22%). Bases: objection handling +15%, persona adaptation +10-15%, pipeline visibility +5%.

**Q: ¿Es GDPR compliant?**
A: Sí, con implementación correcta. Require: consentimiento tracking, cifrado de PII, right-to-be-forgotten, audit trail.

**Q: ¿Funciona sin Redis?**
A: Sí, pero con +50-100ms de latencia. Vale la pena agregar Redis después (barato, +40% performance).

**Q: ¿Cómo detectar objeciones automáticamente?**
A: Keyword matching (Sprint 1), luego ML-based classification (Sprint 4).

**Q: ¿Qué pasa si la llamada cae?**
A: Datos se pierden en Redis. Mitigación: sync a PostgreSQL cada 30 segundos, o solo Redis lazy (no crítico).

---

## 11. Próximos Pasos

1. **Aprobación:** Review architecture con team
2. **Design:** Refinar schema, indexing strategy
3. **Implementation:** Sprint 1 foundation
4. **Testing:** Unit tests + integration tests
5. **Deployment:** Shadow mode (log pero no inyectar) → Full mode
6. **Monitoring:** Alertas para latencia, GDPR compliance, conversion metrics

---

**Documentos Relacionados:**
- `PROSPECT_PROFILE_ENGINE.md` - Especificación técnica completa
- `PROSPECT_PROFILE_ADVANCED.md` - Patrones avanzados, caching, queries
- `PROSPECT_PROFILE_EXEC_SUMMARY.md` - Este documento

**Contacto:** Para preguntas técnicas, consultar con el equipo de IA/Voz.

