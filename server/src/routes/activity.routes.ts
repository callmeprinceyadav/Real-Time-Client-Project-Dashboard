import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/activity — Role-filtered activity feed with missed events support
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { since, limit } = req.query;
    const take = Math.min(parseInt(limit as string) || 20, 50);

    let where: any = {};

    // Role-based filtering
    if (user.role === 'PM') {
      where.project = { createdById: user.id };
    } else if (user.role === 'DEVELOPER') {
      where.task = { assignedToId: user.id };
    }
    // ADMIN — no filter (global feed)

    // Support fetching missed events since a timestamp
    if (since) {
      where.createdAt = { gt: new Date(since as string) };
    }

    const activities = await prisma.activityLog.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch activity feed' });
  }
});

export default router;
