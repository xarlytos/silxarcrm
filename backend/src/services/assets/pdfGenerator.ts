import { spawn } from 'child_process';
import path from 'path';

const SCRIPTS_DIR = path.resolve(__dirname, '../../../scripts/assets');

/**
 * Genera un PDF ejecutando un script de Python.
 *
 * @param template - Tipo de template: 'planner', 'journal', 'tracker', 'coloring_book', 'sticker_sheet'
 * @param params - Parámetros del template
 * @returns Buffer del PDF generado
 */
export async function generatePdfFromPython(
  template: string,
  params: Record<string, any>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Usar un script Python inline para no depender de archivos externos
    const pythonScript = getPythonScript(template, params);

    const python = spawn('python', ['-c', pythonScript]);
    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    python.stdout.on('data', (chunk) => chunks.push(chunk));
    python.stderr.on('data', (chunk) => errorChunks.push(chunk));

    python.on('close', (code) => {
      if (code !== 0) {
        const errMsg = Buffer.concat(errorChunks).toString('utf-8');
        return reject(new Error(`Python exit ${code}: ${errMsg}`));
      }
      resolve(Buffer.concat(chunks));
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });
  });
}

function getPythonScript(template: string, params: Record<string, any>): string {
  const title = (params.title || 'Untitled').replace(/"/g, '\\"');
  const nicho = (params.nicho || '').replace(/"/g, '\\"');

  switch (template) {
    case 'planner': {
      const pages = params.pages || 50;
      return `
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

styles = getSampleStyleSheet()
title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=28, textColor=colors.HexColor('#1a1a2e'), spaceAfter=30)
heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#16213e'))

doc = SimpleDocTemplate(sys.stdout.buffer, pagesize=letter,
    rightMargin=0.6*inch, leftMargin=0.6*inch,
    topMargin=0.6*inch, bottomMargin=0.6*inch)

story = []
story.append(Paragraph("${title}", title_style))
story.append(Paragraph("Nicho: ${nicho}", styles['Normal']))
story.append(Spacer(1, 0.3*inch))

days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
for week in range(min(${pages} // 7, 10)):
    story.append(Paragraph(f"Semana {week + 1}", heading_style))
    data = [["Día", "Tareas / Prioridades", "Notas"]]
    for day in days:
        data.append([day, "", ""])
    t = Table(data, colWidths=[1.1*inch, 2.4*inch, 2.4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 12),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,1), (-1,-1), 8),
        ('BOTTOMPADDING', (0,1), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.2*inch))
    if week < min(${pages} // 7, 10) - 1:
        story.append(PageBreak())

doc.build(story)
`;
    }

    case 'journal': {
      const jpages = params.pages || 120;
      return `
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

styles = getSampleStyleSheet()
title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=26, textColor=colors.HexColor('#1a1a2e'), spaceAfter=20)
prompt_style = ParagraphStyle('PromptStyle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#555555'), spaceAfter=12)
line_style = ParagraphStyle('LineStyle', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#aaaaaa'))

doc = SimpleDocTemplate(sys.stdout.buffer, pagesize=letter,
    rightMargin=0.7*inch, leftMargin=0.7*inch,
    topMargin=0.7*inch, bottomMargin=0.7*inch)

story = []
story.append(Paragraph("${title}", title_style))
story.append(Paragraph("Nicho: ${nicho}", styles['Normal']))
story.append(Spacer(1, 0.4*inch))

prompts = [
    "¿Qué te hace sentir agradecido/a hoy?",
    "Describe un momento que te haya sonreído hoy.",
    "¿Qué aprendizaje tuviste esta semana?",
    "Escribe sobre un objetivo que quieras alcanzar.",
    "¿Cómo te sientes en este momento y por qué?",
    "Describe a alguien que admires y qué aprendes de esa persona.",
    "¿Qué te gustaría hacer diferente mañana?",
]

for i in range(min(${jpages}, 50)):
    story.append(Paragraph(f"Entrada {i + 1}", styles['Heading3']))
    story.append(Paragraph(prompts[i % len(prompts)], prompt_style))
    for _ in range(12):
        story.append(Paragraph("_" * 70, line_style))
        story.append(Spacer(1, 14))
    if i < min(${jpages}, 50) - 1:
        story.append(PageBreak())

doc.build(story)
`;
    }

    case 'tracker': {
      const trackerType = params.trackerType || 'habit';
      return `
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

styles = getSampleStyleSheet()
title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#1a1a2e'), spaceAfter=20)

doc = SimpleDocTemplate(sys.stdout.buffer, pagesize=letter,
    rightMargin=0.5*inch, leftMargin=0.5*inch,
    topMargin=0.5*inch, bottomMargin=0.5*inch)

story = []
story.append(Paragraph("${title}", title_style))
story.append(Paragraph("Tracker: ${trackerType} | Nicho: ${nicho}", styles['Normal']))
story.append(Spacer(1, 0.3*inch))

habits = ["Ejercicio", "Meditación", "Lectura", "Agua 2L", "Sin azúcar"]
days = list(range(1, 32))

story.append(Paragraph("Habit Tracker — 31 días", styles['Heading3']))
story.append(Spacer(1, 0.1*inch))

data = [["Hábito"] + [str(d) for d in days]]
for habit in habits:
    data.append([habit] + ["" for _ in days])

colWidths = [1.4*inch] + [0.55*inch for _ in days]
t = Table(data, colWidths=colWidths)
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#333333')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ('FONTSIZE', (0,0), (-1,0), 9),
    ('BOTTOMPADDING', (0,0), (-1,0), 8),
    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
    ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
    ('FONTSIZE', (0,1), (0,-1), 9),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(t)

doc.build(story)
`;
    }

    case 'coloring_book': {
      const cbPages = params.pages || 30;
      return `
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from io import BytesIO

styles = getSampleStyleSheet()

doc = SimpleDocTemplate(sys.stdout.buffer, pagesize=letter,
    rightMargin=0.5*inch, leftMargin=0.5*inch,
    topMargin=0.5*inch, bottomMargin=0.5*inch)

story = []
story.append(Paragraph("${title}", styles['Title']))
story.append(Paragraph("Nicho: ${nicho}", styles['Normal']))
story.append(Spacer(1, 0.3*inch))

shapes = [
    ("Círculo", "Dibuja y colorea un círculo perfecto."),
    ("Estrella", "Colorea esta estrella con tus colores favoritos."),
    ("Flor", "Dale vida a esta flor con vibrantes colores."),
    ("Casa", "Colorea esta casa soñada."),
    ("Árbol", "Un árbol espera tus colores."),
    ("Corazón", "Colorea con amor."),
    ("Sol", "El sol brilla para ti."),
    ("Luna", "La luna te acompaña."),
]

for i in range(min(${cbPages}, 20)):
    shape = shapes[i % len(shapes)]
    story.append(Paragraph(f"Página {i + 1}: {shape[0]}", styles['Heading3']))
    story.append(Paragraph(shape[1], styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("[Espacio para colorear]", styles['Normal']))
    if i < min(${cbPages}, 20) - 1:
        story.append(PageBreak())

doc.build(story)
`;
    }

    case 'sticker_sheet': {
      return `
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch

styles = getSampleStyleSheet()

doc = SimpleDocTemplate(sys.stdout.buffer, pagesize=letter,
    rightMargin=0.5*inch, leftMargin=0.5*inch,
    topMargin=0.5*inch, bottomMargin=0.5*inch)

story = []
story.append(Paragraph("${title}", styles['Title']))
story.append(Paragraph("Nicho: ${nicho}", styles['Normal']))
story.append(Spacer(1, 0.2*inch))

stickers = ["Motivación", "Fitness", "Salud", "Bienestar", "Logro"] * 4
cols = 4
rows = 5

data = []
idx = 0
for r in range(rows):
    row = []
    for c in range(cols):
        row.append(stickers[idx] if idx < len(stickers) else "")
        idx += 1
    data.append(row)

t = Table(data, colWidths=[1.8*inch]*cols, rowHeights=[1.4*inch]*rows)
t.setStyle(TableStyle([
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 1, colors.grey),
    ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
    ('FONTSIZE', (0,0), (-1,-1), 12),
    ('TOPPADDING', (0,0), (-1,-1), 10),
    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
]))
story.append(t)
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Instrucciones: Imprime en papel adhesivo y recorta.", styles['Normal']))

doc.build(story)
`;
    }

    default:
      throw new Error(`Template PDF no soportado: ${template}`);
  }
}
