# Amazon KDP — Línea de Negocio: Generación de Libros

> Investigación de repositorios open source para automatizar la creación, diseño y publicación de libros en Amazon KDP (Kindle Direct Publishing).
>
> **Fecha:** 2026-06-10 | **Proyecto:** peluguau.com / Groomly ecosystem

---

## Tabla de Contenidos

1. [Visión General del Negocio KDP](#1-visión-general-del-negocio-kdp)
2. [Tipos de Libros Rentables](#2-tipos-de-libros-rentables)
3. [Repositorios por Categoría](#3-repositorios-por-categoría)
   - 3.1 [Research de Nichos](#31-research-de-nichos)
   - 3.2 [Generación de Contenido (AI)](#32-generación-de-contenido-ai)
   - 3.3 [Libros de Actividades / Puzzle](#33-libros-de-actividades--puzzle)
   - 3.4 [Coloring Books](#34-coloring-books)
   - 3.5 [Interiores (Low Content)](#35-interiores-low-content)
   - 3.6 [Automatización de Publicación](#36-automatización-de-publicación)
   - 3.7 [Workflows Completos](#37-workflows-completos)
4. [Stack Tecnológico Recomendado](#4-stack-tecnológico-recomendado)
5. [Roadmap de Implementación](#5-roadmap-de-implementación)
6. [Fuentes](#6-fuentes)

---

## 1. Visión General del Negocio KDP

Amazon KDP permite publicar libros en formato digital (Kindle) y físico (print-on-demand) sin inversión inicial ni inventario. La plataforma imprime y envía bajo demanda.

### Ventajas del modelo KDP

| Aspecto | Detalle |
|---------|---------|
| **Inversión inicial** | $0 (solo coste de herramientas/APIs opcionales) |
| **Inventario** | Print-on-demand, Amazon gestiona todo |
| **Margen** | 35-70% royalty en ebooks, 40-60% en paperback |
| **Escalabilidad** | Subir cientos de libros con automatización |
| **Mercados** | Amazon US, UK, DE, FR, ES, IT, CA, AU, JP, IN, BR, MX |

### Modelos de libro

| Tipo | Complejidad | Tiempo creación | Margen típico |
|------|-------------|-----------------|---------------|
| **No-content** (cuadernos, diarios) | Baja | Minutos | Medio |
| **Low-content** (planificadores, trackers) | Media | Horas | Medio-Alto |
| **Medium-content** (libros de actividades, puzzles) | Media | Días | Alto |
| **High-content** (novelas, guías, libros AI) | Alta | Semanas | Muy Alto |

---

## 2. Tipos de Libros Rentables

Basado en tendencias actuales de KDP (2025-2026):

### No-Content (más simples)
- Cuadernos rayados / punteados / en blanco
- Diarios de gratitud
- Libretas de passwords
- Log books (tracking de hábitos, sueño, gastos)

### Low-Content
- Planificadores diarios/semanales/mensuales
- Trackers de fitness, dieta, gastos
- Journals específicos (viajes, lectura, proyectos)
- Libros de passwords con diseño

### Medium-Content
- Libros de sudoku, crucigramas, sopa de letras
- Libros de laberintos
- Coloring books (niños y adultos)
- Activity books para niños
- Libros de matemáticas / práctica de escritura

### High-Content (con AI)
- Guías de nicho ("Cómo entrenar a tu perro bulldog")
- Libros de recetas por tipo de dieta
- Libros de chistes / frases motivacionales por tema
- Novelas cortas (romance, thriller, sci-fi con AI)
- Libros de no-ficción acelerados con IA

---

## 3. Repositorios por Categoría

---

### 3.1 Research de Nichos

#### KDP Scout
- **Repo:** [rxpelle/kdp-scout](https://github.com/rxpelle/kdp-scout)
- **Stars:** ~500+
- **Tech:** Python, Click CLI, Rich, SQLite
- **Descripción:** CLI tool para research de keywords y análisis de competencia en Amazon KDP
- **Features:**
  - Minería de keywords desde autocomplete de Amazon (a-z expansion)
  - Auto-mina las 50 categorías KDP built-in
  - Tracking de competidores por ASIN (BSR, precio, ratings, reviews)
  - Integración con Amazon Ads (Sponsored Products)
  - Algoritmo de scoring compuesto para keywords
  - Automatización via cron jobs (diario/semanal)
  - Exporta CSV/JSON para importar a Amazon Ads
  - Genera keywords backend optimizadas (7 x 50 bytes)
  - Multi-marketplace (US, UK, CA, AU, DE, FR, ES, IT)
- **Coste:** Gratis (opcional DataForSEO para volúmenes de búsqueda)
- **Estado:** ✅ Activo, mantenido

#### Auto-KDP
- **Repo:** [ekr0/auto-kdp](https://github.com/ekr0/auto-kdp)
- **Stars:** ~200+
- **Tech:** Node.js, Puppeteer
- **Descripción:** Automatización de submission y update de libros en KDP
- **Features:**
  - CSV-driven workflow (`books.csv`)
  - Config defaults en `books.conf`
  - Actions: `book-metadata`, `content-metadata`, `scrapeIsbn`, `produceManuscript`, `content`, `pricing`, `publish`, `scrape`
  - Variable substitution y condicionales
  - Stateful execution (escribe `.new` CSVs)
  - Retry logic (2 reintentos)
- **Notas:** Print-only (no Kindle ebooks), no soporta subtítulos, frágil a cambios de UI de Amazon
- **Coste:** Gratis
- **Estado:** ⚠️ Mantenido pero frágil

---

### 3.2 Generación de Contenido (AI)

#### Book Generator
- **Repo:** [wesleyscholl/book-generator](https://github.com/wesleyscholl/book-generator)
- **Stars:** ~800+
- **Tech:** Python, Streamlit, multi-provider AI
- **Descripción:** Toolkit AI-powered para crear libros publication-ready
- **Features:**
  - Pipeline completo: Outline → Capítulos → Quality Review → Format Export → KDP Upload
  - Análisis de mercado (KDP analyzer, tendencias)
  - Generación de portadas y contraportadas
  - Export: EPUB, PDF, MOBI, AZW3, HTML, Markdown
  - Multi-provider AI: Gemini (recomendado), Groq, Ollama, OpenAI
  - 85% automated workflow
  - **2 libros publicados exitosamente en Amazon KDP**
- **Coste:** <$50 por libro (costes de API)
- **Tiempo:** 3-5 días de outline a libro publicado
- **Estado:** ✅ Activo, probado en producción

#### AI Book Generator
- **Repo:** [alexeygrigorev/ai-book-generator](https://github.com/alexeygrigorev/ai-book-generator)
- **Stars:** ~2.5k+
- **Tech:** Python, Streamlit
- **Descripción:** Sistema AI para crear libros completos con texto, audio y formatos print-ready
- **Features:**
  - Generación de PDF print-ready (interior + portada)
  - Creación de EPUB ebook
  - Text-to-speech para audiolibros
  - UI Streamlit para planificación de libros
  - Modos de generación: por secciones o por capítulos
- **Estado:** ✅ Activo

#### KDP-GPT
- **Repo:** [b7011343/kdp-gpt](https://github.com/b7011343/kdp-gpt)
- **Stars:** ~300+
- **Tech:** Python, OpenAI API
- **Descripción:** Script Python simple que genera libros usando ChatGPT para KDP
- **Features:**
  - Input: título, descripción, tono, número de capítulos
  - Output: PDF listo para KDP
- **Notas:** Implementación básica, buena para casos simples
- **Estado:** ⚠️ Básico, última actualización 2023

---

### 3.3 Libros de Actividades / Puzzle

#### Puzzle Book Generator
- **Repo:** [JYMOH001/Puzzle-Book-Generator](https://github.com/JYMOH001/Puzzle-Book-Generator)
- **Stars:** ~400+
- **Tech:** Python
- **Descripción:** Librería Python y CLI para generar libros de puzzles profesionales
- **Features:**
  - Sudoku y laberintos
  - PDFs print-ready
  - Niveles de dificultad customizables
  - Layouts profesionales
  - Formato de alta calidad
- **Tags:** `amazon-kdp`, `puzzle-book`, `print-on-demand`, `sudoku`, `maze`
- **Estado:** ✅ Activo

---

### 3.4 Coloring Books

#### GsColorbook
- **Repo:** [gsethi2409/GsColorbook](https://github.com/gsethi2409/GsColorbook)
- **Stars:** ~150+
- **Tech:** Python 3.8, NumPy, PIL, scikit-image, scikit-learn
- **Descripción:** Generador de coloring books usando k-means clustering y Canny Edge Detection
- **Features:**
  - Encuentra centroides de color con k-means
  - Canny Edge Detection para crear outlines
  - Genera paleta de colores indicando centroides
  - Output: imágenes estilo coloring book desde cualquier imagen input
- **Licencia:** MIT
- **Notas:** Hobby project, funcionalidad básica
- **Estado:** ⚠️ Básico

#### Coloring Book Creator
- **Repo:** [codebyahmed/coloring-book-creator](https://github.com/codebyahmed/coloring-book-creator)
- **Stars:** ~200+
- **Tech:** Python, LangChain, OpenAI API, Nebius API (Flux Schnell)
- **Descripción:** Genera 150 páginas de coloring book por tema
- **Features:**
  - Imágenes B/N child-friendly por tema
  - Usa Flux Schnell para generación de imágenes
  - OpenAI para categorías y prompts
  - SPAN para upscaling 2x
  - Requiere GPU compatible Vulkan
- **Estado:** ✅ Activo

#### Coloring Book (Multiplataforma)
- **Repo:** [pierceboggan/coloring-book](https://github.com/pierceboggan/coloring-book)
- **Stars:** ~1k+
- **Tech:** Next.js, Swift (iOS), Kotlin (Android), Supabase, OpenAI API
- **Descripción:** Generador AI de coloring books con soporte web, iOS y Android
- **Features:**
  - Fotos → coloring pages
  - Regeneración con prompts custom
  - Generación de PDF photobooks
  - Álbumes familiares compartibles
- **Estado:** ✅ Activo

---

### 3.5 Interiores (Low Content)

#### Office2KDP
- **Repo:** [multiplicit-com/Office2KDP](https://github.com/multiplicit-com/Office2KDP)
- **Stars:** ~100+
- **Tech:** Excel VBA, Microsoft Office (Word, Excel, PowerPoint)
- **Descripción:** Toolkit para crear y exportar interiores y portadas KDP desde Office
- **Features:**
  - Exporta templates Word con márgenes, headers y gutter correctos para KDP
  - Calculadora interactiva de trim size y márgenes
  - Calculadora de dimensiones de portada (trim size, spine width, bleed, DPI, binding)
  - Macros VBA que construyen documentos con layout correcto
  - Soporte: `CreateKDPWordTemplate`
- **Licencia:** CC BY-NC 4.0 (tool gratuito/no-comercial; libros creados sí pueden venderse)
- **Estado:** ✅ Activo

#### svg.py
- **Repo:** [orsinium-labs/svg.py](https://github.com/orsinium-labs/svg.py)
- **Stars:** ~600+
- **Tech:** Python puro, type-safe
- **Descripción:** Librería para generar SVG files
- **Features:**
  - Compatible con SVG standards 1.1, 1.2, 2.0, Tiny
  - 100% type safe, sin dependencias de terceros
  - Útil para construir generadores de interiores KDP custom
- **Estado:** ✅ Activo

---

### 3.6 Automatización de Publicación

#### Amazon KDP Automater
- **Repo:** [BrahimAkar/Amazon-KDP-Automater](https://github.com/BrahimAkar/Amazon-KDP-Automater)
- **Stars:** ~50+
- **Tech:** Python, Selenium
- **Descripción:** Automatiza uploads de libros a KDP
- **Notas:** Proyecto antiguo (2020). Automatizar uploads KDP puede violar TOS de Amazon. Usar con precaución.
- **Estado:** ⚠️ Antiguo, riesgo TOS

#### Write Book Template
- **Repo:** [astrapi69/write-book-template](https://github.com/astrapi69/write-book-template)
- **Stars:** ~200+
- **Tech:** Python, manuscripta, Pandoc, Poetry, GitHub Actions
- **Descripción:** Template para escribir, traducir y exportar libros en Markdown
- **Features:**
  - Workflow Markdown-based
  - Multi-format export: PDF, EPUB, DOCX, HTML
  - Versiones print-ready para KDP (paperback/hardcover)
  - Generación de audiolibros con TTS
  - Traducción (DeepL, LMStudio)
  - Automatización via GitHub Actions
- **Estado:** ✅ Activo

---

### 3.7 Workflows Completos

#### Book Generator (Pipeline Completo)
- **Repo:** [wesleyscholl/book-generator](https://github.com/wesleyscholl/book-generator) (ya listado arriba)
- **Pipeline:**
  1. Research de mercado (KDP analyzer)
  2. Selección de tema/título (AI)
  3. Generación de outline detallado
  4. Generación y edición de capítulos
  5. Quality check y plagiarism check
  6. Generación de portada (ImageMagick o AI)
  7. Export a múltiples formatos
  8. Upload a KDP (manual o con auto-kdp)
- **Libros publicados exitosamente:**
  - "The Playful Path: Unlocking Your Child's Potential Through Joyful, Play-Based Learning for Ages 3-8"
  - "The Micro-Influence Advantage: Building Your Niche Brand and Monetizing Your Passion Online"

#### Arabic eBooks Pipeline
- **Artículo:** [Publishing Arabic eBooks on KDP Using Claude Code and AI Translation](https://dev.to/myougatheaxo/publishing-arabic-ebooks-on-kdp-using-claude-code-and-ai-translation-full-pipeline-2ane)
- **Descripción:** Pipeline completo usando Claude Code para traducir y publicar ebooks en árabe
- **Tecnologías:** Claude Code, AI Translation, KDP

---

## 4. Stack Tecnológico Recomendado

Para construir una línea de negocio KDP dentro del ecosistema Groomly:

### Arquitectura propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    GROOMLY KDP ENGINE                       │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│   Research  │  Generation │   Design    │   Publishing      │
│             │             │             │                   │
│ kdp-scout   │ book-gen    │ svg.py      │ auto-kdp          │
│ (Python)    │ (Python)    │ (Python)    │ (Node/Puppeteer)  │
│             │             │             │                   │
│ Niche finder│ AI content  │ Interiors   │ Bulk upload       │
│ Keywords    │ Outline     │ Covers      │ Metadata          │
│ Competitors │ Chapters    │ PDF export  │ Pricing           │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

### Componentes técnicos

| Capa | Tecnología | Repositorio base |
|------|-----------|------------------|
| **Backend** | Node.js / Python | Integrar con backend existente de Groomly |
| **AI/LLM** | OpenAI API / Gemini | book-generator pattern |
| **PDF Generation** | Python (ReportLab, Pillow, svg.py) | Puzzle-Book-Generator + svg.py |
| **Research** | Python CLI | kdp-scout |
| **Automation** | Puppeteer / Playwright | auto-kdp pattern |
| **DB** | PostgreSQL + Prisma | Reutilizar stack existente |
| **Queue** | BullMQ | Reutilizar stack existente |

### Integración con ecosistema Groomly

- Usar `@groomly/shared` para tipos y utilidades compartidas
- Reutilizar el sistema de jobs (BullMQ) para tareas de generación
- Integrar con el sistema de usuarios y billing existente
- Dashboard en Next.js (frontend existente)

---

## 5. Roadmap de Implementación

### Fase 1: MVP — Low Content Books (Semanas 1-2)
- [ ] Generador de interiores básicos (rayado, punteado, en blanco)
- [ ] Generador de portadas simples (templates + texto)
- [ ] Export PDF KDP-ready (márgenes, bleed, trim size)
- [ ] Dashboard básico: crear libro → descargar PDFs

### Fase 2: Puzzle & Activity Books (Semanas 3-4)
- [ ] Integrar puzzle generator (sudoku, laberintos)
- [ ] Coloring book generator (photo → outline)
- [ ] Combinación de páginas (puzzle + journal)
- [ ] Preview interactivo del libro

### Fase 3: AI Content Books (Semanas 5-6)
- [ ] Integrar LLM para generación de outlines
- [ ] Generación de capítulos por secciones
- [ ] Quality check básico
- [ ] Portadas AI-generated

### Fase 4: Research & Automation (Semanas 7-8)
- [ ] Niche research integrado (scraper Amazon)
- [ ] Keyword analysis y scoring
- [ ] Competitor tracking
- [ ] Bulk operations (generar 10+ libros a la vez)

### Fase 5: Publishing Pipeline (Semanas 9-10)
- [ ] Integrar auto-kdp para upload automatizado
- [ ] Gestión de catálogo (tracking de libros publicados)
- [ ] Analytics de ventas (scraper o API de Amazon)
- [ ] Pricing optimization

---

## 6. Fuentes

- [KDP Scout — Keyword Research CLI](https://github.com/rxpelle/kdp-scout)
- [Auto-KDP — Bulk Upload Automation](https://github.com/ekr0/auto-kdp)
- [Book Generator — AI Book Creation Pipeline](https://github.com/wesleyscholl/book-generator)
- [AI Book Generator — Print + Audio](https://github.com/alexeygrigorev/ai-book-generator)
- [KDP-GPT — Simple AI Book Generator](https://github.com/b7011343/kdp-gpt)
- [Puzzle Book Generator](https://github.com/JYMOH001/Puzzle-Book-Generator)
- [GsColorbook — Coloring Book Generator](https://github.com/gsethi2409/GsColorbook)
- [Coloring Book Creator (AI)](https://github.com/codebyahmed/coloring-book-creator)
- [Coloring Book — Multiplataforma](https://github.com/pierceboggan/coloring-book)
- [Office2KDP — Interior Templates](https://github.com/multiplicit-com/Office2KDP)
- [svg.py — SVG Generation](https://github.com/orsinium-labs/svg.py)
- [Write Book Template](https://github.com/astrapi69/write-book-template)
- [Amazon KDP Automater](https://github.com/BrahimAkar/Amazon-KDP-Automater)
- [Arabic eBooks KDP Pipeline — Dev.to](https://dev.to/myougatheaxo/publishing-arabic-ebooks-on-kdp-using-claude-code-and-ai-translation-full-pipeline-2ane)
- [Best Free Coloring Book Creator 2026](https://univers.studio/blog/best-coloring-book-creator/)
- [KDP Niche Research Tool Guide](https://kdpinterior.com/amazon-kdp-niche-research/)
- [KDP Interior Template Generators](https://waytochanges.com/kdp-interior-generator/)
- [KDP Tools — Free Interiors](https://kdptools.io/interior-templates)

---

*Documento generado para peluguau.com — Groomly ecosystem*
