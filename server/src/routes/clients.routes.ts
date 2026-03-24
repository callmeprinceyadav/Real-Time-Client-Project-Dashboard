import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const clientSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    company: z.string().min(2),
    phone: z.string().optional(),
  }),
});

// GET /api/clients
router.get('/', authenticate, authorize('ADMIN', 'PM'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, authorize('ADMIN', 'PM'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { projects: { select: { id: true, name: true, status: true } } },
    });
    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch client' });
  }
});

// POST /api/clients
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'PM'),
  validate(clientSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, company, phone } = req.body;
      const existing = await prisma.client.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, error: 'Client email already exists' });
        return;
      }
      const client = await prisma.client.create({ data: { name, email, company, phone } });
      res.status(201).json({ success: true, data: client });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create client' });
    }
  }
);

// PUT /api/clients/:id
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'PM'),
  validate(clientSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const client = await prisma.client.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: client });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update client' });
    }
  }
);

// DELETE /api/clients/:id — Admin only
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete client' });
  }
});

export default router;
