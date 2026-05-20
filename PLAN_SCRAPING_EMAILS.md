# Plan: Scraping de Emails desde Webs de Leads
  Tab con todos los RECHAZADO / NO_RESPONDE de hace 30/60/90 días. MiniMax genera, para cada uno, un mensaje de reactivación con pretexto creativo  distinto ("te pensé porque lanzamos X", "vi que tu empresa contrató a Y", "hace tiempo no hablamos…"). Es minería de oro en datos ya muertos: leads
   pagados que están desperdiciados. Tipo cosechadora.
  2. Battle Arena de plantillas vs leads sintéticos ⚔️ 
  Coges 2 plantillas y MiniMax las testea contra 10 perfiles de lead simulados que tú defines (CEO escéptico, técnico curioso, marketing apurado,
  etc.). Devuelve % de éxito esperado por plantilla y por perfil. Es A/B testing sin gastar envíos reales — feedback inmediato antes de mandar nada a   humanos.

  3. Simulador "ensayo antes del directo" 🎭
  Antes de escribir al lead real, abres un sparring: MiniMax interpreta al lead específico (basado en su sector, cargo, hilo previo) y te deja
  practicar la conversación. Como un dojo. Útil para leads grandes donde no quieres improvisar.

  4. Whisper Mode (copiloto en vivo) 👂
  Mientras escribes en el composer, un panel lateral te susurra en tiempo real: "El lead ha mencionado precio dos veces y no respondiste", "lleva 4
  mensajes sin compromiso, hora de pedir llamada", "su tono ha bajado de entusiasmo desde el mensaje 3". No espera a que pidas opinión — coachea
  proactivamente.

  5. Storyboard del lead (visual journey) 🎬
  Vista tipo cinta cinematográfica con TODO lo que ha pasado con un lead: cuándo entró, qué webs visitó (tracking), qué emails recibió, qué
  WhatsApps, qué llamadas, qué cambios de estado. No tabla — pictograma horizontal navegable, tipo timeline de Notion o GitHub contributions. Te das
  cuenta de patrones que en lista no se ven.

  6. Mensajes hiperpersonalizados en masa 🪞 
  "Mandar a 100 leads pero NO la misma plantilla". Eliges los 100, pulsas, y MiniMax genera 100 mensajes únicos adaptados a cada uno (nombre + sector   + cargo + última interacción), te los muestra para revisar/editar antes de abrir los 100 wa.me. Es la antítesis del spam.

  7. Smart Snippets con "/" ⚡
  En el composer escribes /precio → inserta tu info de pricing. /calendario → link de Calendly. /caso → MiniMax elige y mete el caso de éxito que más   encaja con este lead. /voz=formal → reescribe el borrador en tono formal. Microsuperpoderes que aceleran muchísimo el día a día.

> **Objetivo:** Enriquecer los leads de los softwares Atleevo* (5,351 leads, 4,428 con web) con su email de contacto. Google Places no devuelve email, así que hay que extraerlo de la web del negocio.

---

## 1. Resumen Ejecutivo

| Aspecto | Decisión |
|---------|----------|
| **Stack** | `axios` + `cheerio` (ya instalados en `backend/src/services/scrapingService.ts`) |
| **Input** | `lead.metadata.websiteUri` de los ~4,428 leads que tienen web |
| **Output** | Rellenar `lead.email` + nota indicando la fuente |
| **Modo recomendado** | Easy mode: HTML estático + paths conocidos + decodificador Cloudflare |
| **Rendimiento esperado** | 50-65% de los leads con web → ~2,200-2,900 emails |
| **Tiempo de ejecución** | ~30 min con 10 workers concurrentes / ~2-3 h secuencial |
| **Coste** | Cero (no usa APIs de pago) |

---

## 2. Cómo funciona el scraping

### 2.1 Pipeline por lead

Para cada lead con `metadata.websiteUri`:

1. **Fetch HTML de la home**
   - `axios.get(url, { headers: { 'User-Agent': '...' }, timeout: 10s })`
   - Si responde HTML válido → continuar. Si 4xx/5xx/timeout → registrar fallo y pasar al siguiente.

2. **Extraer emails (pasada A)**
   - Buscar `a[href^="mailto:"]` con cheerio → email limpio sin necesidad de regex.
   - Aplicar regex `/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi` sobre `$('body').text()`.

3. **Filtrar falsos positivos**
   - Placeholders: `youremail@yourdomain.com`, `name@example.com`, `info@example.com`.
   - Emails de plugins/tooling: `hello@elementor.com`, `support@wix.com`, `matomo@matomo.org`.
   - Emails de dominio distinto al sitio (a menudo son de proveedores que aparecen en footers de plantillas) — opcional, depende de la política.

4. **Si no hay email, navegar a paths típicos (pasada B)**
   - `/contacto`, `/contact`, `/aviso-legal`, `/legal`, `/privacidad`, `/about`, `/sobre-nosotros`
   - En España la **LSSI** obliga a publicar email de contacto en aviso legal o página de contacto, así que estos paths son muy fiables.
   - Probar máximo 2-3 paths por lead para no disparar tiempo total.

5. **Decodificar Cloudflare Email Protection (pasada C)**
   - Si la web usa Cloudflare con "Email Address Obfuscation" activado, los emails están en `<a class="__cf_email__" data-cfemail="HEXSTRING">`.
   - Algoritmo público: el primer byte del hex es la "key", los demás son los chars del email XOR'd con la key.
   - Implementación: ~15 líneas de JS, sin dependencias.

6. **Normalizar emails ofuscados manualmente (pasada D)**
   - `info [arroba] empresa [punto] com` → `info@empresa.com`
   - `info (at) empresa (dot) com` → `info@empresa.com`
   - Regex de reemplazo simple antes de la pasada A.

7. **Guardar en BD**
   - Update `lead.email`.
   - Añadir línea a `lead.notas`: `Email extraído de {fuente: home|/contacto|cloudflare} el {fecha}`.
   - Si hay múltiples emails encontrados, priorizar por orden: `info@`, `contacto@`, `hola@`, `citas@`, `reservas@` > otros role-based > emails personales.

---

## 3. Capas de dificultad y cobertura

| Capa | Técnica | % de webs que cubre | Coste |
|------|---------|---------------------|-------|
| **A. Home con `mailto:` o email plano** | axios + cheerio + regex | 40-50% | Trivial |
| **B. Email en `/contacto` o aviso legal** | + 2-3 requests adicionales por lead | +20-30% | Bajo |
| **C. Cloudflare obfuscation** | + decodificador hex | +5-10% | Bajo (~15 LOC) |
| **D. Ofuscación manual `[at]` / `(arroba)`** | + regex de normalización | +2-5% | Trivial |
| **E. JS-rendered (Wix interactivo, React SPA sin SSR)** | Playwright / Puppeteer (browser real) | +5-10% | **Alto**: 10x más lento, +200MB de binario, más CPU/RAM |
| **F. Email solo en imagen** | OCR (Tesseract) | +1-3% | Muy alto, baja precisión |

**Recomendación:** implementar **A+B+C+D** (Easy mode). Captura ~60-70% del total con código simple. **E** solo si después de Easy mode el porcentaje es insuficiente para el objetivo de outreach. **F** no merece la pena.

---

## 4. Estimación de rendimiento real

Partiendo de 4,428 leads con web:

| Modo | Cobertura esperada | Emails extraídos |
|------|--------------------|------------------|
| **Easy (A+B+C+D)** | 50-65% | ~2,200-2,900 |
| **+ Playwright (A+B+C+D+E)** | 60-75% | ~2,700-3,300 |
| **+ OCR (todo)** | 62-78% | ~2,750-3,450 |

Por software (estimación con Easy mode):

| Software | Leads con web | Emails esperados (~55%) |
|----------|--------------:|------------------------:|
| atleevo | 1,221 | ~670 |
| atleevogym | 1,501 | ~825 |
| atleevoyoga | 1,068 | ~590 |
| atleevobox | 638 | ~350 |
| **TOTAL** | **4,428** | **~2,435** |

---

## 5. Buenas prácticas y consideraciones legales

### 5.1 Técnicas

- **Rate limiting**: 1-2 segundos entre requests al **mismo dominio**, pero múltiples dominios en paralelo. Pool de 10 workers concurrentes es razonable.
- **Timeout corto**: 10s por request. Webs lentas no merecen bloquear el pipeline.
- **User-Agent real**: navegador moderno, no `axios/1.0`. Algunas webs bloquean UAs no-browser.
- **Retry policy**: 1 reintento por timeout/5xx. No reintentar 4xx (es definitivo).
- **`robots.txt`**: opcional pero recomendable. Si el sitio prohíbe `/contacto`, respetar. Implementación: paquete `robots-parser`.
- **Idempotencia**: skip leads que ya tengan `lead.email` rellenado.

### 5.2 Legales (España / UE)

- **LSSI-CE**: las webs comerciales españolas están **obligadas** a publicar email de contacto. Extraerlo de la página de aviso legal es uso normal de información pública.
- **GDPR**: emails B2B genéricos (`info@`, `contacto@`, `hola@`, `reservas@`) están protegidos por **interés legítimo** para B2B outreach siempre que:
  - El receptor pueda darse de baja fácilmente.
  - El mensaje sea relevante a su negocio.
  - No haya manifestado oposición previa.
- **Emails personales** (`juan.perez@empresa.es`): zona gris. Recomendable **filtrar a solo role-based** para outreach masivo. Guardar personales pero no usarlos en campañas hasta tener consent.
- **No vulnerar medidas técnicas anti-scraping**: si una web devuelve `403 Forbidden` con UA de browser, no insistir con técnicas más agresivas.

---

## 6. Implementación propuesta

### 6.1 Estructura

```
backend/scripts/
  scrape-lead-emails.ts          # Script principal CLI
backend/src/services/
  emailScrapingService.ts        # Lógica reutilizable de scraping de un dominio
  cloudflareEmailDecoder.ts      # Decodificador de Cloudflare Email Protection
```

### 6.2 CLI propuesto

```bash
npx tsx scripts/scrape-lead-emails.ts \
  --software=atleevo \
  --limit=50 \
  --concurrency=10 \
  --dry-run
```

Flags:
- `--software=ID` (opt) filtrar por softwareId. Sin flag → todos los Atleevo*.
- `--limit=N` (opt) máximo N leads a procesar. Útil para tests.
- `--concurrency=N` (opt, default 10) workers paralelos.
- `--dry-run` (opt) no escribe en BD, solo imprime lo que encontraría.
- `--include-personal` (opt) incluir emails personales además de role-based.
- `--retry-failed` (opt) reintentar solo leads marcados previamente como fallidos.

### 6.3 Estado de cada lead tras el scraping

Añadir a `lead.metadata`:

```json
{
  "emailScraping": {
    "intentado": true,
    "fechaIntento": "2026-05-19T20:00:00.000Z",
    "estado": "ok | sin_email | fetch_failed | bloqueado",
    "fuente": "home | /contacto | cloudflare | mailto",
    "todosLosEmails": ["info@x.com", "reservas@x.com"],
    "emailElegido": "info@x.com"
  }
}
```

Esto permite:
- Saber qué leads ya se intentaron sin tener que re-scrapear.
- Auditoría de fuentes.
- Re-elegir email si más adelante se cambia la política (ej. priorizar `reservas@` para gimnasios de boxeo).

### 6.4 Filtros anti-falso-positivo

Lista negra de dominios de email:
```
yourdomain.com, example.com, example.org, domain.com,
elementor.com, wix.com, wordpress.com, godaddy.com,
sentry.io, matomo.org, mailerlite.com, mailchimp.com
```

Lista negra de local-parts:
```
youremail, your_email, your-email, yourname, example, test, demo,
noreply, no-reply, donotreply
```

Validación de dominio coincidente (opcional):
- Si el email es `info@empresa.com` y la web es `empresa.com` → fiable.
- Si el email es `info@otroservicio.com` y la web es `empresa.com` → sospechoso, marcar para revisión manual o filtrar.

---

## 7. Roadmap de ejecución

### Fase 1: validación (dry-run sobre 50 leads)
- Implementar Easy mode (A+B+C+D).
- Lanzar contra 50 leads aleatorios de cada software (200 total) con `--dry-run`.
- Revisar manualmente la calidad: % éxito, falsos positivos, emails sospechosos.
- Ajustar listas negras y prioridades.

### Fase 2: import completo
- Lanzar contra los 4,428 leads con web.
- Monitorizar con logs por dominio.
- Tiempo estimado: 30-60 min con concurrencia=10.

### Fase 3: análisis post-mortem
- Qué % de éxito real vs. estimado.
- Qué dominios bloquearon o fallaron.
- Decidir si vale la pena Fase 4.

### Fase 4 (opcional): Playwright para JS-rendered
- Solo si Fase 2 deja >1,000 leads sin email y son negocios atractivos.
- Mucho más lento; usar con concurrencia=3.

---

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Webs bloquean por User-Agent / IP | Media | UA realista, rate limit por dominio, no insistir tras 403 |
| Falsos positivos en BD (emails incorrectos) | Media | Validación de dominio coincidente + listas negras |
| Cloudflare hace shadow-ban a la IP | Baja | Concurrencia limitada, sin retries agresivos |
| Tiempo de ejecución se dispara | Baja | Timeout corto (10s) + early-exit cuando se encuentra email |
| Email scrapeado ya no funciona | Media | Aceptable: el cliente puede tener varios emails, el outreach lo validará |

---

## 9. Decisiones pendientes

Antes de implementar, conviene decidir:

1. **¿Incluir emails personales o solo role-based?** Recomendado: solo role-based para outreach inicial.
2. **¿Validar dominio coincidente?** Recomendado: sí, descartar emails de dominio ajeno al sitio.
3. **¿Respetar robots.txt?** Recomendado: sí, sumar paquete `robots-parser`.
4. **¿Reintentar failed después de N días?** Recomendado: sí, programar un cron mensual para reintentar `fetch_failed`.
5. **¿Aplicar también a leads existentes de PeluGuau / otros SaaS?** Decidir si el alcance es solo Atleevo* o universal.
