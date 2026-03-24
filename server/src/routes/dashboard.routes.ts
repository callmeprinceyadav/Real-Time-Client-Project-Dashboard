import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/dashboard
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    if (user.role === 'ADMIN') {
      const [
        totalProjects,
        totalTasks,
        tasksByStatus,
        overdueCount,
        recentActivity,
        tasksByPriority,
      ] = await Promise.all([
        prisma.project.count(),
        prisma.task.count(),
        prisma.task.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.task.count({ where: { isOverdue: true } }),
        prisma.activityLog.findMany({
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        }),
        prisma.task.groupBy({ by: ['priority'], _count: { id: true } }),
      ]);

      res.json({
        success: true,
        data: {
          role: 'ADMIN',
          totalProjects,
          totalTasks,
          tasksByStatus: tasksByStatus.map((s) => ({ status: s.status, count: s._count.id })),
          tasksByPriority: tasksByPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
          overdueCount,
          recentActivity,
        },
      });
    } else if (user.role === 'PM') {
      const now = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(now.getDate() + 7);

      const [projects, tasksByPriority, tasksByStatus, upcomingDueTasks, overdueCount, recentActivity] = await Promise.all([
        prisma.project.findMany({
          where: { createdById: user.id },
          include: {
            client: { select: { name: true } },
            _count: { select: { tasks: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.groupBy({
          by: ['priority'],
          where: { project: { createdById: user.id } },
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ['status'],
          where: { project: { createdById: user.id } },
          _count: { id: true },
        }),
        prisma.task.findMany({
          where: {
            project: { createdById: user.id },
            dueDate: { gte: now, lte: weekFromNow },
            status: { not: 'DONE' },
          },
          include: {
            assignedTo: { select: { name: true } },
            project: { select: { name: true } },
          },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.task.count({ where: { project: { createdById: user.id }, isOverdue: true } }),
        prisma.activityLog.findMany({
          where: { project: { createdById: user.id } },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          role: 'PM',
          projects,
          tasksByPriority: tasksByPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
          tasksByStatus: tasksByStatus.map((s) => ({ status: s.status, count: s._count.id })),
          upcomingDueTasks,
          overdueCount,
          recentActivity,
        },
      });
    } else {
      // DEVELOPER
      const [assignedTasks, recentActivity] = await Promise.all([
        prisma.task.findMany({
          where: { assignedToId: user.id },
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        }),
        prisma.activityLog.findMany({
          where: { task: { assignedToId: user.id } },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        }),
      ]);

      const tasksByStatus: Record<string, number> = {};
      assignedTasks.forEach((t) => {
        tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          role: 'DEVELOPER',
          assignedTasks,
          tasksByStatus: Object.entries(tasksByStatus).map(([status, count]) => ({ status, count })),
          overdueCount: assignedTasks.filter((t) => t.isOverdue).length,
          recentActivity,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

export default router;
