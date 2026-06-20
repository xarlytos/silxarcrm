# Nuevas secciones para captar clientes

> Propuestas de módulos nuevos para el CRM. Ninguno es humo: todo se apoya en lo que el software **ya hace** (genera contenido con IA, publica en redes, llama, manda WhatsApp/email, scrapea leads, mide el embudo). Aquí solo conectamos las piezas que ya tenemos para que entren más leads y se cierren más rápido.
>
> Orden = por relación esfuerzo/retorno. Lo de arriba es lo que yo construiría primero.

---

## 🥇 Prioridad alta (poco código, mucho lead)

### 1. Cazador de leads automático ("Radar")
**Qué es:** un job que cada día sale a buscar negocios que encajan con el perfil de cliente ideal y los mete en el CRM ya enriquecidos.

**Por qué ahora:** ya tenemos scraping (Páginas Amarillas, Google Maps) y monitorización de marketplaces. Solo falta automatizarlo y darle criterio.

- Defines un ICP (sector, zona, tamaño, "tiene web sí/no", "tiene reseñas pero responde mal")
- El Radar corre solo cada noche y trae N leads nuevos puntuados
- Detecta señales de compra: acaban de abrir, contratan personal, tienen reseñas malas, web caída
- Cae directo en el Kanban en estado NUEVO con tags automáticos
- Botón "lanzar secuencia" → activa el outreach que ya existe (llamada IA + WhatsApp + email)

**Reutiliza:** scraping, `marketplaceMonitorService`, scoring de leads, jobs/cron.

---

### 2. Auditoría gratis como lead magnet ("¿Cómo está tu negocio?")
**Qué es:** una landing donde el prospecto mete su web/Instagram/ficha de Google y recibe un informe automático de qué está haciendo mal. A cambio: su email y teléfono.

**Por qué funciona:** das valor real antes de pedir nada. Es el mejor anzuelo que existe para negocios locales.

- El visitante pega su URL o nombre del negocio
- La IA genera un mini-informe: SEO local, reseñas, presencia en redes, web, velocidad
- Informe entregable al instante (gratis) + versión completa "te la cuento en una llamada"
- Cada auditoría = un lead caliente que ya sabe que tiene un problema
- Se enchufa a la secuencia de activación automática

**Reutiliza:** landings con slug, lead magnets, `contentGenerator`, activación inbound.

---

### 3. Reactivación de base muerta ("Resurrección masiva")
**Qué es:** ya existe el "Cementerio" de leads inactivos con generación IA de resurrección. Falta convertirlo en una campaña de un click.

- Seleccionas todo el cementerio (o por filtro: "no contactados en 90 días")
- La IA genera un mensaje de reactivación personalizado por lead
- Se lanza en cola escalonada por WhatsApp + email
- Mide cuántos muertos vuelven a la vida (tasa de resurrección)

**Reutiliza:** Cementerio, A/B testing, envíos programados, plantillas IA. **Esto es casi gratis de hacer y la base ya está pagada.**

---

## 🥈 Prioridad media (más músculo, escala)

### 4. Multi-cliente / Modo Agencia ("Marcas")
**Qué es:** poder gestionar varios negocios desde la misma cuenta. Cada uno con sus leads, su contenido, sus redes, sus métricas.

**Por qué:** abre la puerta a venderle el software a **agencias** (que pagan más y no se van) y no solo a negocios sueltos. Es el salto de "herramienta" a "plataforma".

- Entidad `Marca` que agrupa leads, contenido, redes y campañas
- Selector de marca arriba (como cambiar de workspace)
- Tokens de redes por marca
- Métricas separadas por marca

**Reutiliza:** casi todo el modelo de datos, solo añadiendo un `marcaId`. Está descrito en `PLAN-CENTRO-SOCIAL-MEDIA.md`.

---

### 5. Portal del cliente ("Sala de cristal")
**Qué es:** un dashboard público (con token, sin login) donde el cliente final ve qué estás haciendo por él: contenido publicado, leads generados, próximas acciones.

**Por qué capta:** la transparencia vende y retiene. Y cada portal es una vitrina que el cliente enseña a otros → referidos orgánicos.

- URL única por cliente (como las propuestas públicas que ya existen)
- Ve métricas, calendario de contenido y aprueba/rechaza con un click
- Notificaciones cuando hay algo que aprobar

**Reutiliza:** propuestas públicas con token, calendario editorial, métricas de growth.

---

### 6. Caso de éxito automático ("Prueba social en piloto automático")
**Qué es:** cuando un cliente convierte o llega a un hito, el sistema genera solo un caso de éxito publicable.

- Detecta el hito (cliente convertido, X leads cerrados, X meses)
- Genera el case study con la IA (ya existe `contentGenerator` para esto)
- Lo deja listo para publicar en redes/SEO con un click
- Alimenta la herramienta de "casos de éxito" que la IA de llamadas ya usa para vender

**Reutiliza:** `contentGenerator`, `socialPublisher`, tools de la llamada IA. **Tu mejor vendedor son tus clientes contentos; esto los pone a trabajar solos.**

---

## 🥉 Prioridad baja (cuando lo anterior funcione)

### 7. Espía de competencia ("Radar competidor")
- Monitoriza qué publican y cómo crecen los competidores de tu nicho
- Te avisa de huecos de contenido y oportunidades
- Genera respuestas/contenido para atacar esos huecos
- Reutiliza: scraping, `contentGenerator`, jobs.

### 8. Reciclaje de contenido evergreen
- El contenido que funcionó se reprograma solo cada X meses con variantes
- A/B de hooks, CTAs y hashtags automático
- Reutiliza: biblioteca de contenido, calendario editorial, A/B testing.

### 9. Embudo visual con atribución
- De dónde viene cada lead → qué tocó → cuándo cerró
- ROI por canal y por campaña, no solo números sueltos
- Reutiliza: `growthMetricsService`, eventos del dashboard.

---

## Resumen en una tabla

| # | Sección | Esfuerzo | Capta porque... | Ya tenemos |
|---|---------|----------|-----------------|------------|
| 1 | Radar de leads | Bajo | Trae prospectos solo, cada día | Scraping, marketplaces, scoring |
| 2 | Auditoría gratis | Bajo-medio | Da valor antes de pedir nada | Landings, lead magnets, IA |
| 3 | Resurrección masiva | Muy bajo | Reactiva base ya pagada | Cementerio, A/B, colas |
| 4 | Modo Agencia | Medio | Abre venta a agencias (pagan más) | Modelo de datos |
| 5 | Portal del cliente | Medio | Transparencia = retención + referidos | Propuestas públicas |
| 6 | Caso de éxito auto | Bajo-medio | Prueba social en automático | contentGenerator, publisher |
| 7 | Radar competidor | Medio | Detecta huecos de mercado | Scraping, IA |
| 8 | Reciclaje evergreen | Bajo | Exprime lo que ya funcionó | Biblioteca, A/B |
| 9 | Embudo con atribución | Medio | Sabes qué euro trae qué cliente | Métricas, eventos |

---

## Lo que yo haría

Empezaría por **3 → 1 → 2**. La resurrección es casi gratis y trae dinero esta semana. El Radar llena el embudo solo. La auditoría convierte tráfico frío en leads calientes. Con esos tres ya tienes una máquina de captación funcionando antes de tocar el modo agencia.

> Todo esto sale del software actual. No hay que reinventar nada, solo conectar tuberías que ya están puestas. — peluguau.com
