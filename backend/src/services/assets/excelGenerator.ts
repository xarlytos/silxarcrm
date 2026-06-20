import { spawn } from 'child_process';

/**
 * Genera un archivo Excel ejecutando un script de Python con openpyxl.
 *
 * @param template - Tipo de template: 'budget', 'tracker', 'planner'
 * @param params - Parámetros del template
 * @returns Buffer del Excel generado
 */
export async function generateExcelFromPython(
  template: string,
  params: Record<string, any>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
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

  switch (template) {
    case 'budget': {
      return `
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "Budget Tracker"

header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
header_font = Font(bold=True, color="FFFFFF", size=12)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

headers = ["Categoría", "Presupuesto", "Gasto Real", "Diferencia", "Notas"]
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center')
    cell.border = thin_border

categories = ["Vivienda", "Comida", "Transporte", "Servicios", "Ocio", "Ahorros", "Otros"]
for row, cat in enumerate(categories, 2):
    ws.cell(row=row, column=1, value=cat).border = thin_border
    ws.cell(row=row, column=2, value=0).border = thin_border
    ws.cell(row=row, column=3, value=0).border = thin_border
    diff_cell = ws.cell(row=row, column=4)
    diff_cell.value = f"=B{row}-C{row}"
    diff_cell.border = thin_border
    ws.cell(row=row, column=5, value="").border = thin_border

total_row = len(categories) + 2
ws.cell(row=total_row, column=1, value="TOTAL").font = Font(bold=True)
ws.cell(row=total_row, column=2, value=f"=SUM(B2:B{total_row-1})").font = Font(bold=True)
ws.cell(row=total_row, column=3, value=f"=SUM(C2:C{total_row-1})").font = Font(bold=True)
ws.cell(row=total_row, column=4, value=f"=SUM(D2:D{total_row-1})").font = Font(bold=True)

for col in range(1, 6):
    ws.column_dimensions[get_column_letter(col)].width = 18

ws.cell(row=len(categories) + 4, column=1, value="${title}")

wb.save(sys.stdout.buffer)
`;
    }

    case 'tracker': {
      return `
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "Habit Tracker"

header_fill = PatternFill(start_color="2E7D32", end_color="2E7D32", fill_type="solid")
header_font = Font(bold=True, color="FFFFFF", size=11)
check_fill = PatternFill(start_color="C8E6C9", end_color="C8E6C9", fill_type="solid")
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

habits = ["Ejercicio", "Meditar", "Leer 30min", "2L agua", "Sin azúcar", "Dormir 8h"]
days = list(range(1, 32))

ws.cell(row=1, column=1, value="HÁBITO").fill = header_fill
ws.cell(row=1, column=1).font = header_font
ws.cell(row=1, column=1).alignment = Alignment(horizontal='center')
ws.cell(row=1, column=1).border = thin_border

for col, day in enumerate(days, 2):
    cell = ws.cell(row=1, column=col, value=day)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center')
    cell.border = thin_border

for row, habit in enumerate(habits, 2):
    cell = ws.cell(row=row, column=1, value=habit)
    cell.font = Font(bold=True)
    cell.border = thin_border
    for col in range(2, 33):
        cell = ws.cell(row=row, column=col, value="✓")
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border

ws.column_dimensions['A'].width = 20
for col in range(2, 33):
    ws.column_dimensions[get_column_letter(col)].width = 4

ws.cell(row=len(habits) + 3, column=1, value="${title}")

wb.save(sys.stdout.buffer)
`;
    }

    case 'planner': {
      return `
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "Planner"

header_fill = PatternFill(start_color="5E35B1", end_color="5E35B1", fill_type="solid")
header_font = Font(bold=True, color="FFFFFF", size=11)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

ws.merge_cells('A1:C1')
ws.cell(row=1, column=1, value="${title}")
ws.cell(row=1, column=1).font = Font(bold=True, size=16)
ws.cell(row=1, column=1).alignment = Alignment(horizontal='center')

row = 3
for day in days:
    ws.cell(row=row, column=1, value=day).fill = header_fill
    ws.cell(row=row, column=1).font = header_font
    ws.cell(row=row, column=1).border = thin_border
    ws.cell(row=row, column=2, value="Tareas").fill = header_fill
    ws.cell(row=row, column=2).font = header_font
    ws.cell(row=row, column=2).border = thin_border
    ws.cell(row=row, column=3, value="Notas").fill = header_fill
    ws.cell(row=row, column=3).font = header_font
    ws.cell(row=row, column=3).border = thin_border
    for i in range(5):
        for c in range(1, 4):
            ws.cell(row=row + 1 + i, column=c).border = thin_border
    row += 6

ws.column_dimensions['A'].width = 15
ws.column_dimensions['B'].width = 35
ws.column_dimensions['C'].width = 35

wb.save(sys.stdout.buffer)
`;
    }

    default:
      throw new Error(`Template Excel no soportado: ${template}`);
  }
}
