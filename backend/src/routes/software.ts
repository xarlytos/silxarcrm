import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listSoftwares,
  getSoftwareBySlug,
  getSoftwareById,
  createSoftware,
  updateSoftware,
  deleteSoftware,
} from '../services/softwareService';

const router = Router();

router.use(authMiddleware);

// GET /api/softwares - Listar todos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const softwares = await listSoftwares();
    res.json({ success: true, data: softwares });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/softwares/:slug - Obtener por slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const software = await getSoftwareBySlug(req.params.slug);
    if (!software) {
      return res.status(404).json({ success: false, error: 'Software no encontrado' });
    }
    res.json({ success: true, data: software });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/softwares - Crear
router.post('/', async (req: Request, res: Response) => {
  try {
    const software = await createSoftware(req.body);
    res.status(201).json({ success: true, data: software });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/softwares/:id - Actualizar
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const software = await updateSoftware(req.params.id, req.body);
    res.json({ success: true, data: software });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/softwares/:id - Eliminar
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteSoftware(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
