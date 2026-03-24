import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { hashPassword } from '../services/auth.service';

const router = Router();

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    role: z.enum(['ADMIN', 'PM', 'DEVELOPER']),
  }),
});

// GET /api/users — Admin only
router.get('/', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/users/developers — Admin + PM (for task assignment)
router.get('/developers', authenticate, authorize('ADMIN', 'PM'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const developers = await prisma.user.findMany({
      where: { role: 'DEVELOPER' },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: developers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch developers' });
  }
});

// GET /api/users/:id — Admin only
router.get('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// POST /api/users — Admin only
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createUserSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, name, role } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, error: 'Email already in use' });
        return;
      }
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }
);

// DELETE /api/users/:id — Admin only
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

export default router;
