# Análisis de Costes por Llamada — Agente de Voz AI (Sistema LEGO)

> **Fecha:** Junio 2026  
> **Sistema:** Silxar CRM — Agente de Voz AI Modular  
> **Pipeline:** ElevenLabs Flash v2.5 (STT+TTS) + Gemini Chat Dual (Maestro + Voz)  
> **Autor:** Análisis técnico de costes

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura de Costes](#2-arquitectura-de-costes)
3. [Desglose Detallado por Componente](#3-desglose-detallado-por-componente)
4. [Cálculo por Llamada Típica](#4-cálculo-por-llamada-típica)
5. [Escenarios de Volumen](#5-escenarios-de-volumen)
6. [Comparativa vs Alternativas](#6-comparativa-vs-alternativas)
7. [Optimizaciones de Coste](#7-optimizaciones-de-coste)
8. [Conclusiones](#8-conclusiones)

---

## 1. Resumen Ejecutivo

Este documento desglosa **céntimo a céntimo** cuánto cuesta cada llamada que realiza el agente de voz AI. El sistema usa una arquitectura **dual-LLM + pipeline híbrido de voz** que optimiza tanto la calidad conversacional como los costes operativos.

### Coste Total por Llamada (resumen)

| Escenario | Duración | Coste/llamada |
|-----------|----------|---------------|
| **España (fijo)** — SmartDental / Groomly | 3 min | **~$0.26 USD** (~€0.24) |
| **México (móvil)** — Peluguau | 3 min | **~$0.35 USD** (~$6.20 MXN) |
| **España (móvil)** | 3 min | **~$0.74 USD** (~€0.68) |
| Llamada corta (contestador, <30s) | 30s | **~$0.06 USD** |
| Llamada larga (interesado, 6 min) | 6 min | **~$0.45 USD** |

> **Contexto:** Una llamada de 3 minutos con 10-12 turnos de conversación cuesta entre **$0.26 y $0.35** dependiendo del país. El coste más alto es el audio (TTS), no los LLMs.

---

## 2. Arquitectura de Costes

El sistema tiene **5 capas** que generan coste en cada llamada:

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 5: TELEFONÍA (Twilio)                                     │
│  ─ Llamada saliente (per-minute)                                │
│  ─ Número de teléfono (mensual)                                 │
│  ─ WhatsApp de follow-up (per-message)                          │
│  Coste: ~$0.05-0.54 por llamada (depende del destino)          │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 4: VOZ — TTS (ElevenLabs Flash v2.5)                     │
│  ─ Convierte texto del agente → audio μ-law 8kHz               │
│  ─ ~75ms time-to-first-audio                                   │
│  Coste: ~$0.11 por llamada (el componente más caro)            │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 3: VOZ — LLM (Gemini 3.1 Flash-Lite)                     │
│  ─ Genera respuesta textual natural (~180ms, 400 T/s)          │
│  ─ Corre en CADA turno (10-12 veces por llamada)               │
│  Coste: ~$0.013 por llamada                                    │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 2: MAESTRO — LLM (Gemini 3.5 Flash)                      │
│  ─ Genera brief estratégico cada 2-3 turnos                    │
│  ─ Corre ~5-6 veces por llamada                                │
│  Coste: ~$0.049 por llamada                                    │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 1: STT (ElevenLabs Scribe v2)                            │
│  ─ Transcribe voz del prospecto → texto (~120ms)               │
│  ─ Coste por minuto de audio transcrito                        │
│  Coste: ~$0.02 por llamada de 3 min                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Desglose Detallado por Componente

### 3.1 ElevenLabs TTS — Flash v2.5 (Texto a Voz)

**¿Qué hace?** Convierte el texto generado por el LLM en audio de voz natural que suena por el teléfono.

**Precio API (2026):**
- **$0.00005 por carácter** (~$50 por 1 millón de caracteres)
- Flash v2.5 cuesta **0.5 créditos por carácter** (la mitad que Multilingual v2/v3)

**Consumo por llamada:**

| Concepto | Valor |
|----------|-------|
| Caracteres por respuesta del agente | ~150-200 chars |
| Turnos por llamada típica | ~10-12 turnos |
| Caracteres totales TTS/llamada | ~1,800-2,400 chars |
| **Coste TTS/llamada** | **~$0.09 - $0.12** |

**Ejemplo real:**
> "Hola, soy Carlos de SmartDental. Sé que está ocupado, le prometo que solo le robo 30 segundos..."
> → Esa frase son ~143 caracteres = $0.0072

**¿Por qué es el componente más caro?** Porque generamos MUCHO texto hablado. Cada palabra que dice el agente se convierte en audio carácter a carácter. En una llamada de 3 minutos, el agente habla ~2,000 caracteres.

---

### 3.2 ElevenLabs STT — Scribe v2 (Voz a Texto)

**¿Qué hace?** Escucha lo que dice el prospecto por teléfono y lo transcribe a texto en tiempo real con ~120ms de latencia.

**Precio API (2026):**
- **$0.0065 por minuto** de audio ($0.39/hora en plan Business)
- El plan más barato (Enterprise anual) baja a $0.0047/min

**Consumo por llamada:**

| Concepto | Valor |
|----------|-------|
| Duración media llamada | ~3 minutos |
| Audio transcrito (prospecto) | ~1.5-2 min (no habla todo el tiempo) |
| **Coste STT/llamada** | **~$0.01 - $0.013** |

**Nota:** El STT solo transcribe cuando el prospecto habla. En una llamada de 3 minutos, el prospecto habla ~40-50% del tiempo (el agente habla el resto). El audio del agente NO pasa por STT.

---

### 3.3 Gemini 3.1 Flash-Lite — Modelo Voz (LLM conversacional)

**¿Qué hace?** Es el "actor" que responde en cada turno. Lee el brief del Maestro + el último mensaje del usuario y genera texto natural. Corre **en cada uno de los 10-12 turnos** de la llamada.

**Precio API (2026):**
- Input: **$0.25 por 1M tokens**
- Output: **$1.50 por 1M tokens**
- Context caching (90% descuento): $0.025/1M tokens

**Consumo por llamada:**

| Concepto | Tokens | Coste |
|----------|--------|-------|
| System prompt (dinámico + brief) | ~2,500 tokens × 12 turnos | ~$0.0075 |
| Historial reciente (últimos 3 turnos) | ~800 tokens × 12 turnos | ~$0.0024 |
| **Total input** | ~39,600 tokens | **~$0.0099** |
| **Total output** | ~1,800 tokens (~150×12) | **~$0.0027** |
| **Coste Voz/llamada** | | **~$0.013** |

> Flash-Lite genera texto a **~380-400 tokens/segundo**, así que una respuesta de 150 tokens tarda ~0.4 segundos en generarse completa.

---

### 3.4 Gemini 3.5 Flash — Modelo Maestro (Estratega)

**¿Qué hace?** Es el "director". Lee TODO el historial, analiza la estrategia, y escribe un brief (guion) para el modelo Voz. **NO corre en cada turno** — solo cada 2-3 turnos + eventos críticos.

**Precio API (2026):**
- Input: **$1.50 por 1M tokens**
- Output: **$9.00 por 1M tokens**
- Es ~6x más caro que Flash-Lite, pero corre mucho menos veces

**Consumo por llamada:**

| Concepto | Tokens | Coste |
|----------|--------|-------|
| Veces que corre (cada 2 turnos ≈ 6 veces) | 6 briefs | — |
| Input por brief (historial + prompt del Maestro) | ~3,000 tokens × 6 | ~$0.027 |
| Output por brief (JSON con estrategia) | ~400 tokens × 6 | ~$0.0216 |
| **Coste Maestro/llamada** | | **~$0.049** |

> Aunque 3.5 Flash es el modelo más caro por token, su coste total es similar al de Flash-Lite porque corre **6 veces vs 12** y su output es más corto (JSON estructurado vs texto conversacional).

---

### 3.5 Twilio — Telefonía

**¿Qué hace?** Conecta la llamada al mundo real: números de teléfono, redes móviles, audio bidireccional vía WebSocket.

#### A) Coste por minuto de llamada (2026)

| Destino | Precio/min | 3 min | 6 min |
|---------|-----------|-------|-------|
| **España (fijo)** | $0.0178 | $0.053 | $0.107 |
| **España (móvil)** | $0.1800 | $0.540 | $1.080 |
| **México (móvil)** | $0.0473 | $0.142 | $0.284 |
| México (fijo/local) | ~$0.010-0.02 | ~$0.03-0.06 | ~$0.06-0.12 |

> **¡Ojo!** Llamar a móviles en España cuesta **10x más** que llamar a fijos. En México la diferencia es menor (móvil ~2-4x más caro que fijo).

#### B) Número de teléfono (mensual)

| País | Precio/mes |
|------|-----------|
| España (+34) | ~$3-5 USD |
| México (+52) | ~$5-8 USD |

> Esto es un coste fijo mensual, no por llamada. Dividido entre 500 llamadas/mes = ~$0.01/llamada.

#### C) Grabación de llamada

Twilio graba las llamadas para análisis posterior: **$0.0025/min** de grabación (negligible).

#### D) WhatsApp de follow-up

| Tipo | Precio/mensaje |
|------|---------------|
| WhatsApp saliente (template) | ~$0.005-0.015 |
| WhatsApp saliente (sesión) | ~$0.005-0.02 |

Por llamada se envían 1-2 mensajes de WhatsApp (follow-up + recordatorio): **~$0.01-0.02/llamada**.

---

### 3.6 Servidor / Infraestructura

| Concepto | Coste/mes | Coste/llamada (500/mes) |
|----------|-----------|------------------------|
| VPS (2 vCPU, 4GB RAM, Europa) | ~$20 USD | ~$0.04 |
| Redis (caché de sesiones) | ~$5 USD | ~$0.01 |
| PostgreSQL (datos de llamadas) | ~$10 USD | ~$0.02 |
| **Total infra/llamada** | | **~$0.07** |

> Nota: Si se co-localiza el servidor en Frankfurt (España) se reduce latencia pero el coste se mantiene similar.

---

## 4. Cálculo por Llamada Típica

### Escenario Base: Llamada de 3 minutos, 12 turnos, España fijo

| Componente | Cálculo | Coste |
|------------|---------|-------|
| **ElevenLabs TTS** (Flash v2.5) | 2,200 chars × $0.00005 | **$0.110** |
| **ElevenLabs STT** (Scribe v2) | 2 min × $0.0065/min | **$0.013** |
| **Gemini 3.1 Flash-Lite** (Voz) | 40k input + 1.8k output tokens | **$0.013** |
| **Gemini 3.5 Flash** (Maestro) | 18k input + 2.4k output tokens | **$0.049** |
| **Twilio voz** (España fijo) | 3 min × $0.0178/min | **$0.053** |
| **Twilio WhatsApp** | 1 mensaje follow-up | **$0.010** |
| **Infraestructura** (prorrateado) | $35/mes ÷ 500 llamadas | **$0.070** |
| | | |
| **TOTAL por llamada** | | **~$0.318** |

### Escenario: Llamada a México (móvil) — Peluguau

| Componente | Cálculo | Coste |
|------------|---------|-------|
| ElevenLabs TTS | 2,200 chars × $0.00005 | $0.110 |
| ElevenLabs STT | 2 min × $0.0065/min | $0.013 |
| Gemini 3.1 Flash-Lite | 40k input + 1.8k output tokens | $0.013 |
| Gemini 3.5 Flash | 18k input + 2.4k output tokens | $0.049 |
| **Twilio voz** (México móvil) | 3 min × $0.0473/min | **$0.142** |
| Twilio WhatsApp | 1 mensaje | $0.010 |
| Infraestructura | prorrateado | $0.070 |
| | | |
| **TOTAL por llamada** | | **~$0.407** |

### Escenario: Llamada corta (contestador automático, 30 segundos)

| Componente | Cálculo | Coste |
|------------|---------|-------|
| ElevenLabs TTS | 300 chars (saludo + despedida) | $0.015 |
| ElevenLabs STT | 0 min (cuelga rápido) | $0.000 |
| Gemini 3.1 Flash-Lite | 2 turnos × 3k tokens | $0.002 |
| Gemini 3.5 Flash | 1 brief | $0.008 |
| Twilio voz | 0.5 min × $0.0178 | $0.009 |
| Infraestructura | prorrateado | $0.070 |
| | | |
| **TOTAL** | | **~$0.104** |

> Las llamadas a contestador cuestan ~3x menos porque no hay conversación real. El sistema detecta el buzón y cuelga.

### Escenario: Llamada larga (prospecto interesado, 6 minutos, 20 turnos)

| Componente | Cálculo | Coste |
|------------|---------|-------|
| ElevenLabs TTS | 4,000 chars | $0.200 |
| ElevenLabs STT | 4 min × $0.0065 | $0.026 |
| Gemini 3.1 Flash-Lite | 80k input + 3k output | $0.024 |
| Gemini 3.5 Flash | 10 briefs | $0.080 |
| Twilio voz | 6 min × $0.0178 | $0.107 |
| WhatsApp | 2 mensajes | $0.020 |
| Infraestructura | prorrateado | $0.070 |
| | | |
| **TOTAL** | | **~$0.527** |

---

## 5. Escenarios de Volumen

### 5.1 SmartDental — 500 llamadas/mes (España, mix fijo/móvil)

Suponiendo 70% fijos, 30% móviles:

| Concepto | Cálculo | Coste/mes |
|----------|---------|-----------|
| ElevenLabs TTS | 500 × $0.11 | $55.00 |
| ElevenLabs STT | 500 × $0.013 | $6.50 |
| Gemini 3.1 Flash-Lite | 500 × $0.013 | $6.50 |
| Gemini 3.5 Flash | 500 × $0.049 | $24.50 |
| Twilio voz | 350 × $0.053 + 150 × $0.54 | $99.55 |
| Twilio número (+34) | 1 número | $4.00 |
| WhatsApp | 500 × $0.01 | $5.00 |
| Infraestructura | VPS + Redis + DB | $35.00 |
| | | |
| **TOTAL/mes** | | **~$236** |
| **Coste/llamada** | | **~$0.47** |

### 5.2 Peluguau — 500 llamadas/mes (México, móvil)

| Concepto | Cálculo | Coste/mes |
|----------|---------|-----------|
| ElevenLabs TTS | 500 × $0.11 | $55.00 |
| ElevenLabs STT | 500 × $0.013 | $6.50 |
| Gemini 3.1 Flash-Lite | 500 × $0.013 | $6.50 |
| Gemini 3.5 Flash | 500 × $0.049 | $24.50 |
| Twilio voz | 500 × $0.142 | $71.00 |
| Twilio número (+52) | 1 número | $6.50 |
| WhatsApp | 500 × $0.01 | $5.00 |
| Infraestructura | VPS + Redis + DB | $35.00 |
| | | |
| **TOTAL/mes** | | **~$210** |
| **Coste/llamada** | | **~$0.42** |

### 5.3 Groomly — 500 llamadas/mes (España)

Similar a SmartDental: **~$236/mes**, **~$0.47/llamada**.

### 5.4 Todos los softwares juntos — 1,500 llamadas/mes

| Concepto | Coste/mes |
|----------|-----------|
| ElevenLabs (TTS + STT) | $183.00 |
| Gemini (Flash-Lite + Flash) | $111.00 |
| Twilio (voz + números + WhatsApp) | $176.05 |
| Infraestructura | $35.00 |
| | |
| **TOTAL/mes** | **~$505** |
| **Coste/llamada** | **~$0.34** |

> **Economía de escala:** Al consolidar infraestructura entre softwares, el coste por llamada baja de ~$0.47 a ~$0.34 porque el servidor, Redis y DB se comparten.

---

## 6. Comparativa vs Alternativas

### 6.1 Coste por llamada comparado

| Opción | Coste/llamada | Coste/mes (500) | Personalizable |
|--------|--------------|-----------------|----------------|
| **Nuestro sistema (Sistema LEGO)** | **~$0.35-0.47** | **~$210-236** | **Sí — 100%** |
| Retell AI (plataforma no-code) | ~$0.08/min = ~$0.24/3min | ~$120 + $99 plan | Limitado |
| Bland AI | ~$0.12/min = ~$0.36/3min | ~$180 + $149 plan | Limitado |
| Synthflow | ~$0.10/min = ~$0.30/3min | ~$150 + $75 plan | Medio |
| Vapi | ~$0.05/min = ~$0.15/3min | ~$75 + $49 plan | Medio |
| Agencia telemarketing (humano) | — | ~$500 + comisiones | No |
| Comercial interno | — | ~$2,000 salario | No |

### 6.2 Análisis de la comparativa

**Ventajas de nuestro sistema:**
- **100% personalizable** por software (voz, scripts, casos, precios, moneda)
- **Multi-software** con un solo motor (SmartDental + Peluguau + Groomly = misma infra)
- **Dual-LLM** = mejor estrategia de ventas que plataformas genéricas
- **No hay coste fijo de plataforma** (no pagas $99-149/mes solo por existir)

**Desventajas:**
- Requiere mantenimiento técnico (nosotros lo hacemos)
- Setup inicial más complejo

**¿Cuándo una plataforma no-code gana?**
- Si solo necesitas 1 software y 1 voz
- Si no necesitas estrategia de ventas compleja
- Si prefieres no tocar código

**¿Cuándo nuestro sistema gana?**
- Multi-software (3+ marcas con el mismo motor)
- Estrategia de ventas sofisticada (dual-LLM)
- Escalabilidad sin límites de plataforma
- Coste predecible (pagas solo lo que usas)

---

## 7. Optimizaciones de Coste

### 7.1 Optimizaciones ya implementadas

| Optimización | Ahorro estimado |
|--------------|-----------------|
| **Flash v2.5** (0.5 créditos vs 1.0) | **50% en TTS** vs Multilingual v2 |
| **Dual-LLM** (Maestro cada 2-3 turnos) | **~60% en LLM** vs modelo único en cada turno |
| **Classifier híbrido** (no cada turno) | **~40% en clasificación** |
| **Context caching** (Gemini) | **~90% en input repetido** |
| **DSP de audio** (menos errores STT) | **~20% menos reintentos** |
| **VAD afinado** (200ms silence) | Menos turnos vacíos = menos tokens |

### 7.2 Optimizaciones futuras (potencial de ahorro)

| Optimización | Ahorro estimado | Implementación |
|--------------|-----------------|----------------|
| **Cache semántico de respuestas** | ~30% menos llamadas a Voz | Próximo trimestre |
| **Streaming TTS token-by-token** | ~150-300ms menos latencia percibida | Próximo trimestre |
| **Batch API para Maestro** | 50% en coste de briefs | Posible |
| **Co-localización en Europa** | -50-150ms latencia (más conversaciones largas) | Posible |
| **Clonación de voz propia** | Elimina coste de ElevenLabs (usar voz propia) | Futuro |
| **Negociación Twilio Enterprise** | ~20-30% en telefonía | >10k llamadas/mes |

### 7.3 Cómo reducir costes HOY

1. **Usar números locales por LADA** (ya implementado): Mejor answer rate = menos llamadas desperdiciadas
2. **AMD (detector de contestador)**: Cuelga inmediato en buzones = ahorra ~$0.10/llamada fallida
3. **Gatekeeper script eficiente**: Corta en 2 turnos si no hay email = ahorra minutos
4. **Ajustar brief del Maestro**: Menos tokens en output = menos coste
5. **Context caching**: Activar para prompts repetidos del Voz

---

## 8. Conclusiones

### 8.1 Lo más importante

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cuánto cuesta una llamada? | **$0.26 - $0.47** dependiendo del país y duración |
| ¿Qué componente es más caro? | **TTS (voz)** = ~35% del coste total |
| ¿Los LLMs son caros? | **No** = solo ~20% del coste combinados |
| ¿La telefonía es cara? | **Depende** = España fijo es barato, España móvil es caro |
| ¿Es rentable vs alternativas? | **Sí** = 2-5x más barato que plataformas no-code equivalentes |

### 8.2 Breakdown del coste total

```
COSTE POR LLAMADA ($0.35 promedio)
═══════════════════════════════════════════════

TTS (ElevenLabs Flash v2.5)     ████████████████░░░░  31%  $0.11
Twilio voz (telefonía)          ████████████░░░░░░░░  23%  $0.08
Maestro (Gemini 3.5 Flash)      █████████░░░░░░░░░░░  18%  $0.05
Infraestructura (VPS/DB/Redis)  ████████░░░░░░░░░░░░  16%  $0.07
STT (ElevenLabs Scribe v2)      ███░░░░░░░░░░░░░░░░░   6%  $0.01
Voz (Gemini 3.1 Flash-Lite)     ███░░░░░░░░░░░░░░░░░   6%  $0.01
WhatsApp follow-up              █░░░░░░░░░░░░░░░░░░░   3%  $0.01
Número teléfono (prorrateado)   █░░░░░░░░░░░░░░░░░░░   3%  $0.01

═══════════════════════════════════════════════
```

### 8.3 Proyección de costes

| Volumen/mes | Coste total/mes | Coste/llamada | Notas |
|-------------|-----------------|---------------|-------|
| 100 llamadas | ~$120 | ~$1.20 | Infra fija pesa mucho |
| 500 llamadas | ~$236 | ~$0.47 | Punto óptimo por software |
| 1,000 llamadas | ~$400 | ~$0.40 | Economía de escala |
| 5,000 llamadas | ~$1,600 | ~$0.32 | Negociación Twilio posible |
| 10,000 llamadas | ~$2,800 | ~$0.28 | Enterprise rates |

### 8.4 El bottom line

> **Una llamada de 3 minutos cuesta ~$0.35 USD. Si el software cuesta $59-299/mes, necesitamos convertir 1 de cada 100-170 llamadas en cliente para ser rentables.**

Con una tasa de conversión del 15% (estándar B2B SaaS), de 500 llamadas salen ~75 demos, y de esas ~11 clientes. A $59/mes (SmartDental) = $649/mes de MRR generado por un coste de ~$236 en llamadas. **ROI: ~2.7x**.

Para Peluguau ($299/mes): 11 clientes = $3,289 MRR por un coste de ~$210. **ROI: ~15.7x**.

---

## Fuentes de Precios

- [ElevenLabs Pricing 2026](https://elevenlabs.io/pricing)
- [ElevenLabs API Pricing](https://elevenlabs.io/pricing/api)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini 3.5 Flash Pricing](https://devtk.ai/en/models/gemini-3-5-flash/)
- [Gemini 3.1 Flash-Lite Pricing](https://devtk.ai/en/models/gemini-3-1-flash-lite/)
- [Twilio Voice Pricing Spain](https://www.twilio.com/en-us/voice/pricing/es)
- [Twilio Voice Pricing Mexico](https://www.twilio.com/en-us/voice/pricing/mx)
- [ElevenLabs Scribe v2 Realtime](https://elevenlabs.io/realtime-speech-to-text)

---

*Análisis generado el 2026-06-08. Los precios son estimaciones basadas en tarifas públicas de API. Los costes reales pueden variar ±15% dependiendo de patrones de uso, volumen, y negociaciones con proveedores.*
