# Asset Factory — Generador Universal de Activos Digitales

> Capa de generación de assets reutilizable para todas las líneas de negocio: KDP, Etsy, y marketplaces digitales.> Genera: PDFs, Excel, Notion, Canva, SVG, Stickers, Coloring Books, Journals, Trackers, Planners.
>
> **Fecha:** 2026-06-10 | **Proyecto:** peluguau.com / Groomly ecosystem

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Asset Factory](#2-arquitectura-del-asset-factory)
3. [Assets por Tipo](#3-assets-por-tipo)
   - 3.1 [PDFs](#31-pdfs)
   - 3.2 [Excel / Google Sheets](#32-excel--google-sheets)
   - 3.3 [Notion Templates](#33-notion-templates)
   - 3.4 [Canva Templates](#34-canva-templates)
   - 3.5 [SVG](#35-svg)
   - 3.6 [Stickers](#36-stickers)
   - 3.7 [Coloring Books](#37-coloring-books)
   - 3.8 [Journals](#38-journals)
   - 3.9 [Trackers](#39-trackers)
   - 3.10 [Planners](#310-planners)
4. [Repositorios y Herramientas](#4-repositorios-y-herramientas)
5. [Pipeline de Generación](#5-pipeline-de-generación)
6. [Stack Tecnológico](#6-stack-tecnológico)
7. [Roadmap](#7-roadmap)
8. [Fuentes](#8-fuentes)

---

## 1. Visión General

El Asset Factory es un motor de generación de activos digitales que produce todo tipo de productos vendibles en KDP, Etsy, y otros marketplaces. Un solo input (tema/nicho) puede generar múltiples assets simultáneamente.

### Flujo conceptual

```
Input: "Fitness para mujeres 40+"
    │
    ├──▶ PDF Planner (weekly fitness planner)
    ├──▶ Excel Tracker (weight, measurements, macros)
    ├──▶ Notion Template (fitness dashboard)
    ├──▶ Canva Templates (social media posts, covers)
    ├──▶ SVG Bundle (fitness icons, motivational quotes)
    ├──▶ Stickers (workout stickers, habit trackers)
    ├──▶ Coloring Book (yoga poses, gym equipment)
    ├──▶ Journal (fitness gratitude journal)
    ├──▶ Trackers (habit, mood, progress)
    └──▶ Planners (meal planner, workout schedule)
```

### Output por marketplace

| Asset | KDP | Etsy | Otros |
|-------|-----|------|-------|
| PDFs | ✅ Libros/interiores | ✅ Printables/Downloads | ✅ Lead magnets |
| Excel | ❌ | ✅ Templates/Trackers | ✅ Tools |
| Notion | ❌ | ✅ Templates | ✅ SaaS |
| Canva | ❌ | ✅ Templates | ✅ Content |
| SVG | ❌ | ✅ Bundles/Clipart | ✅ Cutting files |
| Stickers | ❌ | ✅ Printable/Die-cut | ✅ Telegram/WhatsApp |
| Coloring Books | ✅ KDP ready | ✅ Digital download | ✅ Apps |
| Journals | ✅ KDP ready | ✅ Printable PDF | ✅ Apps |
| Trackers | ❌ | ✅ Printables | ✅ Apps |
| Planners | ❌ | ✅ Printables | ✅ Apps |

---

## 2. Arquitectura del Asset Factory

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ASSET FACTORY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐     ┌──────────────┐     ┌─────────────────────┐   │
│   │  INPUT   │────▶│   ENGINE     │────▶│    OUTPUT BUNDLE    │   │
│   │          │     │              │     │                     │   │
│   │ Theme/   │     │ AI Content   │     │ 📄 PDFs             │   │
│   │ Niche    │     │ Generator    │     │ 📊 Excel            │   │
│   │ Keywords │     │ (GPT/Claude) │     │ 📝 Notion           │   │
│   │          │     │              │     │ 🎨 Canva            │   │
│   └──────────┘     └──────────────┘     │ ✨ SVG                │   │
│          │                  │            │ 🏷️ Stickers          │   │
│          │                  │            │ 🖍️ Coloring Books    │   │
│          ▼                  ▼            │ 📔 Journals           │   │
│   ┌─────────────────────────────┐       │ 📈 Trackers           │   │
│   │      TEMPLATE LIBRARY       │       │ 📅 Planners           │   │
│   │                             │       └─────────────────────┘   │
│   │ • PDF layouts               │                     │           │
│   │ • Excel formulas/styles     │                     ▼           │
│   │ • Notion page structures    │       ┌─────────────────────┐   │
│   │ • Canva design frames       │       │  PUBLISH LAYER      │   │
│   │ • SVG icon sets             │       │                     │   │
│   │ • Sticker sheet layouts     │       │ • KDP upload        │   │
│   │ • Coloring page templates   │       │ • Etsy listing      │   │
│   │ • Journal page types        │       │ • Gumroad store     │   │
│   │ • Tracker grid layouts      │       │ • Email delivery    │   │
│   │ • Planner calendar layouts  │       └─────────────────────┘   │
│   └─────────────────────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Assets por Tipo

---

### 3.1 PDFs

**Uso:** Libros KDP, printables Etsy, lead magnets, worksheets.

#### Librerías Python para PDF

| Librería | Mejor para | Velocidad | Dependencias |
|----------|-----------|-----------|--------------|
| **FPDF2** | Documentos simples | 0.05s | Ninguna (pure Python) |
| **ReportLab** | Layouts complejos, tablas, gráficos | 0.08s | Ninguna |
| **WeasyPrint** | HTML/CSS → PDF | 0.35s | Media |
| **Playwright** | Render web pixel-perfect | 0.75s | Alta (browser) |
| **Borb** | Formularios, barcodes, firmas | 0.12s | Baja-Media |

#### Ejemplo: Generador de planner PDF con ReportLab

```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

def create_planner_pdf(title, filename, pages=120):
    doc = SimpleDocTemplate(filename, pagesize=letter,
        rightMargin=0.5*inch, leftMargin=0.5*inch,
        topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    story = []

    # Cover page
    story.append(Paragraph(title, styles["Title"]))
    story.append(Spacer(1, 0.5*inch))

    # Weekly layout table
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    data = [[day, "", ""] for day in days]
    data.insert(0, ["Day", "Tasks", "Notes"])

    t = Table(data, colWidths=[1.2*inch, 2.5*inch, 2.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 14),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.lightgrey])
    ]))
    story.append(t)

    doc.build(story)
```

#### Templates PDF disponibles

| Tipo | Ejemplos | KDP Ready |
|------|----------|-----------|
| Lined pages | Cuadernos, journals | ✅ |
| Dot grid | Bullet journals | ✅ |
| Graph/grid | Engineering, math | ✅ |
| Weekly planner | Agenda semanal | ❌ |
| Daily planner | Agenda diaria | ❌ |
| Habit tracker | Seguimiento hábitos | ❌ |
| Budget tracker | Gastos, ahorros | ❌ |
| Meal planner | Planificación comidas | ❌ |
| Workout log | Registro ejercicio | ❌ |
| Gratitude journal | Diario gratitud | ❌ |

---

### 3.2 Excel / Google Sheets

**Uso:** Templates de trackers, budgets, calculadoras, dashboards. Muy rentables en Etsy.

#### Librerías Python

| Librería | Mejor para | Características |
|----------|-----------|---------------|
| **openpyxl** | Styling completo, fórmulas | Full control de celdas, colores, charts |
| **pandas** | Manipulación de datos | Vectorizado, rápido con grandes datasets |
| **xlsxwriter** | Charts avanzados | Mejor soporte de gráficos |
| **openpyxl-templates** | Templates estructurados | Extensión de openpyxl para templates formales |

#### Ejemplo: Budget Tracker Excel

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "Budget Tracker"

# Header styling
header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
header_font = Font(bold=True, color="FFFFFF", size=12)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

# Headers
headers = ["Category", "Budgeted", "Actual", "Difference", "Notes"]
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center')
    cell.border = thin_border

# Categories
categories = ["Housing", "Food", "Transportation", "Utilities", "Entertainment", "Savings", "Other"]
for row, cat in enumerate(categories, 2):
    ws.cell(row=row, column=1, value=cat).border = thin_border
    ws.cell(row=row, column=2, value=0).border = thin_border
    ws.cell(row=row, column=3, value=0).border = thin_border
    # Formula for difference
    diff_cell = ws.cell(row=row, column=4)
    diff_cell.value = f"=B{row}-C{row}"
    diff_cell.border = thin_border
    ws.cell(row=row, column=5, value="").border = thin_border

# Totals row
total_row = len(categories) + 2
ws.cell(row=total_row, column=1, value="TOTAL").font = Font(bold=True)
ws.cell(row=total_row, column=2, value=f"=SUM(B2:B{total_row-1})").font = Font(bold=True)
ws.cell(row=total_row, column=3, value=f"=SUM(C2:C{total_row-1})").font = Font(bold=True)
ws.cell(row=total_row, column=4, value=f"=SUM(D2:D{total_row-1})").font = Font(bold=True)

# Auto-width
for col in range(1, 6):
    ws.column_dimensions[get_column_letter(col)].width = 18

wb.save("budget_tracker.xlsx")
```

#### Tipos de Excel templates rentables

| Categoría | Ejemplos | Precio Etsy típico |
|-----------|----------|-------------------|
| **Budget/Finance** | Monthly budget, debt tracker, savings goals | $3-8 |
| **Business** | Invoice, inventory, CRM, project tracker | $5-15 |
| **Health/Fitness** | Weight loss tracker, meal planner, workout log | $3-7 |
| **Wedding/Event** | Guest list, budget, seating chart, timeline | $5-12 |
| **Real Estate** | Property analysis, rental income tracker | $8-20 |
| **Tax/Accounting** | Expense tracker, tax deduction log | $5-10 |
| **Habit/Goals** | Habit tracker, goal setting, yearly planner | $3-6 |

---

### 3.3 Notion Templates

**Uso:** Dashboards, sistemas de organización, trackers interactivos. Cada vez más demandados.

#### Enfoque técnico

Notion no tiene API de "template export". El enfoque es:
1. Crear el template en Notion manualmente
2. Duplicarlo para cada cliente ("Duplicate" link)
3. O usar la Notion API para crear estructuras programáticamente

#### Herramientas

| Herramienta | Propósito | Link |
|-------------|-----------|------|
| **notionary** | Python async wrapper para Notion API | [mathisarends/notionary](https://github.com/mathisarends/notionary) |
| **notion-to-md** | Export Notion pages a Markdown | [SwordAndTea/notion-to-md-py](https://github.com/SwordAndTea/notion-to-md-py) |
| **notion-exporter** | Multi-format export (Markdown, Word) | [looorent/notion-exporter](https://github.com/looorent/notion-exporter) |

#### Notion API (oficial) — Markdown Content API (Feb 2026)

```javascript
// Obtener página como Markdown
const response = await notion.pages.retrieveMarkdown({
  page_id: pageId,
});
// Retorna "Enhanced Markdown" con tags XML para callouts, columns, toggles
```

#### Workflow recomendado para templates

```
1. Diseñar template en Notion (manual)
2. Generar "Duplicate" link público
3. Incluir instrucciones de setup en el PDF de compra
4. Entregar: PDF con link de duplicación + guía de uso
```

#### Tipos de Notion templates rentables

| Categoría | Ejemplos | Precio Etsy típico |
|-----------|----------|-------------------|
| **Productivity** | Second brain, PARA method, GTD | $5-15 |
| **Business** | CRM, content calendar, SOPs | $10-25 |
| **Students** | Note-taking system, thesis planner | $5-12 |
| **Finance** | Net worth tracker, investment dashboard | $8-20 |
| **Creators** | YouTube planner, podcast planner | $8-15 |
| **Life/Goals** | Yearly compass, habit tracker, journal | $5-10 |

---

### 3.4 Canva Templates

**Uso:** Social media posts, presentaciones, resumes, covers. Gran demanda de "templates editables".

#### Enfoque técnico

**Problema:** Canva no permite exportar templates programáticamente. Las alternativas:

1. **Canva Connect API** (Enterprise only, 30+ seats)
2. **Alternativas open source** con API propia
3. **Entregar links de Canva** ("Use template" link público)

#### Alternativas open source a Canva

| Herramienta | Tipo | Características |
|-------------|------|----------------|
| **Open Design** | Open-source Canva clone | API REST, Fabric.js canvas, templates, agent mode | [clawnify/open-design](https://github.com/clawnify/open-design) |
| **Penpot** | UI/UX design | Colaboración real-time, SVG, self-hosted | [penpot/penpot](https://github.com/penpot/penpot) |
| **Inkscape** | Vector editor | Logos, ilustraciones, SVG nativo | inkscape.org |
| **GIMP** | Raster editor | Photo editing, compositing | gimp.org |

#### Open Design — API-first Canva alternative

```bash
# Clone y run
git clone https://github.com/clawnify/open-design.git
cd open-design
pnpm install
pnpm run dev
# Frontend: http://localhost:5178
# API: http://localhost:3006
```

```bash
# Crear diseño via API
curl -X POST http://localhost:3006/api/designs \
  -H "Content-Type: application/json" \
  -d '{"name": "Instagram Post", "width": 1080, "height": 1080}'

# Actualizar canvas
curl -X PUT http://localhost:3006/api/designs/1 \
  -H "Content-Type: application/json" \
  -d '{"canvas_json": "..."}'
```

**Endpoints:**
- `GET/POST /api/designs` — CRUD de diseños
- `GET/POST /api/templates` — Gestión de templates
- `POST /api/uploads` — Upload de imágenes
- `PUT /api/designs/:id` — Update canvas JSON

#### Alternativas comerciales con API

| Servicio | Free Tier | Precio | Feature |
|----------|-----------|--------|---------|
| **Layerre** | Sí | $9.99/mo | Import Canva URL → API |
| **Orshot** | 30 créditos | Pay-per-use | Multi-page, auto-publish |
| **Templated.io** | — | $29/mo | Video generation, AI templates |
| **Imejis.io** | 100 créditos | $14.99/mo | Canva-like editor |

#### Workflow para Canva templates

```
Opción A: Entregar link de Canva
1. Crear template en Canva (manual)
2. Hacerlo público con "Share as template"
3. Incluir link en PDF de instrucciones
4. Entregar: PDF con links + guía de edición

Opción B: Open Design (self-hosted)
1. Crear templates en Open Design
2. API para generar variantes programáticamente
3. Export PNG/PDF/SVG
4. Integrar en pipeline automático
```

#### Tipos de Canva templates rentables

| Categoría | Ejemplos | Precio Etsy típico |
|-----------|----------|-------------------|
| **Social Media** | Instagram posts, stories, reels covers | $3-8 |
| **Business** | Business cards, flyers, brochures | $5-12 |
| **Presentations** | Pitch decks, webinar slides | $8-20 |
| **Printables** | Wall art, calendars, invitations | $3-7 |
| **Resumes** | CV templates, cover letters | $3-8 |
| **Planners** | Digital planners, habit trackers | $5-10 |
| **Branding** | Logo templates, brand kits | $10-25 |

---

### 3.5 SVG

**Uso:** Clipart, iconos, sublimación, cutting files (Cricut, Silhouette), patterns. Producto estrella en Etsy.

#### Librerías y herramientas

| Herramienta | Tipo | Uso |
|-------------|------|-----|
| **svg.py** | Python puro | Generación programática de SVGs | [orsinium-labs/svg.py](https://github.com/orsinium-labs/svg.py) |
| **OmniSVG** | AI (NeurIPS 2025) | Text-to-SVG, image-to-SVG | [OmniSVG/OmniSVG](https://github.com/OmniSVG/OmniSVG) |
| **SVG ORA Studio** | AI + Editor | Generación y edición de SVGs | [seeb4coding/SVG-ORA-Studio](https://github.com/seeb4coding/SVG-ORA-Studio) |
| **Inkscape** | Editor desktop | Post-procesamiento, limpieza | inkscape.org |
| **Recraft V4** | AI generativo | Native SVG generation (sin tracing) | recraft.ai |

#### Ejemplo: Generar SVG con svg.py

```python
from svg import svg, rect, circle, text, path

# Icono de fitness simple
icon = svg(width=100, height=100, viewBox="0 0 100 100")(
    rect(x=0, y=0, width=100, height=100, fill="#f0f0f0", rx=10),
    # Pesa (dumbbell)
    rect(x=15, y=42, width=20, height=16, fill="#333", rx=2),
    rect(x=65, y=42, width=20, height=16, fill="#333", rx=2),
    rect(x=32, y=47, width=36, height=6, fill="#666", rx=3),
    # Texto
    text(x=50, y=80, text_anchor="middle", font_size="10", fill="#333",
         font_family="Arial")("WORKOUT")
)

with open("fitness_icon.svg", "w") as f:
    f.write(str(icon))
```

#### Requisitos para SVGs de venta

| Especificación | Requerimiento |
|---------------|---------------|
| **Fondo** | Transparente (no background rectangles) |
| **Paths** | Cerrados, sin breaks |
| **Fill rule** | `evenodd` (evitar `clipPath`) |
| **Gradientes** | Evitar (problemáticos en cutting machines) |
| **Formatos bundle** | SVG + PNG transparente + opcional AI/EPS |
| **Tamaño preview** | Reconocible a 64px |

#### Tipos de SVG bundles rentables

| Categoría | Ejemplos | Precio Etsy típico |
|-----------|----------|-------------------|
| **Quotes/Motivational** | Frases decorativas, lettering | $2-5 |
| **Seasonal/Holiday** | Halloween, Christmas, Easter | $3-7 |
| **Sublimation** | Tumbler wraps, shirt designs | $3-8 |
| **Baby/Kids** | Nursery decor, birthday | $3-6 |
| **Wedding** | Invitations, signs, favors | $5-12 |
| **Business** | Logos, icons, branding | $5-15 |
| **Patterns** | Seamless patterns, backgrounds | $3-8 |

---

### 3.6 Stickers

**Uso:** Printable sticker sheets, die-cut stickers, planner stickers, digital stickers (GoodNotes, Notability).

#### Herramientas

| Herramienta | Tipo | Características |
|-------------|------|----------------|
| **StickerForge** | AI Generator | 8 estilos, die-cut, transparente, self-hosted | [patangal/StickerForge](https://github.com/patangal/StickerForge) |
| **Auto-Sticker-Generator** | OpenAI-powered | GPT + DALL-E para stickers temáticos | [Cfomodz/Auto-Sticker-Generator](https://github.com/Cfomodz/Auto-Sticker-Generator) |
| **Sticker-Generator** | PDF imprimible | Layouts para hojas Avery | [ntaylor-86/Sticker-Generator](https://github.com/ntaylor-86/Sticker-Generator) |

#### StickerForge — Mejor opción

```javascript
// Estilos disponibles:
// Kawaii, Cartoon, 3D Render, Pixel Art, Minimalist, Watercolor, Retro, Emoji
// Todos incluyen: die-cut sticker, white outline border, isolated on solid white
// Output: RGBA PNG 512x512
```

#### Layout de sticker sheet (PDF imprimible)

```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from PIL import Image

def create_sticker_sheet(images, output_path, cols=4, rows=5):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    margin = 0.5 * 72  # 0.5 inch
    sticker_w = (width - 2 * margin) / cols
    sticker_h = (height - 2 * margin) / rows

    for i, img_path in enumerate(images):
        row = i // cols
        col = i % cols
        x = margin + col * sticker_w
        y = height - margin - (row + 1) * sticker_h

        # Draw sticker with border
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setLineWidth(1)
        c.roundRect(x + 5, y + 5, sticker_w - 10, sticker_h - 10, 10, fill=0, stroke=1)

        # Place image
        c.drawImage(img_path, x + 15, y + 15,
                   width=sticker_w - 30, height=sticker_h - 30,
                   preserveAspectRatio=True, mask='auto')

    c.save()
```

#### Tipos de stickers rentables

| Tipo | Ejemplos | Precio Etsy típico |
|------|----------|-------------------|
| **Planner stickers** | Functional, decorative, date covers | $3-6 |
| **Die-cut stickers** | Laptop decals, water bottle | $2-5 |
| **Sticker sheets** | Themed bundles (fitness, pets, food) | $3-7 |
| **Digital stickers** | GoodNotes, Notability, PNG | $3-5 |
| **Kawaii stickers** | Cute characters, chibi | $3-6 |
| **Motivational** | Quotes, affirmations | $2-4 |

---

### 3.7 Coloring Books

**Uso:** KDP books, digital downloads Etsy, apps.

#### Herramientas (ya cubiertas en KDP doc)

| Herramienta | Tipo | Link |
|-------------|------|------|
| **GsColorbook** | Edge detection + k-means | [gsethi2409/GsColorbook](https://github.com/gsethi2409/GsColorbook) |
| **Coloring Book Creator** | AI (Flux + OpenAI) | [codebyahmed/coloring-book-creator](https://github.com/codebyahmed/coloring-book-creator) |
| **Coloring Book** | Multiplataforma | [pierceboggan/coloring-book](https://github.com/pierceboggan/coloring-book) |

#### Pipeline de generación

```python
# 1. Generar líneas con Canny Edge Detection
# 2. Aplicar threshold para líneas negras puras
# 3. Crear página en blanco con líneas
# 4. Ensamblar PDF de 30-50 páginas
# 5. Añadir página de título + copyright
```

#### Especificaciones KDP para coloring books

| Spec | Valor |
|------|-------|
| **DPI** | 300 |
| **Color** | Black and white (no grayscale) |
| **Line weight** | 3+ points |
| **Background** | Pure white |
| **Trim size** | 8.5 x 11 inches |
| **Pages** | 24-100 |

---

### 3.8 Journals

**Uso:** KDP, Etsy digital downloads, apps.

#### Tipos de journals

| Tipo | Contenido | Target |
|------|-----------|--------|
| **Gratitude journal** | Prompts diarios de gratitud | Wellness |
| **Fitness journal** | Workouts, meals, progress | Health |
| **Travel journal** | Itineraries, memories, maps | Travelers |
| **Dream journal** | Sleep tracking, dream logs | Spiritual |
| **Prayer journal** | Devotionals, scripture | Religious |
| **Self-discovery** | Prompts introspectivos | Personal growth |
| **Project journal** | Ideas, sketches, notes | Creatives |

#### Estructura típica de un journal

```
Página 1: Título + introducción
Página 2: "This journal belongs to" + instrucciones
Página 3+: Template repetido (daily/weekly)
  - Fecha
  - Prompt/questions
  - Líneas en blanco para respuestas
  - Sección de notas/reflexiones
Últimas páginas: Notes adicionales
```

---

### 3.9 Trackers

**Uso:** Printables Etsy, digital downloads, insertos de planners.

#### Tipos de trackers

| Categoría | Trackers | Layout |
|-----------|----------|--------|
| **Habit** | Daily checkboxes, streak counter | Grid mensual |
| **Mood** | Color-coded scale, notes | Grid o radial |
| **Expense/Budget** | Categories, amounts, totals | Tabla |
| **Fitness** | Weight, measurements, workouts | Tabla + gráfico |
| **Sleep** | Hours, quality, dreams | Grid horario |
| **Water intake** | Cups/glasses per day | Grid mensual |
| **Period** | Cycle tracking, symptoms | Grid mensual |
| **Medication** | Doses, times, adherence | Grid semanal |
| **Reading** | Books, pages, ratings | Lista + grid |
| **Savings** | Goals, contributions, progress | Gráfico de barras |

#### Generador de habit tracker con Python

```python
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

def create_habit_tracker(habits, month, year, filename):
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, f"Habit Tracker - {month} {year}")

    # Days header
    days = list(range(1, 32))
    c.setFont("Helvetica", 8)
    for i, day in enumerate(days):
        c.drawString(120 + i * 18, height - 90, str(day))

    # Habits rows
    c.setFont("Helvetica", 10)
    for row, habit in enumerate(habits):
        y = height - 120 - row * 25
        c.drawString(50, y, habit)
        # Checkbox squares
        for day in range(31):
            c.rect(115 + day * 18, y - 5, 12, 12, fill=0, stroke=1)

    c.save()

# Uso
create_habit_tracker(
    ["Exercise", "Read 30min", "Drink 2L water", "Meditate", "No sugar"],
    "January", 2026, "habit_tracker.pdf"
)
```

---

### 3.10 Planners

**Uso:** Printables Etsy, KDP, digital planners (GoodNotes).

#### Tipos de planners

| Frecuencia | Layout | Precio Etsy |
|------------|--------|-------------|
| **Yearly** | 12-month overview, goals | $3-6 |
| **Quarterly** | 3-month sprint, reviews | $3-5 |
| **Monthly** | Calendar + goals + habits | $3-6 |
| **Weekly** | 7-day spread, hourly | $3-7 |
| **Daily** | Hourly schedule + notes | $3-6 |
| **Undated** | Reusable, fill-in dates | $5-10 |
| **Academic** | Semester-based, assignments | $5-10 |
| **Financial** | Budget, bills, savings | $5-10 |
| **Wedding** | Timeline, checklist, budget | $8-15 |
| **Project** | Tasks, milestones, resources | $5-10 |

#### Ejemplo: Weekly planner con ReportLab

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors

def create_weekly_planner(filename):
    days = ["Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday"]

    # 3-column layout: Day | Schedule | Notes
    data = []
    for day in days:
        data.append([day, "", ""])
        # Hourly slots
        for hour in range(6, 23, 2):
            data.append([f"{hour:02d}:00", "", ""])
        data.append(["", "Notes:", ""])  # Separator

    t = Table(data, colWidths=[80, 200, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#333333')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    return t
```

---

## 4. Repositorios y Herramientas

### PDF Generation

| Repo | Descripción | Link |
|------|-------------|------|
| **planner-generator-python** | Digital planner para GoodNotes (HTML → PDF) | [georgiastuart/planner-generator-python](https://github.com/georgiastuart/planner-generator-python) |
| **Puzzle-Book-Generator** | Sudoku, laberintos, PDF print-ready | [JYMOH001/Puzzle-Book-Generator](https://github.com/JYMOH001/Puzzle-Book-Generator) |
| **Office2KDP** | Templates Word/Excel con formato KDP | [multiplicit-com/Office2KDP](https://github.com/multiplicit-com/Office2KDP) |

### Excel/Spreadsheets

| Repo | Descripción | Link |
|------|-------------|------|
| **openpyxl-templates** | Templates estructurados para openpyxl | [SverkerSbrg/openpyxl-templates](https://github.com/SverkerSbrg/openpyxl-templates) |
| **Engineering-Data-Sheet-Generator** | Excel con validaciones y formatting | [thendralmagudapathi/Engineering-Data-Sheet-Generator](https://github.com/thendralmagudapathi/Engineering-Data-Sheet-Generator) |

### Notion

| Repo | Descripción | Link |
|------|-------------|------|
| **notionary** | Python async wrapper para Notion API | [mathisarends/notionary](https://github.com/mathisarends/notionary) |
| **notion-to-md** | Notion pages → Markdown | [SwordAndTea/notion-to-md-py](https://github.com/SwordAndTea/notion-to-md-py) |
| **notion-exporter** | Multi-format export | [looorent/notion-exporter](https://github.com/looorent/notion-exporter) |

### Canva / Design

| Repo | Descripción | Link |
|------|-------------|------|
| **Open Design** | Open-source Canva alternative con API | [clawnify/open-design](https://github.com/clawnify/open-design) |
| **Penpot** | UI/UX design open-source | [penpot/penpot](https://github.com/penpot/penpot) |
| **svg.py** | Generación programática SVG | [orsinium-labs/svg.py](https://github.com/orsinium-labs/svg.py) |
| **OmniSVG** | AI text-to-SVG | [OmniSVG/OmniSVG](https://github.com/OmniSVG/OmniSVG) |

### Stickers

| Repo | Descripción | Link |
|------|-------------|------|
| **StickerForge** | AI sticker generator, 8 estilos | [patangal/StickerForge](https://github.com/patangal/StickerForge) |
| **Auto-Sticker-Generator** | OpenAI-powered stickers | [Cfomodz/Auto-Sticker-Generator](https://github.com/Cfomodz/Auto-Sticker-Generator) |
| **Sticker-Generator** | PDF imprimible Avery labels | [ntaylor-86/Sticker-Generator](https://github.com/ntaylor-86/Sticker-Generator) |

### Coloring Books

| Repo | Descripción | Link |
|------|-------------|------|
| **GsColorbook** | Edge detection + k-means | [gsethi2409/GsColorbook](https://github.com/gsethi2409/GsColorbook) |
| **coloring-book-creator** | AI (Flux + OpenAI) | [codebyahmed/coloring-book-creator](https://github.com/codebyahmed/coloring-book-creator) |

### Trackers

| Repo | Descripción | Link |
|------|-------------|------|
| **habit_tracker** | Markdown generator de habit tracker | [opethef10/habit_tracker](https://github.com/opethef10/habit_tracker) |
| **expense-budget-tracker** | Self-hosted expense tracker | [kirill-markin/expense-budget-tracker](https://github.com/kirill-markin/expense-budget-tracker) |

---

## 5. Pipeline de Generación

### Pipeline completo: Un input, múltiples outputs

```python
class AssetFactory:
    """Genera un bundle completo de assets desde un solo tema."""

    def __init__(self, theme: str, niche: str, target_audience: str):
        self.theme = theme
        self.niche = niche
        self.target = target_audience
        self.assets = {}

    async def generate_all(self):
        """Genera todos los assets en paralelo."""
        tasks = [
            self.generate_pdf_planner(),
            self.generate_excel_tracker(),
            self.generate_notion_template(),
            self.generate_canva_templates(),
            self.generate_svg_bundle(),
            self.generate_sticker_sheet(),
            self.generate_coloring_book(),
            self.generate_journal(),
            self.generate_trackers(),
        ]
        results = await asyncio.gather(*tasks)
        return {k: v for k, v in results}

    async def generate_pdf_planner(self):
        """Genera planner PDF con ReportLab."""
        # 1. AI genera estructura/layout
        # 2. ReportLab renderiza PDF
        # 3. Añade branding
        pass

    async def generate_excel_tracker(self):
        """Genera Excel tracker con openpyxl."""
        # 1. AI genera categorías y fórmulas
        # 2. openpyxl crea workbook con styling
        # 3. Añade conditional formatting
        pass

    async def generate_notion_template(self):
        """Genera estructura Notion + guía PDF."""
        # 1. AI genera estructura de páginas
        # 2. Crear template en Notion (manual o API)
        # 3. Generar PDF con instrucciones + link
        pass

    async def generate_canva_templates(self):
        """Genera templates para Open Design o Canva links."""
        # 1. AI genera conceptos de diseño
        # 2. Open Design API crea templates
        # 3. Export PNG/PDF previews
        pass

    async def generate_svg_bundle(self):
        """Genera bundle de SVGs."""
        # 1. AI genera prompts de iconos
        # 2. OmniSVG o Recraft genera SVGs
        # 3. Post-procesa en Inkscape (opcional)
        # 4. Crea bundle con PNG transparente
        pass

    async def generate_sticker_sheet(self):
        """Genera sticker sheet imprimible."""
        # 1. StickerForge genera stickers individuales
        # 2. ReportLab ensambla sticker sheet PDF
        # 3. Añade guía de corte
        pass

    async def generate_coloring_book(self):
        """Genera coloring book PDF."""
        # 1. AI genera prompts de imágenes
        # 2. Edge detection → coloring pages
        # 3. Ensambla PDF de 30-50 páginas
        pass

    async def generate_journal(self):
        """Genera journal PDF."""
        # 1. AI genera prompts y estructura
        # 2. ReportLab crea páginas repetidas
        # 3. Añade cover page + instrucciones
        pass

    async def generate_trackers(self):
        """Genera múltiples trackers PDF."""
        # 1. Genera habit tracker
        # 2. Genera mood tracker
        # 3. Genera progress tracker
        # 4. Bundle en un solo PDF o separados
        pass
```

---

## 6. Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ASSET FACTORY STACK                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   INPUT     │  │  AI ENGINE  │  │  GENERATORS │  │  EXPORT   │ │
│  │             │  │             │  │             │  │           │ │
│  │ Theme/Niche │  │ GPT/Claude  │  │ ReportLab   │  │ PDF       │ │
│  │ Keywords    │  │ Gemini      │  │ openpyxl    │  │ Excel     │ │
│  │ Audience    │  │ Local LLMs  │  │ svg.py      │  │ SVG       │ │
│  │ Style prefs │  │             │  │ Pillow      │  │ PNG       │ │
│  └─────────────┘  └─────────────┘  │ Open Design │  │ Canva     │ │
│                                     │ API         │  │ Notion    │ │
│                                     └─────────────┘  └───────────┘ │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  TEMPLATES  │  │   ASSETS    │  │   QUEUE     │  │  STORAGE  │ │
│  │             │  │             │  │             │  │           │ │
│  │ PDF layouts │  │ Icon sets   │  │ BullMQ      │  │ S3/Local  │ │
│  │ Excel styles│  │ Fonts       │  │ Jobs        │  │ CDN       │ │
│  │ SVG bases   │  │ Mockups     │  │ Batch proc  │  │ Cache     │ │
│  │ Color palettes│ Patterns    │  │ Retry logic │  │ Backup    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Dependencias Python

```txt
# PDF Generation
reportlab>=4.0.0
fpdf2>=2.7.0
weasyprint>=60.0

# Excel Generation
openpyxl>=3.1.0
openpyxl-templates>=0.2.0
xlsxwriter>=3.1.0

# Image Processing
Pillow>=10.0.0
opencv-python>=4.8.0

# SVG Generation
svg.py>=1.4.0

# HTTP/API
httpx>=0.25.0
aiohttp>=3.9.0

# AI/LLM
openai>=1.0.0
anthropic>=0.8.0

# Utilities
pydantic>=2.0.0
python-dotenv>=1.0.0
```

---

## 7. Roadmap

### Fase 1: Core Engine (Semanas 1-2)
- [ ] Clase `AssetFactory` con arquitectura base
- [ ] Sistema de templates parametrizables
- [ ] Generador PDF base (ReportLab)
- [ ] Generador Excel base (openpyxl)

### Fase 2: PDF Assets (Semanas 3-4)
- [ ] Planner generator (daily, weekly, monthly)
- [ ] Tracker generator (habit, mood, budget)
- [ ] Journal generator (prompts, lined pages)
- [ ] Coloring book generator (edge detection)
- [ ] Sticker sheet layout generator

### Fase 3: Digital Assets (Semanas 5-6)
- [ ] SVG bundle generator
- [ ] Excel template generator (formulas, styling)
- [ ] Notion template structure generator
- [ ] Canva/Open Design template generator

### Fase 4: AI Integration (Semanas 7-8)
- [ ] AI content generation (prompts, titles, descriptions)
- [ ] AI image generation (Midjourney/Flux/DALL-E)
- [ ] AI SVG generation (OmniSVG/Recraft)
- [ ] AI sticker generation (StickerForge pattern)

### Fase 5: Pipeline Completo (Semanas 9-10)
- [ ] Single-input multi-output pipeline
- [ ] Batch generation (10+ themes simultáneos)
- [ ] Preview generation (thumbnails, mockups)
- [ ] Export bundle (zip con todos los assets)
- [ ] Integración con KDP uploader
- [ ] Integración con Etsy listing creator

---

## 8. Fuentes

### Repositorios

- [georgiastuart/planner-generator-python](https://github.com/georgiastuart/planner-generator-python)
- [SverkerSbrg/openpyxl-templates](https://github.com/SverkerSbrg/openpyxl-templates)
- [thendralmagudapathi/Engineering-Data-Sheet-Generator](https://github.com/thendralmagudapathi/Engineering-Data-Sheet-Generator)
- [mathisarends/notionary](https://github.com/mathisarends/notionary)
- [SwordAndTea/notion-to-md-py](https://github.com/SwordAndTea/notion-to-md-py)
- [looorent/notion-exporter](https://github.com/looorent/notion-exporter)
- [clawnify/open-design](https://github.com/clawnify/open-design)
- [penpot/penpot](https://github.com/penpot/penpot)
- [orsinium-labs/svg.py](https://github.com/orsinium-labs/svg.py)
- [OmniSVG/OmniSVG](https://github.com/OmniSVG/OmniSVG)
- [seeb4coding/SVG-ORA-Studio](https://github.com/seeb4coding/SVG-ORA-Studio)
- [patangal/StickerForge](https://github.com/patangal/StickerForge)
- [Cfomodz/Auto-Sticker-Generator](https://github.com/Cfomodz/Auto-Sticker-Generator)
- [ntaylor-86/Sticker-Generator](https://github.com/ntaylor-86/Sticker-Generator)
- [JYMOH001/Puzzle-Book-Generator](https://github.com/JYMOH001/Puzzle-Book-Generator)
- [gsethi2409/GsColorbook](https://github.com/gsethi2409/GsColorbook)
- [codebyahmed/coloring-book-creator](https://github.com/codebyahmed/coloring-book-creator)
- [opethef10/habit_tracker](https://github.com/opethef10/habit_tracker)
- [multiplicit-com/Office2KDP](https://github.com/multiplicit-com/Office2KDP)

### Artículos y Recursos

- [How to Generate PDF Using ReportLab](https://pdfnoodle.com/blog/how-to-generate-pdf-from-html-using-reportlab-in-python)
- [Top 10 Python PDF generator libraries](https://www.nutrient.io/blog/top-10-ways-to-generate-pdfs-in-python/)
- [openpyxl vs pandas for excel automation](https://ajmani.dev/openpyxl-vs-pandas-for-excel-automation/)
- [Notion Markdown Content API (Feb 2026)](https://www.whalesync.com/blog/how-to-export-notion-pages-to-markdown)
- [Best Open Source Canva Alternatives 2026](https://rigorousthemes.com/blog/best-open-source-canva-alternatives/)
- [Open Design — API Docs](https://github.com/clawnify/open-design)
- [Sell Digital Art on Etsy — SVG Guide](https://autokeyworder.com/blog/ai-income-blueprint-etsy/)
- [CalcBE Habit Tracker Generator](https://calcbe.com/en/tools/habit-tracker-paper/)
- [Layerre — Canva API Alternative](https://layerre.com/)
- [Templated.io — Canva Alternative API](https://templated.io/)

---

*Documento generado para peluguau.com — Groomly ecosystem*
