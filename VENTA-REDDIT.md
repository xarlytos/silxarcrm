# CRM Maestro — El Sistema que te Quita el Trabajo Sucio de Encima

> *Hecho en peluguau.com. Probado en producción. Sin PowerPoint, sin promesas de gurú.*

---

## TL;DR

¿Vendes un SaaS? ¿Llamas a leads? ¿Mandas emails? ¿Gestionas clientes?

Este CRM no es un Notion con maquillaje. Es un **sistema operativo de ventas** con IA de verdad, llamadas automáticas, WhatsApp, email masivo, scraping de leads, y un dashboard donde ves todo el dinero que entra y el que se va.

**Stack real:** Next.js 14 + Express + PostgreSQL + Prisma + Python FastAPI + Gemini Live + Twilio + Redis. Nada de no-code que se rompe a los 3 meses.

---

## Lo que hay dentro

### 1. Dashboard — Tu Sala de Control

Abres y ves:

- **MRR/ARR en tiempo real** — lo que facturas este mes vs el anterior
- **Churn rate** — quién se va y por qué
- **Trials activos** — cuántos prueban tu producto ahora mismo
- **Gráficas de evolución** — no números muertos, tendencias
- **Pagos recientes** — feed de eventos en vivo

No es un Excel pintado. Son KPIs que se actualizan solos desde webhooks de tus SaaS clientes.

---

### 2. Leads — De "no tengo a quién vender" a "tengo demasiados"

- **Tabla + Kanban** con filtros avanzados (estado, prioridad, origen, tags, sector)
- **Importar CSV** masivo — arrastras y listo
- **Scraping integrado** — busca leads en Páginas Amarillas y Google Maps directo desde la UI
- **Historial completo** por lead: notas, llamadas, emails, WhatsApps, cambios de estado
- **Etiquetado** con colores
- **Conversión a cliente** en un click

8 estados de lead: NUEVO → CONTACTADO → INTERESADO → EN_SEGUIMIENTO → CALIFICADO → CONVERTIDO. Y si te rechazan, también.

---

### 3. Centro de Llamadas — Humano + AI

#### Llamadas Humanas (Zadarma)
- Click-to-call desde cualquier lead
- Grabaciones automáticas
- Notas post-llamada
- Calificación 1-5 estrellas

#### Llamadas con IA (Gemini Live + Twilio)
Esto no es un chatbot de texto. Es **una voz real que llama a tu lead** y mantiene una conversación natural.

- **Mariana** (el avatar) tiene acento neutro, pausas naturales, muletillas, se ríe. Suena humana.
- **7 tools** que usa en tiempo real: consulta CRM, busca casos de éxito, calcula ROI, compara con competidores, agenda demos en Cal.com, envía WhatsApp de seguimiento, transfiere a humano.
- **State engine** de 7 etapas: saludo → discovery → problema → solución → calificado → cierre → salida. No es lineal, salta donde debe.
- **RAG semántico** con embeddings: sabe de tu negocio, no suelta genéricos.
- **Latencia: 565-635ms** por turno. El lead no nota que es IA.
- **Costo: ~$0.03-0.05 por llamada.** Sí, centavos.
- **Compliance México:** horario 9-20, opt-out, disclose AI. No te metes en problemas.
- **Transcripción completa** guardada en PostgreSQL. Sabes exactamente qué pasó.

#### Simulador de Llamadas
- **Práctica con IA** por texto (sin costo)
- **Simulación con audio real** vía WebSocket — escuchas cómo suena antes de llamar a un lead de verdad
- **Feedback automático** con puntuación y puntos a mejorar

---

### 4. WhatsApp — Tu Ejército de Outreach

- **Plantillas** con variables `{{nombre}}`, `{{empresa}}`. CRUD completo.
- **Generación IA** de plantillas — le dices el tono y te la escribe.
- **A/B Tests** — compara dos plantillas con métricas reales (envíos, respuestas, conversiones).
- **Conversaciones** — chat tipo WhatsApp Web con cada lead, historial completo.
- **Cementerio** — leads inactivos. La IA genera mensajes de "resurrección".
- **Arena** — tus plantillas compiten contra perfiles sintéticos. Gana la que mejor funcione.
- **Sparring** — entrenamiento: la IA responde como si fuera un lead difícil.
- **Snippets** — comandos rápidos tipo `/formal`, `/urgente`, `/seguimiento`.
- **Envíos programados** — cola automática que procesa cada minuto.
- **WhatsApp Web.js** — automatización real vía QR (no APIs de Meta, no bloqueos).
- **Chatbot** con reglas automáticas.

---

### 5. Email — Campañas que No Parecen Spam

- **Cuentas** de Resend / Mailersend con tracking de cuotas
- **Senders** verificados (from addresses)
- **Plantillas** HTML con variables
- **Campañas masivas** con:
  - Preview de audiencia antes de enviar
  - A/B testing automático (variante A vs B, split 50/50)
  - Programación para fecha futura
  - Tracking completo: delivered, opened, clicked, bounced, unsubscribed
- **Worker async** que procesa en batches — no petas la API
- **Webhooks de Resend** — métricas en tiempo real
- **Unsubscribe** automático con tokens únicos

---

### 6. Calendario — Organización sin Dolor

- Vista mensual/semanal
- Eventos asignados a Carlos, Silviu, o ambos
- Colores, completados, descripción
- Stats: eventos hoy, pendientes por persona, completados este mes

---

### 7. Propuestas Comerciales — Cierra sin Friction

- Crea propuestas con items (servicio × cantidad × precio)
- Cálculo automático: subtotal + IVA 21% = total
- Estado: BORRADOR → ENVIADA → VISTA → ACEPTADA / RECHAZADA
- **URL pública única** con token — el lead acepta/rechaza sin login
- Duplicar propuestas existentes
- Tracking de cuándo fue vista, aceptada, rechazada

---

### 8. Growth Engine — El Motor que Crece Solo

Contenido, SEO, referidos, marketplaces, activación automática. Todo en uno.

- **Generador de contenido IA**: posts para redes, artículos SEO, FAQs, case studies, scripts de video
- **Calendario editorial** — programa publicaciones
- **SEO**: landing pages programáticas, keywords, meta tags, schema markup
- **Blog público** integrado — contenido SEO que rankea
- **Referidos**: links únicos, stats, leaderboard, recompensas automáticas
- **Marketplaces**: detecta oportunidades en Fiverr, Upwork, etc.
- **Activación automática**: lead inbound → secuencia de email + WhatsApp + free value
- **Video**: scripts + voz con ElevenLabs

---

### 9. IA Chat — Tu Copilot con Acceso a Todo

Chat con IA que:
- Responde preguntas sobre tus datos de negocio
- Genera SQL, lo ejecuta, te da la respuesta
- Propone acciones (crear lead, enviar email, agendar evento) — tú confirmas antes de ejecutar
- Genera plantillas de email al vuelo
- Streaming de tokens en tiempo real

No es un chatbot tonto. Tiene **function calling** real sobre tu base de datos.

---

### 10. Landing Pages + Free Values

- **Landings**: páginas de captura con slug propio (ej: `peluguau.com/veterinaria-madrid`). Tracking de visitas y conversiones.
- **Free Values**: lead magnets (ebooks, checklists, templates) que generan leads automáticamente.

---

### 11. Gamificación RPG — Porque Vender También es Divertido

Misiones, talentos, cofres, slot machine, tarot. Sí, en serio. Tu equipo de ventas sube de nivel mientras cierra deals.

---

### 12. El Extra que No Esperabas

- **Dark mode** completo con CSS variables semánticas
- **Command Palette** (Ctrl+K) con fuzzy search
- **WebSocket tiempo real** — ves cambios sin recargar
- **Notificaciones push** vía Firebase Cloud Messaging
- **Multi-tenant** — gestionas varios SaaS desde un solo dashboard
- **Roles**: admin, editor, viewer
- **Rate limiting** y JWT seguro

---

## Arquitectura Real (para los técnicos)

```
Frontend (Next.js 14, App Router, TypeScript, Tailwind)
    ↓ HTTP / WebSocket
Backend (Express, TypeScript, Prisma, PostgreSQL, Socket.IO)
    ↓ Webhooks
Agente de Voz (Python, FastAPI, Gemini Live, Twilio, ElevenLabs)
```

- **30+ modelos Prisma** organizados en dominios
- **20+ routers API** REST
- **20+ servicios** de negocio
- **28 tests** en el agente de voz, todos pasan
- **Redis** para cache, colas, rate limiting
- **Docker** listo para deploy

---

## ¿Para quién es esto?

- Tienes un SaaS y vendes B2B
- Haces outreach activo (llamadas, WhatsApp, email)
- Tu proceso de ventas es repetible y quieres automatizarlo
- Quieres ver números reales, no suposiciones
- Te cansaste de cobrar en Excel y perder leads en el olvido

---

## ¿Para quién NO es?

- Quieres una app de móvil para vender zapatillas
- Tu negocio es "voy a empezar a emprender"
- Esperas que la IA te haga millonario durmiendo
- No entiendes qué es un webhook y no quieres aprender

---

## Precio

No es un SaaS que te vendo por $97/mes. Esto es **código fuente completo** que despliegas donde quieras.

- Frontend Next.js
- Backend Express completo
- Agente de voz Python
- Esquema Prisma
- Scripts de scraping y utilidades
- Documentación completa

**Inversión única.** Te ahorras 6-12 meses de desarrollo. El equipo que lo construyó lleva +2 años iterando.

Interesados: DM o comenta. No respondo "¿y cuánto cuesta?" — ya lo dije arriba.

---

## Preguntas que seguro me harás

**¿Es no-code?** No. Es código. Tú o tu dev lo despliegan. Si no tienes dev, esto no es para ti.

**¿Funciona fuera de México?** Sí. El compliance de México está incluido pero se adapta.

**¿Puedo cambiar la voz de la IA?** Sí. Gemini Live soporta múltiples voces. ElevenLabs también.

**¿Cuánto cuesta mantenerlo?** Depende de tu volumen. Twilio + Gemini Live son centavos por llamada. PostgreSQL en Railway/Render ~$7-15/mes. Frontend en Vercel ~$0-20/mes.

**¿Por qué lo vendes si funciona?** Porque ya nos pagó lo que tenía que pagarnos. Ahora queremos que otros lo usen en lugar de reinventar la rueda.

---

> **peluguau.com** — Hecho con odio a las reuniones de status y amor a los números verdes.
