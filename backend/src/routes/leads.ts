import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addHistorial,
  changeLeadStatus,
  importLeadsFromCSV,
  getLeadStats,
  convertLeadToCliente,
  listLeadSectores,
  CSVRow,
} from '../services/leadService';
import { LeadEstado } from '@prisma/client';
import { buscarPaginasAmarillas, getGoogleMapsSearchUrl, getPaginasAmarillasUrl } from '../services/scrapingService';

const router = Router();

router.use(authMiddleware);

// GET /api/leads - List leads
router.get('/', async (req: Request, res: Response) => {
  try {
    const parseBool = (v: any): boolean | undefined => {
      if (v === undefined || v === '') return undefined;
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0') return false;
      return undefined;
    };
    const tipoTelefonoRaw = req.query.tipoTelefono as string | undefined;
    const tipoTelefono = tipoTelefonoRaw === 'fijo' || tipoTelefonoRaw === 'movil' ? tipoTelefonoRaw : undefined;
    const parseTagList = (v: any): string[] | undefined => {
      if (!v) return undefined;
      const parts = (Array.isArray(v) ? v : String(v).split(','))
        .map((s: any) => String(s).trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    };

    const result = await listLeads({
      estado: req.query.estado as LeadEstado,
      prioridad: req.query.prioridad as any,
      origen: req.query.origen as string,
      softwareId: req.query.softwareId as string,
      asignadoA: req.query.asignadoA ? parseInt(req.query.asignadoA as string) : undefined,
      search: req.query.search as string,
      desde: req.query.desde as string,
      hasta: req.query.hasta as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      tipoTelefono,
      hasTelefono: parseBool(req.query.hasTelefono),
      hasEmail: parseBool(req.query.hasEmail),
      sector: (req.query.sector as string) || undefined,
      excludeTags: parseTagList(req.query.excludeTags),
      includeTags: parseTagList(req.query.includeTags),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Leads list error:', error);
    res.status(500).json({ error: 'Error obteniendo leads' });
  }
});

// GET /api/leads/stats - Lead statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const parseTagListLocal = (v: any): string[] | undefined => {
      if (!v) return undefined;
      const parts = (Array.isArray(v) ? v : String(v).split(','))
        .map((s: any) => String(s).trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    };
    const stats = await getLeadStats(req.query.softwareId as string, {
      excludeTags: parseTagListLocal(req.query.excludeTags),
      includeTags: parseTagListLocal(req.query.includeTags),
    });
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Leads stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// GET /api/leads/sectores - Sectores distintos (de metadata.iaClassification.sector)
router.get('/sectores', async (req: Request, res: Response) => {
  try {
    const sectores = await listLeadSectores(req.query.softwareId as string);
    res.json({ success: true, data: sectores });
  } catch (error) {
    logger.error('Leads sectores error:', error);
    res.status(500).json({ error: 'Error obteniendo sectores' });
  }
});

// GET /api/leads/buscar - Search leads from external sources
router.get('/buscar', async (req: Request, res: Response) => {
  try {
    const { q, ciudad, fuente } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'El parámetro q (término de búsqueda) es requerido' });
      return;
    }

    const ciudadStr = typeof ciudad === 'string' ? ciudad : undefined;

    if (fuente === 'paginas_amarillas') {
      const results = await buscarPaginasAmarillas(q, ciudadStr);
      res.json({ success: true, data: { results, fuente: 'paginas_amarillas' } });
      return;
    }

    if (fuente === 'google_maps') {
      // Para Google Maps devolvemos la URL de búsqueda (el scraping directo está bloqueado)
      const url = getGoogleMapsSearchUrl(q, ciudadStr);
      res.json({ success: true, data: { url, fuente: 'google_maps' } });
      return;
    }

    // Si no se especifica fuente, buscamos en ambas
    const [paResults] = await Promise.allSettled([
      buscarPaginasAmarillas(q, ciudadStr),
    ]);

    const paData = paResults.status === 'fulfilled' ? paResults.value : [];

    res.json({
      success: true,
      data: {
        paginas_amarillas: paData,
        google_maps_url: getGoogleMapsSearchUrl(q, ciudadStr),
      },
    });
  } catch (error) {
    logger.error('Lead search error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error buscando leads' });
  }
});

// GET /api/leads/buscar-urls - Get search URLs for external sources
router.get('/buscar-urls', async (req: Request, res: Response) => {
  try {
    const { q, ciudad } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'El parámetro q es requerido' });
      return;
    }
    const ciudadStr = typeof ciudad === 'string' ? ciudad : undefined;
    res.json({
      success: true,
      data: {
        google_maps: getGoogleMapsSearchUrl(q, ciudadStr),
        paginas_amarillas: getPaginasAmarillasUrl(q, ciudadStr),
      },
    });
  } catch (error) {
    logger.error('Search URLs error:', error);
    res.status(500).json({ error: 'Error generando URLs' });
  }
});

// GET /api/leads/plantilla-csv - Download CSV template
router.get('/plantilla-csv', (_req: Request, res: Response) => {
  const headers = 'nombre,email,telefono,empresa,cargo,pais,origen,estado,prioridad,notas';
  const example = 'Juan Pérez,juan@empresa.com,+34600000000,Empresa SA,CEO,España,web,NUEVO,ALTA,Nota inicial';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-leads.csv"');
  res.send(`${headers}\n${example}`);
});

// GET /api/leads/:id - Lead detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Lead detail error:', error);
    res.status(500).json({ error: 'Error obteniendo lead' });
  }
});

// POST /api/leads - Create lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const lead = await createLead(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    logger.error('Create lead error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un lead con ese email para este software' });
      return;
    }
    res.status(500).json({ error: 'Error creando lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await updateLead(req.params.id, req.body, req.user?.userId);
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Update lead error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un lead con ese email para este software' });
      return;
    }
    res.status(500).json({ error: 'Error actualizando lead' });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteLead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete lead error:', error);
    res.status(500).json({ error: 'Error eliminando lead' });
  }
});

// POST /api/leads/:id/historial - Add history entry
router.post('/:id/historial', async (req: Request, res: Response) => {
  try {
    const { tipo, descripcion } = req.body;
    const entry = await addHistorial(req.params.id, tipo, descripcion, req.user?.userId);
    if (!entry) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    logger.error('Add historial error:', error);
    res.status(500).json({ error: 'Error agregando historial' });
  }
});

// PUT /api/leads/:id/estado - Change status
router.put('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { estado, motivo } = req.body;
    const lead = await changeLeadStatus(req.params.id, estado, req.user?.userId, motivo);
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Change status error:', error);
    res.status(500).json({ error: 'Error cambiando estado' });
  }
});

// POST /api/leads/importar-csv - Import CSV
router.post('/importar-csv', async (req: Request, res: Response) => {
  try {
    const { contenido, softwareId } = req.body;
    if (!contenido || !softwareId) {
      res.status(400).json({ error: 'Falta contenido CSV o softwareId' });
      return;
    }

    const rows = parseCSV(contenido);
    const result = await importLeadsFromCSV(rows, softwareId, req.user?.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('CSV import error:', error);
    res.status(500).json({ error: 'Error importando CSV' });
  }
});

// POST /api/leads/:id/convertir - Convert lead to cliente
router.post('/:id/convertir', async (req: Request, res: Response) => {
  try {
    const result = await convertLeadToCliente(req.params.id, req.user?.userId);
    if (!result) {
      res.status(404).json({ error: 'Lead no encontrado o ya convertido' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Convert lead error:', error);
    const message = (error as Error).message || 'Error convirtiendo lead';
    if (message.includes('no tiene email')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: 'Error convirtiendo lead' });
  }
});

function parseCSV(content: string): CSVRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || undefined;
    });
    rows.push(row as CSVRow);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export default router;
