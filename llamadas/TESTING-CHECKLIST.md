# Testing Checklist: Verificar que los Fixes Funcionan

> **Objetivo:** Verificar que los 6 fixes implementados funcionan correctamente  
> **Duración:** ~2-3 horas de testing  
> **Requerimientos:** Acceso a:  
> - `/status` endpoint  
> - Logs en `~/.llamadas/logs/`  
> - 20-50 llamadas reales o simuladas  
> - Admin dashboard

---

## ✅ TESTING ANTES DE DEPLOY

### TEST 1: VAD Optimizado (150ms)
**Archivo:** `app/config.py` (línea 76)  
**Objetivo:** Verificar que VAD no corta palabras erróneamente

```bash
# 1. Verificar configuración
grep "vad_silence_ms" app/config.py
# ESPERADO: "vad_silence_ms: int = 150"
[ ] ✓ Configurado correctamente

# 2. Grabar 50 llamadas de prueba
# Escenarios de prueba:
[LLAMADA]                      [ESPERADO]
- "Hola"                       Completo ✓
- "Es que... bueno"            NO cortar en "Es que"
- "Y... espera"                Aceptable cortar en "Y" (trade-off)
- "Tienes tres opciones"       Completo ✓
- "Precio? Eh... sí"           NO cortar en "Eh"
- "Perfecto, mañana"           Completo ✓

# 3. Métrica de éxito
Falsos positivos (palabras cortadas): < 2%
Si > 2%, revertir a 175ms

[ ] ✓ Falsos positivos < 2%
```

---

### TEST 2: Compliance - Timezone Correcto
**Archivo:** `app/compliance/mx.py`  
**Objetivo:** Verificar que respeta hora local del prospecto, no del servidor

```bash
# 1. Setup: 3 leads en diferentes zonas horarias
LEAD_A = "+5255..." (DF, UTC-6)      # Zona México City
LEAD_B = "+52664..." (Tijuana, UTC-7) # Zona Tijuana
LEAD_C = "+52..." (Hermosillo, UTC-7) # Zona Hermosillo

# 2. Llamar a cada lead a las 8 PM su hora local
# (horario bloqueado en México)

# ESPERADO: Todas las llamadas bloqueadas
[ ] ✓ LEAD_A bloqueado (8 PM DF = 20:00 México City) 
[ ] ✓ LEAD_B bloqueado (8 PM Tijuana = 20:00 Tijuana)
[ ] ✓ LEAD_C bloqueado (8 PM Hermosillo = 20:00 Hermosillo)

# 3. Verificar logs
tail -f ~/.llamadas/logs/compliance_audit.log
# ESPERADO: "fuera_de_horario_legal" para los 3
[ ] ✓ Logs muestran horario bloqueado
```

---

### TEST 3: Compliance - Logging para Auditoría
**Archivo:** `app/compliance/mx.py`  
**Objetivo:** Verificar que todos los eventos se registran

```bash
# 1. Hacer 10 llamadas:
#    - 3 que detecten opt-out
#    - 2 dentro de horario
#    - 2 fuera de horario
#    - 3 normales

# 2. Revisar compliance_audit.log
tail -100 ~/.llamadas/logs/compliance_audit.log | grep "COMPLIANCE"

# ESPERADO: Cada evento debe mostrar:
# {
#   "phone": "+525512345678",
#   "lead_id": "...",
#   "event_type": "...",
#   "timestamp": "2026-06-21T...",
#   "details": {...}
# }

[ ] ✓ 10 eventos registrados
[ ] ✓ Cada evento tiene timestamp
[ ] ✓ Opt-out detected × 3
[ ] ✓ Horario legal blocked × 2
```

---

### TEST 4: Compliance - Consentimiento de Grabación
**Archivo:** `app/compliance/mx.py` (función nueva)  
**Objetivo:** Verificar que la función existe y se puede llamar

```bash
# 1. En Python, importar y llamar
from app.compliance.mx import must_get_recording_consent

resultado = must_get_recording_consent()
print(resultado)

# ESPERADO:
# "¿Me autoriza a grabar esta llamada para mejorar nuestro servicio?"

[ ] ✓ Función existe
[ ] ✓ Retorna pregunta correcta

# 2. (MANUAL) Verificar que media_stream.py lo usa
# TODO: Implementar en media_stream.py en próxima fase
# Por ahora solo verificar que la función está disponible
```

---

### TEST 5: Compliance - Disclosure FORZADO
**Archivo:** `app/conversation/prompts.py` (build_conversator_prompt)  
**Objetivo:** Verificar que Gemini DEBE mencionar que es IA

```bash
# 1. Hacer 10 llamadas normales
# 2. Para CADA llamada, revisar la transcripción:

[TRANSCRIPCIÓN]
Agente: "Le comento que soy un asistente virtual..."
                     ↑ DEBE mencionar IA en primeros 30s

# 3. Métrica de éxito
disclosure_mentioned_rate = 10/10 = 100%

[ ] ✓ Call 1: Disclosure ✓
[ ] ✓ Call 2: Disclosure ✓
[ ] ✓ Call 3: Disclosure ✓
[ ] ✓ Call 4: Disclosure ✓
[ ] ✓ Call 5: Disclosure ✓
[ ] ✓ Call 6: Disclosure ✓
[ ] ✓ Call 7: Disclosure ✓
[ ] ✓ Call 8: Disclosure ✓
[ ] ✓ Call 9: Disclosure ✓
[ ] ✓ Call 10: Disclosure ✓

# 4. Si alguno NO menciona IA, investigar:
grep "Le comento\|Soy un asistente\|inteligencia artificial" transcript.log
```

---

### TEST 6: Confiabilidad - Fallback para Cal.com
**Archivo:** `app/gemini/tools.py`  
**Objetivo:** Verificar que si Cal.com falla, la demo se agenda por WhatsApp

```bash
# 1. SETUP: Simular Cal.com caído
# Opción A: Apagar Cal.com temporalmente
# Opción B: Mock el endpoint para retornar 503

# 2. Hacer 5 llamadas normales donde agenden demo
# 3. Verificar que demos se agendan igual

[ ] ✓ Call 1: Demo agendada (fallback activo)
[ ] ✓ Call 2: Demo agendada (fallback activo)
[ ] ✓ Call 3: Demo agendada (fallback activo)
[ ] ✓ Call 4: Demo agendada (fallback activo)
[ ] ✓ Call 5: Demo agendada (fallback activo)

# 4. Revisar logs
grep "Cal.com falló\|activando fallback" app.log

[ ] ✓ Logs muestran fallback activado
[ ] ✓ Prospecto NO escuchó error (seamless)
```

---

## 🧪 INTEGRATION TESTS

### TEST 7: End-to-End Compliance
**Objetivo:** Una llamada completa que demuestre todos los fixes

```bash
# Setup
LEAD_PHONE = "+5255123456"  # DF
HORA_TEST = "20:30"         # 8:30 PM (fuera de horario)

# 1. SCENARIO A: Llamada fuera de horario
Intentar llamar a las 20:30 (fuera de horario legal)
[ ] ✓ Llamada bloqueada con "fuera_de_horario_legal"
[ ] ✓ Log registra intento
[ ] ✓ No se marca a Twilio

# 2. SCENARIO B: Llamada dentro de horario con opt-out
LEAD_PHONE = "+5255123456"  # DF
HORA_TEST = "15:00"         # 3:00 PM (dentro de horario)

Llamar → Prospecto dice "no me llamen"
[ ] ✓ Detecta opt-out
[ ] ✓ Registra opt-out en BD
[ ] ✓ Log compliance_audit contiene evento
[ ] ✓ Próxima llamada está bloqueada

# 3. SCENARIO C: Llamada exitosa con disclosure
LEAD_PHONE = "+5255123456"  # DF
HORA_TEST = "15:00"         # 3:00 PM
PROSPECTO_DICE = "Sí, quiero agendar"

Llamar → Prospecto acepta agenda
[ ] ✓ Disclosure mencionado (primeros 30s)
[ ] ✓ Demo agendada correctamente
[ ] ✓ WhatsApp enviado (confirmación)
[ ] ✓ Logs completos en compliance_audit.log
```

---

## 📊 MÉTRICAS EN /STATUS

```bash
# Ver métricas en tiempo real
curl http://localhost:8000/status | jq '.'

# VERIFICAR:
{
  "counters": {
    "call_started": ≥ 10,
    "outcome_demo_agendada": ≥ 1,
    "outcome_completada": ≥ 5,
    "barge_in": ≥ 0,
    "sentimiento_negativo": ≤ 2
  },
  "rates": {
    "demo_agendada": ≥ 0.08,  # 8% target
    "conversacion_30s": ≥ 0.3  # 30% target
  },
  "latency_avg_s": 0.85,      # Target < 0.95
  "latency_p95_s": 1.20,      # Target < 1.3
  "component_stats": {
    "elevenlabs_tts": {
      "p50_ms": ≤ 150,
      "p95_ms": ≤ 250
    }
  }
}

[ ] ✓ call_started > 10
[ ] ✓ latency_avg_s < 0.95
[ ] ✓ latency_p95_s < 1.3
[ ] ✓ demo_agendada rate ≥ 8%
[ ] ✓ No hay circuit breaker activo
```

---

## 🔍 LOG INSPECTION

```bash
# Archivos importantes
~/.llamadas/logs/compliance_audit.log  # Auditoría PROFECO
~/.llamadas/logs/app.log              # General
~/.llamadas/logs/error.log            # Errores

# Buscar eventos importantes
grep "COMPLIANCE" ~/.llamadas/logs/compliance_audit.log | head -20
grep "fallback" ~/.llamadas/logs/app.log
grep "optout" ~/.llamadas/logs/compliance_audit.log
grep "disclosure" ~/.llamadas/logs/app.log

# ESPERADO:
# - Múltiples "COMPLIANCE: Llamada permitida"
# - Algunos "COMPLIANCE: Opt-out registrado"
# - Al menos 1 "activando fallback"
# - 0 errores no capturados
```

---

## ✅ SIGN-OFF CHECKLIST

Antes de deploying a producción, marca cada elemento:

```
LATENCIA:
  [ ] p50 < 0.8s
  [ ] p95 < 1.2s
  [ ] p99 < 1.5s

COMPLIANCE:
  [ ] Disclosure: 100% en primeros 30s
  [ ] Logging: Todos los eventos registrados
  [ ] Timezone: Respeta zona local del prospecto
  [ ] Opt-out: Bloqueado correctamente

CONFIABILIDAD:
  [ ] Agendar demo: Fallback funciona si Cal.com cae
  [ ] STT: Falsos positivos VAD < 2%
  [ ] Gemini: No hay timeouts sin fallback

OBSERVABILIDAD:
  [ ] /status endpoint responde en < 100ms
  [ ] Compliance_audit.log contiene todos los eventos
  [ ] Métricas se actualizan en tiempo real

ERRORES:
  [ ] 0 errores silenciosos (todos loguedos)
  [ ] Todas las excepciones tienen fallback
  [ ] Ningún prospecto escuchó un error

TESTING:
  [ ] 50+ llamadas testeadas
  [ ] Todos los 6 fixes verificados
  [ ] Escenarios edge case cubiertos
```

---

## 📋 TESTING REPORT TEMPLATE

```
TESTING REPORT - SISTEMA DE LLAMADAS
=====================================

FECHA: 2026-06-21
TESTER: [Tu nombre]
LLAMADAS_TESTEADAS: 50

RESULTADO GENERAL: PASSOU / FALLOU / PARCIAL

DETALLE POR FIX:

1. VAD Optimizado (150ms)
   Status: [ ] PASS [ ] FAIL [ ] PARTIAL
   Falsos positivos: ___/50 (__%)
   Notas: _______________

2. Timezone Correcto
   Status: [ ] PASS [ ] FAIL [ ] PARTIAL
   Llamadas bloqueadas correctamente: [ ] Sí [ ] No
   Notas: _______________

3. Logging Auditoría
   Status: [ ] PASS [ ] FAIL [ ] PARTIAL
   Eventos registrados: ___/50
   Notas: _______________

4. Consentimiento Grabación
   Status: [ ] PASS [ ] FAIL [ ] PARTIAL
   Función disponible: [ ] Sí [ ] No
   Notas: _______________

5. Disclosure Forzado
   Status: [ ] PASS [ ] FAIL [ ] PARTIAL
   Calls con disclosure: ___/50 (___%)
   Notas: _______________

6. Fallback Cal.com
   Status: [ ] PASS [ ] FAIL [ ] PARTIAL
   Demos agendadas con fallback: ___/5
   Prospecto escuchó error: [ ] Sí [ ] No
   Notas: _______________

MÉTRICAS:
- Latencia p50: ___ms (target: < 800ms)
- Latencia p95: ___ms (target: < 1200ms)
- Demo agendar rate: __% (target: ≥ 8%)
- Disclosure mention rate: __% (target: 100%)

BLOCKERS PARA DEPLOY:
[ ] Ninguno
[ ] Listar:
___________________________
___________________________

RECOMENDACIONES:
___________________________
___________________________

APROBADO PARA DEPLOY: [ ] SÍ [ ] NO [ ] CON RESERVAS
Firma: _________________ Fecha: _____________
```

---

## 🔧 Troubleshooting

**Q: VAD corta muchas palabras (> 2% falsos positivos)**
```
A: Revertir a 175ms (compromise entre latencia y cortes)
   vad_silence_ms: int = 175  # Balance
```

**Q: Los logs de compliance no aparecen**
```
A: Verificar:
   1. compliance_logger en mx.py está configurado
   2. ~/.llamadas/logs/ existe
   3. Permiso de escritura en logs/
   
   tail -f ~/.llamadas/logs/compliance_audit.log
```

**Q: Disclosure no se menciona consistentemente (< 95%)**
```
A: El prompt se inyectó pero Gemini lo ignora a veces
   - Aumentar prioridad de disclosure en el prompt
   - Cambiar phrasing: "DEBES MENCIONAR" vs. "por favor menciona"
   - Debuggear con una llamada de prueba
```

**Q: Fallback de agendar_demo no funciona**
```
A: Verificar:
   1. La función send_whatsapp existe
   2. log_demo acepta parameter status="pendiente"
   3. Logs muestran "Cal.com falló, activando fallback"
   
   grep "Cal.com falló" app.log
```

---

*Checklist de testing. Actualizado 2026-06-21.*
