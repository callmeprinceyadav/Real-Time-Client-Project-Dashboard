import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { getIO } from '../socket';

const router = Router();

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    projectId: z.string().uuid(),
    assignedToId: z.string().uuid().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueDate: z.string().optional(),
  }),
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueDate: z.string().nullable().optional(),
  }),
});

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

// GET /api/tasks — with filters via query params
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, priority, dueDateFrom, dueDateTo, projectId } = req.query;

    let where: any = {};

    // Role-based data isolation
    if (user.role === 'DEVELOPER') {
      where.assignedToId = user.id;
    } else if (user.role === 'PM') {
      where.project = { createdById: user.id };
    }
    // ADMIN sees all

    // Apply filters
    if (projectId) where.projectId = projectId as string;
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom as string);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo as string);
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        activityLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    // Developers can only see their own tasks
    if (user.role === 'DEVELOPER' && task.assignedToId !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // PMs can only see tasks in their projects
    if (user.role === 'PM' && task.project.createdById !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch task' });
  }
});

// POST /api/tasks
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'PM'),
  validate(createTaskSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { title, description, projectId, assignedToId, status, priority, dueDate } = req.body;

      // Verify project ownership for PMs
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }
      if (user.role === 'PM' && project.createdById !== user.id) {
        res.status(403).json({ success: false, error: 'Cannot add tasks to other PM\'s projects' });
        return;
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          projectId,
          assignedToId,
          status: status || 'TODO',
          priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      // Create activity log
      const activityLog = await prisma.activityLog.create({
        data: {
          action: 'TASK_CREATED',
          details: `${user.name} created task "${title}"`,
          taskId: task.id,
          projectId,
          userId: user.id,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      // Emit WebSocket event
      try {
        const io = getIO();
        io.to(`project:${projectId}`).emit('activityFeed', {
          ...activityLog,
          task: { id: task.id, title: task.title },
        });
        io.to('global').emit('activityFeed', {
          ...activityLog,
          task: { id: task.id, title: task.title },
        });
      } catch {}

      // If assigned to a developer, create notification
      if (assignedToId) {
        const notification = await prisma.notification.create({
          data: {
            type: 'TASK_ASSIGNED',
            message: `${user.name} assigned you to task "${title}"`,
            userId: assignedToId,
            relatedTaskId: task.id,
          },
        });
        try {
          const io = getIO();
          io.to(`user:${assignedToId}`).emit('notification', notification);
        } catch {}
      }

      res.status(201).json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create task' });
    }
  }
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  authenticate,
  validate(updateTaskSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const taskId = req.params.id;

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: { select: { id: true, name: true, createdById: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      if (!existingTask) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      // Role enforcement
      if (user.role === 'DEVELOPER') {
        if (existingTask.assignedToId !== user.id) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }
        // Developers can only update status
        const allowedFields = ['status'];
        const requestedFields = Object.keys(req.body);
        const disallowed = requestedFields.filter((f) => !allowedFields.includes(f));
        if (disallowed.length > 0) {
          res.status(403).json({ success: false, error: 'Developers can only update task status' });
          return;
        }
      }

      if (user.role === 'PM' && existingTask.project.createdById !== user.id) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      // Build update data
      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.assignedToId !== undefined) updateData.assignedToId = req.body.assignedToId;
      if (req.body.priority !== undefined) updateData.priority = req.body.priority;
      if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

      // Handle status change with activity log
      const statusChanged = req.body.status && req.body.status !== existingTask.status;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.status === 'DONE') updateData.isOverdue = false;

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      // Create activity log for status change
      if (statusChanged) {
        const oldLabel = statusLabels[existingTask.status] || existingTask.status;
        const newLabel = statusLabels[req.body.status] || req.body.status;
        const details = `${user.name} moved "${existingTask.title}" from ${oldLabel} → ${newLabel}`;

        const activityLog = await prisma.activityLog.create({
          data: {
            action: 'TASK_STATUS_CHANGED',
            details,
            taskId,
            projectId: existingTask.projectId,
            userId: user.id,
          },
          include: { user: { select: { id: true, name: true } } },
        });

        // Emit WebSocket event
        try {
          const io = getIO();
          io.to(`project:${existingTask.projectId}`).emit('activityFeed', {
            ...activityLog,
            task: { id: existingTask.id, title: existingTask.title },
          });
          io.to('global').emit('activityFeed', {
            ...activityLog,
            task: { id: existingTask.id, title: existingTask.title },
          });

          // Notify assigned developer's personal feed
          if (existingTask.assignedToId) {
            io.to(`user:${existingTask.assignedToId}`).emit('taskUpdate', {
              taskId,
              newStatus: req.body.status,
              updatedBy: user.name,
            });
          }
        } catch {}

        // If moved to IN_REVIEW, notify the PM
        if (req.body.status === 'IN_REVIEW' && existingTask.project.createdById) {
          const notification = await prisma.notification.create({
            data: {
              type: 'TASK_IN_REVIEW',
              message: `${user.name} moved "${existingTask.title}" to In Review`,
              userId: existingTask.project.createdById,
              relatedTaskId: taskId,
            },
          });
          try {
            const io = getIO();
            io.to(`user:${existingTask.project.createdById}`).emit('notification', notification);
          } catch {}
        }
      }

      // If task was reassigned, notify new assignee
      if (req.body.assignedToId && req.body.assignedToId !== existingTask.assignedToId) {
        const notification = await prisma.notification.create({
          data: {
            type: 'TASK_ASSIGNED',
            message: `${user.name} assigned you to task "${existingTask.title}"`,
            userId: req.body.assignedToId,
            relatedTaskId: taskId,
          },
        });
        try {
          const io = getIO();
          io.to(`user:${req.body.assignedToId}`).emit('notification', notification);
        } catch {}

        const activityLog = await prisma.activityLog.create({
          data: {
            action: 'TASK_REASSIGNED',
            details: `${user.name} assigned "${existingTask.title}" to a new developer`,
            taskId,
            projectId: existingTask.projectId,
            userId: user.id,
          },
          include: { user: { select: { id: true, name: true } } },
        });

        try {
          const io = getIO();
          io.to(`project:${existingTask.projectId}`).emit('activityFeed', {
            ...activityLog,
            task: { id: existingTask.id, title: existingTask.title },
          });
        } catch {}
      }

      res.json({ success: true, data: updatedTask });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update task' });
    }
  }
);

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'PM'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { createdById: true } } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    if (user.role === 'PM' && task.project.createdById !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

// GET /api/tasks/:id/activity — activity log for a specific task
router.get('/:id/activity', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { assignedToId: true, project: { select: { createdById: true } } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    if (user.role === 'DEVELOPER' && task.assignedToId !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (user.role === 'PM' && task.project.createdById !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const activities = await prisma.activityLog.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch activity log' });
  }
});

export default router;
