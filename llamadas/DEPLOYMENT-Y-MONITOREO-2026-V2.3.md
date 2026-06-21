# Guía: Deployment y Monitoreo de Fixes de Humanización

> **Estado:** Ready for production  
> **Fecha:** 2026-06-21  
> **Autor:** Ciclo 2 - Humanización + Personalización

---

## 📦 DEPLOYMENT

### Paso 1: Verificar compilación

```bash
# Verificar que los módulos compilan sin error
python -m py_compile llamadas/app/conversation/humanization.py
python -m py_compile llamadas/app/conversation/emotional_response.py
python -m py_compile llamadas/app/conversation/memory_consistency.py

# Verificar imports en chat_session.py y hybrid_session.py
python -c "from app.conversation.humanization import *; print('OK')"
```

### Paso 2: Ejecutar tests

```bash
# Tests unitarios
pytest tests/test_humanization_fixes.py -v

# Tests de integración
pytest tests/integration/ -v --tb=short
```

### Paso 3: Deploy a staging

```bash
# 1. Crear rama feature
git checkout -b feat/humanization-fixes-ciclo2

# 2. Commit
git add app/conversation/humanization.py
git add app/conversation/emotional_response.py
git add app/conversation/memory_consistency.py
git add app/gemini/chat_session.py  # con edits
git add app/elevenlabs/hybrid_session.py  # con edits
git commit -m "feat: 5 fixes humanización (pausing, fillers, edge cases, emotional, memory)"

# 3. Push a staging
git push origin feat/humanization-fixes-ciclo2

# 4. Deploy
deploy.sh staging

# 5. Smoke test (10 llamadas)
python tests/smoke_test_humanization.py
```

### Paso 4: Monitoreo inicial (24h)

```
Métricas a monitorear:
├─ Error rate: debe ser 0% (no breaking changes)
├─ Latencia p95: debe ser ≤750ms (pausing no debe aumentar)
├─ Pause distribution: histograma 400-1500ms
├─ Edge case hits: cuántos traps se detectaron
└─ Filler injection rate: ~40% de respuestas
```

---

## 🎯 CONFIGURACIÓN POR BUSINESS TYPE

### Veterinarias (urgencia + ROI)

```python
# config/veterinaria.yaml
humanization:
  smart_pausing:
    enabled: true
    min_ms: 400
    max_ms: 1500
    complexity_boost: 0.8  # Más pausa para preguntas complejas
  
  filler_words:
    enabled: true
    injection_rate: 0.40
    preferred: ["Fíjate que", "Te cuento", "Es que"]
  
  emotional_mirroring:
    enabled: true
    # Veterinario molesto → respuesta MUY empática
    molesto_max_frases: 1
    molesto_boost_empatia: 1.5
  
  memory_consistency:
    enabled: true
    # Veterinarios dan números específicos → rastrear bien
    fact_confidence_threshold: 0.8
```

### Yoga Studios (comunidad + facilidad)

```python
# config/yoga.yaml
humanization:
  smart_pausing:
    enabled: true
    min_ms: 300  # Más rápido, menos urgencia
    max_ms: 1200
    complexity_boost: 0.5
  
  filler_words:
    enabled: true
    injection_rate: 0.45  # Ligeramente más casual
    preferred: ["Lo que veo es", "Con estudios como el tuyo", "Es interesante porque"]
  
  emotional_mirroring:
    enabled: true
    # Yoga = tranquilidad
    tono_override: "tranquilo_amable"
  
  memory_consistency:
    enabled: true
```

### Banks (formal + confianza)

```python
# config/banco.yaml
humanization:
  smart_pausing:
    enabled: true
    min_ms: 500  # Pausa profesional
    max_ms: 2000
  
  filler_words:
    enabled: false  # Formal, sin fillers
  
  emotional_mirroring:
    enabled: true
    tono_override: "profesional_confiado"
  
  memory_consistency:
    enabled: true
    # Bancos son legales, verificar absolutamente todos los datos
    fact_confidence_threshold: 0.95
```

---

## 📊 MONITOREO EN TIEMPO REAL

### Endpoint: `/api/metrics/humanization`

```json
{
  "smart_pausing": {
    "calls_with_pausing": 1842,
    "pause_distribution": {
      "p50_ms": 750,
      "p95_ms": 1200,
      "p99_ms": 1800
    },
    "pause_caused_latency_increase": 0.0,
    "mean_pause_ms": 850
  },
  "filler_words": {
    "total_responses": 1842,
    "responses_with_fillers": 737,
    "injection_rate": 0.40,
    "most_common_fillers": [
      {"filler": "Pues mira", "count": 245},
      {"filler": "Fíjate que", "count": 189},
      {"filler": "Es que", "count": 156}
    ]
  },
  "edge_case_handler": {
    "traps_detected": 42,
    "trap_types": {
      "test_humano": 15,
      "absurdo": 12,
      "test_bot": 10,
      "imposible": 4,
      "humor": 1
    },
    "trap_success_rate": 0.95
  },
  "emotional_mirroring": {
    "total_classifications": 1842,
    "emotion_distribution": {
      "neutro": 847,
      "interesado": 412,
      "molesto": 127,
      "dudoso": 284,
      "ocupado": 172
    },
    "briefs_adjusted": 1089,
    "adjustment_rate": 0.59
  },
  "memory_consistency": {
    "facts_extracted": 3247,
    "avg_facts_per_call": 1.76,
    "questions_avoided": 512,
    "repetition_reduction": 0.48
  }
}
```

### Alertas automáticas

```python
# Si alguno de estos ocurre → pager alert:

ALERTS = {
    "Smart Pausing": {
        "p95_pause > 3000ms": "Pausas demasiado largas",
        "mean_pause < 200ms": "Pausas muy cortas (timing perfecto)",
    },
    "Edge Case Handler": {
        "trap_success_rate < 0.90": "No detectando traps correctamente",
        "trap_hits > 10%_of_calls": "Demasiados falsos positivos",
    },
    "Emotional Mirroring": {
        "adjustment_rate < 0.30": "Poco uso, revisar",
    },
    "Memory Consistency": {
        "repetition_reduction < 0.30": "Poco impacto, revisar extractores",
    },
}
```

### Dashboard Grafana

```
Panel 1: Smart Pausing Distribution
├─ Gráfica: Histograma de pausas (400-3000ms)
├─ KPI: p50, p95, p99
└─ Alert: Si p95 > 1500ms

Panel 2: Edge Case Detection
├─ Gráfica: Conteo por tipo de trap
├─ Tabla: Ejemplos de traps detectados
└─ KPI: Detection rate (% de calls)

Panel 3: Emotional Mirroring Impact
├─ Gráfica: Emoción vs tono ajustado
├─ Tabla: Ajustes realizados
└─ KPI: Adjustment coverage (%)

Panel 4: Memory Consistency
├─ Gráfica: Facts extraídos por call
├─ Tabla: Top 10 facts más comunes
└─ KPI: Questions avoided (%)
```

---

## 🔍 DEBUGGING GUÍAS

### Caso: Smart Pausing no funciona

**Síntomas:**
```
LOG: "Smart Pausing: esperar 150ms"  ← Muy rápido
```

**Diagnóstico:**
```python
# Verificar si is_cached=True está anulando
if is_cached:
    base = max(400, base - 200)  # Mínimo 400ms

# Verificar si turn_number es 1 (sin turno tardío boost)
if turn_number > 15:
    base += random.uniform(100, 400)
```

**Solución:**
```python
# Cambiar línea en chat_session.py
pause_ms = self._pacing.calculate_pause_ms(
    turn_number=len(self._history) // 2,
    intent=getattr(self, '_last_intent', 'neutro'),
    is_cached=False,  # ← Cambiar a False incluso para cache
    complexity=0.7,
)
```

---

### Caso: Fillers no se inyectan

**Síntomas:**
```
LOG: "Respuesta 1: tengo 3 opciones"
LOG: "Respuesta 2: tengo 3 opciones"
LOG: "Respuesta 3: tengo 3 opciones"
→ Sin fillers (mala suerte RNG)
```

**Diagnóstico:**
```python
# 40% chance es estadístico. Esperar 100+ respuestas para evaluar.
# Si aún así no inyecta, verificar:

if random.random() > 0.40:
    return response  # ← Esto retorna sin filler 60% del tiempo

# Aumentar rate:
if random.random() > 0.25:  # 75% chance en lugar de 40%
```

**Solución:**
```python
# En humanization.py
def inject(self, response: str, stage: str = "discovery") -> str:
    if random.random() > 0.25:  # Aumentar a 75%
        return response
    # ...
```

---

### Caso: Edge Cases detecta falsos positivos

**Síntomas:**
```
P: "Dile a María que mañana hay reunión"
→ Detecta como trap "imposible" (falso positivo)
```

**Diagnóstico:**
```python
# Patrón es muy amplio
r"(?:dile|pídele|dí)\s+(?:a\s+)?(?:twilio|google|...)\s+"

# Pero "Dile a María" también coincide
```

**Solución:**
```python
# Hacer patrón más específico
r"(?:dile|pídele|dí)\s+a\s+(?:twilio|google|gemini|cal\.com|whatsapp)\s+"
# (solo servicios, no personas)
```

---

## 🚀 ROLLBACK PLAN

Si algo sale mal:

```bash
# 1. Identificar problema
tail -f logs/app.log | grep -i "humanization"

# 2. Si es crítico (error rate > 5%), rollback inmediato
git revert feat/humanization-fixes-ciclo2

# 3. Redeploy
deploy.sh production

# 4. Investigar offline
# - Revisar logs
# - Ejecutar tests
# - Ajustar configuración
```

---

## 📈 A/B TEST PLAN

### Test 1: Smart Pausing (Semana 1)

```
Control: Sin pausing (timing perfecto)
Test: Con pausing (400-1500ms)

Métrica: Latencia percibida + "Siente que es IA"
Sample: 100 calls × 2 = 200 calls
Duration: 3-5 días
Success: Test < Control en "Siente que es IA"
```

### Test 2: Emotional Mirroring (Semana 2)

```
Control: Brief genérico
Test: Brief ajustado por emoción

Métrica: NPS + Satisfacción + Conversión
Sample: 200 calls × 2 = 400 calls
Duration: 1 semana
Success: Test > Control en NPS +5 puntos
```

### Test 3: Memory Consistency (Semana 3)

```
Control: Sin memory (preguntar 2x)
Test: Con memory (detectar repetición)

Métrica: Repeticiones + Frustración + Conversión
Sample: 100 calls × 2 = 200 calls
Duration: 5 días
Success: Test < Control en repeticiones -50%
```

---

## 🎁 BONUS: Configuración avanzada

### Por demogr áfico

```python
# Prospecto: Hombre, 55+, formal
if prospect.age > 50 and prospect.gender == "M":
    config.smart_pausing.min_ms = 500  # Más formal
    config.filler_words.enabled = False
    config.emotional_mirroring.tono = "profesional_directo"

# Prospecto: Mujer, 25-35, casual
if prospect.age < 35 and prospect.gender == "F":
    config.smart_pausing.min_ms = 300  # Más rápido
    config.filler_words.injection_rate = 0.50  # Más casual
    config.emotional_mirroring.tono = "cercano_amable"
```

### Por hora del día

```python
# Mañana: gente ocupada, respuestas rápidas
if 9 <= hour < 12:
    config.smart_pausing.max_ms = 1000  # Más rápido
    config.filler_words.enabled = False

# Tarde: gente menos ocupada, más conversación
if 14 <= hour < 18:
    config.smart_pausing.max_ms = 1500  # Normal
    config.filler_words.injection_rate = 0.45
```

---

## ✅ CHECKLIST FINAL

- [ ] Tests pasan (pytest)
- [ ] Merge a main
- [ ] Deploy a production
- [ ] Monitoreo 24h sin errores
- [ ] A/B tests ejecutándose
- [ ] Dashboard Grafana activo
- [ ] Alertas configuradas
- [ ] Equipo notificado
- [ ] Documentación actualizada
- [ ] Feedback de usuarios recopilado

---

*Guía de Deployment y Monitoreo — Sistema v2.3  
Ready for production deployment ✅*
