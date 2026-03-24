import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const projectSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    clientId: z.string().uuid(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'ARCHIVED']).optional(),
  }),
});

// GET /api/projects
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let where: any = {};

    if (user.role === 'PM') {
      where.createdById = user.id;
    } else if (user.role === 'DEVELOPER') {
      where.tasks = { some: { assignedToId: user.id } };
    }
    // ADMIN sees all

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, company: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    // PM can only see their own projects
    if (user.role === 'PM' && project.createdById !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Developer can only see projects with tasks assigned to them
    if (user.role === 'DEVELOPER') {
      const hasAssignedTask = project.tasks.some((t) => t.assignedToId === user.id);
      if (!hasAssignedTask) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      // Filter tasks to only show the developer's tasks
      project.tasks = project.tasks.filter((t) => t.assignedToId === user.id);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

// POST /api/projects
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'PM'),
  validate(projectSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, description, clientId, status } = req.body;
      const project = await prisma.project.create({
        data: {
          name,
          description,
          clientId,
          createdById: req.user!.id,
          status: status || 'ACTIVE',
        },
        include: {
          client: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          action: 'PROJECT_CREATED',
          details: `${req.user!.name} created project "${name}"`,
          projectId: project.id,
          userId: req.user!.id,
        },
      });

      res.status(201).json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  }
);

// PUT /api/projects/:id
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'PM'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      // PM can only edit their own projects
      if (user.role === 'PM' && project.createdById !== user.id) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          description: req.body.description,
          status: req.body.status,
          clientId: req.body.clientId,
        },
        include: { client: true, createdBy: { select: { name: true } } },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  }
);

// DELETE /api/projects/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;
