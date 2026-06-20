# Agente de Ventas por Telefono con Gemini 3.5 Flash
## Analisis Completo: Viabilidad, Precios y Arquitectura

**Fecha:** 2026-05-28

---

## 1. Resumen Ejecutivo

**Si es posible** construir un agente de ventas telefonico que suene humano usando Gemini 3.5 Flash, pero **no es la opcion mas barata ni la mas sencilla** para empezar. La API Live de Gemini permite audio en tiempo real nativo (no STT -> LLM -> TTS), con latencia competitiva y precios muy bajos (~$0.023/minuto solo de IA). Sin embargo, requiere desarrollo tecnico propio.

**Recomendacion rapida:**
- Si tienes equipo tecnico o eres desarrollador: **Construir con Gemini 3.5 Flash Live API + Twilio**
- Si quieres empezar rapido sin codigo: **Usar Retell AI ($0.07/min) o Brilo.ai ($149/mes)**
- Si buscas algo intermedio: **Vapi.ai ($0.05-0.25/min)**

---

## 2. Gemini 3.5 Flash: Capacidades para Voz

### Especificaciones Tecnicas

| Caracteristica | Detalle |
|---------------|---------|
| **ID del modelo** | `gemini-3.5-flash` |
| **Ventana de contexto** | 1 millon de tokens |
| **Maximo de salida** | 65,000 tokens |
| **Disponibilidad** | General (estable para produccion) |
| **Fecha de lanzamiento** | 19 de mayo de 2026 (Google I/O) |

### Capacidades Clave para Agente de Ventas

1. **Generacion de voz (TTS nativo)** - El modelo puede generar audio directamente, no solo texto
2. **Comprension de audio (ASR nativo)** - Entiende voz sin necesidad de servicios externos
3. **API Live con WebSockets** - Streaming en tiempo real para conversaciones bidireccionales
4. **Niveles de pensamiento configurables**:
   - `minimal` - Optimizado para velocidad (mejor para llamadas)
   - `low` - Tareas de agentes con baja latencia (recomendado para ventas)
   - `medium` - Balance calidad/velocidad
   - `high` - Razonamiento complejo (demasiado lento para llamadas)
5. **Conservacion del pensamiento** - Mantiene razonamiento entre turnos de conversacion
6. **Interrupciones en tiempo real** - El prospecto puede cortar al agente y responde al instante

### Limitaciones Importantes

- **NO soporta "Uso de equipo" (computer use)** - No puede interactuar con aplicaciones de escritorio
- Latencia con `thinking_level: low` es de **300-500ms** end-to-end
- Mas caro que Gemini 3 Flash Preview (3x aumento de precio)

---

## 3. Precios de la API de Gemini (Mayo 2026)

### Gemini 3.5 Flash (API estandar)

| Tipo | Precio |
|------|--------|
| **Input** | $1.50 / 1M tokens |
| **Output** | $9.00 / 1M tokens |
| **Input cacheado** | $0.15 / 1M tokens (90% ahorro) |
| **Batch API** | $0.75 / 1M tokens (50% descuento) |

### Gemini 3.1 Flash Live API (Para voz en tiempo real)

| Tipo de entrada | Precio por token | Precio por minuto |
|----------------|-----------------|-------------------|
| **Audio input** | $3.00 / 1M tokens | ~$0.005 / min |
| **Audio output** | $12.00 / 1M tokens | ~$0.018 / min |
| **Texto input** | $0.75 / 1M tokens | - |
| **Texto output** | $4.50 / 1M tokens | - |

**Costo tipico de una llamada de voz:** ~**$0.023/minuto** (solo IA)

### Comparativa: Costo por Minuto de IA

| Proveedor | Costo/min IA |
|-----------|-------------|
| **Gemini 3.1 Flash Live** | ~$0.023 |
| **OpenAI GPT-Realtime-2** | ~$0.23 |
| **ElevenLabs Conversational** | $0.15 - $0.30 |

**Gemini es ~10x mas barato que OpenAI** para voz en tiempo real.

---

## 4. Infraestructura Telefonica: Precios

### Twilio (Opcion mas popular)

| Servicio | Precio |
|----------|--------|
| **Llamadas salientes (EE.UU.)** | $0.013 - $0.014 / min |
| **Llamadas entrantes** | $0.0085 / min |
| **Numero telefonico local (EE.UU.)** | ~$1.15 / mes |
| **Grabacion de llamadas** | $0.0025 / min |
| **Transcripcion** | $0.05 / min |
| **Deteccion de contestador** | $0.0075 / llamada |

### Otros Proveedores de Telefonia

| Proveedor | Precio/min llamada |
|-----------|-------------------|
| **Vonage** | Similar a Twilio |
| **MessageBird** | $0.005 - $0.015 / min |
| **Plivo** | $0.01 / min (EE.UU.) |

---

## 5. Opciones para Construir tu Agente

### Opcion A: Construir con Gemini Live API + Twilio (DIY)

**Arquitectura:**
```
Telefono del prospecto <-> Twilio <-> Tu servidor (WebSocket)
                                      |
                                 Gemini Live API
                                      |
                               Tu logica de ventas
```

**Costo estimado por minuto de llamada:**
- Twilio (llamada): $0.014
- Gemini Live API: $0.023
- **Total: ~$0.037 / min**

**Pros:**
- Costo mas bajo a largo plazo
- Control total del flujo de ventas
- Puedes entrenar el modelo con tu script exacto
- Escalable indefinidamente

**Contras:**
- Requiere desarrollo tecnico (Node.js/Python + WebSockets)
- Tiempo de desarrollo: 2-4 semanas
- Debes mantener el servidor
- Configuracion de telefonia (numeros, compliance, DNC)

**Stack tecnico recomendado:**
- Backend: Node.js con `ws` (WebSocket)
- Telefonia: Twilio Programmable Voice
- IA: Gemini 3.1 Flash Live API (`gemini-3.1-flash-live-preview`)
- Opcional: Redis para estado de conversaciones

---

### Opcion B: Plataformas No-Code (Sin desarrollo)

| Plataforma | Precio | Latencia | Ideal para |
|------------|--------|----------|------------|
| **Retell AI** | $0.07/min | Sub-400ms | Mejor calidad/precio, trae tu LLM |
| **Brilo.ai** | $149/mes (600 min) | No especificada | Setup en 7 min, 45+ idiomas |
| **Bland AI** | $0.14/min | 800-2000ms | Alto volumen, cold outreach |
| **Synthflow** | $99-$499/mes | Sub-500ms | No-code, plantillas predefinidas |
| **Vapi.ai** | $0.05-$0.25/min | Variable | Maxima flexibilidad tecnica |
| **Tough Tongue AI** | Suscripcion SaaS | Variable | Entrenamiento de reps humanos |

**Costo total estimado con estas plataformas:** $0.07 - $0.30 / min (incluyen telefonia + IA)

---

### Opcion C: Soluciones Enterprise (SDR completo)

| Plataforma | Precio | Caracteristicas |
|------------|--------|----------------|
| **11x.ai** | ~$5,000/mes | SDR multicanal (tel + email + LinkedIn) |
| **Air AI** | $0.11/min + $25K-$100K licencia | Conversaciones 5-30 min, manejo de objeciones |
| **Orum** | $150+/usuario/mes | Parallel dialing, maximiza conversaciones |

---

## 6. Calculadora de Costos

### Escenario: 500 llamadas/mes, 5 min promedio = 2,500 min/mes

| Opcion | Costo IA/Telefonia | Costo plataforma | Total/mes |
|--------|-------------------|------------------|-----------|
| **DIY (Gemini + Twilio)** | $0.037 x 2,500 = $92.50 | $0 (desarrollo propio) | **~$93/mes** |
| **Retell AI** | Incluido | $0.07 x 2,500 = $175 | **~$175/mes** |
| **Brilo.ai** | Incluido | $149/mes (600 min) + extra | **~$300/mes** |
| **Bland AI** | Incluido | $0.14 x 2,500 = $350 | **~$350/mes** |
| **11x.ai** | Incluido | Plan enterprise | **~$5,000/mes** |

### Escenario: 5,000 llamadas/mes, 5 min = 25,000 min/mes

| Opcion | Total/mes |
|--------|-----------|
| **DIY (Gemini + Twilio)** | **~$925/mes** |
| **Retell AI** | **~$1,750/mes** |
| **Bland AI** | **~$3,500/mes** |

---

## 7. Aspectos Legales y Compliance (2026)

### Estados Unidos - B2B (Ventas a empresas)
- **Permitido** con scrubbing de DNC (Do Not Call)
- Se requiere consentimiento adecuado
- No es obligatorio revelar que es IA (en B2B), pero es etico hacerlo

### Estados Unidos - B2C (Ventas a consumidores)
- Requiere **consentimiento escrito explicito** bajo la FTC Telemarketing Sales Rule
- **Obligatorio revelar** que es una llamada automatizada al inicio

### Europa
- GDPR: Se requiere base legal
- **EU AI Act**: Obligatorio revelar que el interlocutor es IA
- Penalizaciones severas por incumplimiento

### Mexico y Latinoamerica
- PROFECO: Se requiere identificacion del llamador
- Registro REUS: El receptor debe estar inscrito o haber dado consentimiento
- Recomendacion: Consultar abogado local especializado en proteccion al consumidor

---

## 8. Guia de Implementacion (DIY con Gemini)

### Paso 1: Configurar Gemini Live API
```javascript
// Conexion WebSocket a Gemini Live
const ws = new WebSocket(
  'wss://generativelanguage.googleapis.com/v1beta/models/' +
  'gemini-3.1-flash-live-preview:connect?key=API_KEY',
  ['gemini-protocol']
);
```

### Paso 2: Configurar Twilio
- Crear cuenta en Twilio
- Comprar numero telefonico (~$1.15/mes)
- Configurar webhook para llamadas entrantes/salientes
- Usar Twilio Media Streams para audio en tiempo real

### Paso 3: Script de Ventas (System Prompt)
```
Eres Alex, representante de ventas de [Tu Empresa].
Tu trabajo es llamar a prospectos que descargaron una prueba de nuestro
software y ofrecerles una demostracion personalizada.

Reglas:
- Se amable, profesional y conversacional
- No suenes como un robot: usa muletillas naturales ("mmm", "claro", "entiendo")
- Adapta tu tono segun la respuesta del prospecto
- Si dice "no estoy interesado", pregunta por que educadamente
- Si acepta una demo, programa fecha y hora
- Nunca seas agresivo ni insistente
```

### Paso 4: Tools/Funciones
Configurar function calling para:
- `consultar_crm(telefono)` - Obtener historial del prospecto
- `agendar_demo(telefono, fecha, hora)` - Guardar cita en calendario
- `enviar_email(telefono, tipo)` - Enviar follow-up
- `transferir_humano(telefono, razon)` - Escalar a agente humano

---

## 9. Recomendacion Final

### Para empezar rapido (sin codigo)
**Retell AI** es la mejor opcion:
- $0.07/minuto (todo incluido)
- Latencia sub-400ms (suena humano)
- Puedes conectar Gemini como tu LLM personalizado
- Setup en horas, no semanas

### Para maximo control y minimo costo (con desarrollo)
**Gemini 3.1 Flash Live + Twilio**:
- $0.037/minuto total
- 10x mas barato que OpenAI
- Control total de la experiencia
- Requiere 2-4 semanas de desarrollo

### Para escalar a equipo de ventas completo
**11x.ai o Air AI**:
- SDR completo (email + LinkedIn + llamadas)
- Manejo sofisticado de objeciones
- $5,000+/mes pero reemplaza 2-3 SDRs humanos

---

## 10. Proximos Pasos Sugeridos

1. **Probar gratis:** Usar Gemini 3.1 Flash Live Preview en Google AI Studio (gratis con limites)
2. **POC rapido:** Crear un script de ventas y probarlo con entrada de voz
3. **Validar con 10 llamadas reales:** Usar Twilio + Gemini manualmente
4. **Decidir:** Si funciona, construir la integracion completa o usar plataforma no-code

---

## Fuentes

- [Gemini 3.5 Flash - Documentacion Oficial](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5?hl=es-419)
- [Gemini 3.5 Flash API Pricing - DevTK](https://devtk.ai/en/models/gemini-3-5-flash/)
- [Gemini Live API Pricing - TokenMix](https://tokenmix.ai/blog/gemini-3-5-pro-release-date-google-io-2026)
- [Gemini 3.1 Flash Live API Guide - Laozhang](https://blog.laozhang.ai/en/posts/gemini-3-1-flash-live-api)
- [Twilio Voice Pricing US Outbound](https://edesy.in/tools/twilio-voice-pricing-us-outbound)
- [Twilio Pricing Guide 2026](https://www.getaiperks.com/en/articles/twilio-pricing)
- [Best Voice AI for Sales Calls - Brilo AI](https://www.brilo.ai/resources/best-voice-ai-for-outbound-sales-calls)
- [Vapi vs Retell AI vs Tough Tongue AI](https://www.autointerviewai.com/blog/vapi-vs-retell-ai-vs-tough-tongue-ai-comparison-2026)
- [AI Sales Call Software 2026](https://agenticsalescall.com/11x-review/)
