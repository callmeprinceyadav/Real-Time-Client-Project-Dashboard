import cron from 'node-cron';
import prisma from '../config/database';
import { getIO } from '../socket';

export const startOverdueChecker = (): void => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[Cron] Checking for overdue tasks...');

      const now = new Date();
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { not: 'DONE' },
          isOverdue: false,
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      if (overdueTasks.length === 0) {
        console.log('[Cron] No new overdue tasks found.');
        return;
      }

      console.log(`[Cron] Found ${overdueTasks.length} newly overdue tasks.`);

      for (const task of overdueTasks) {
        // Mark as overdue
        await prisma.task.update({
          where: { id: task.id },
          data: { isOverdue: true },
        });

        // Create activity log
        const activityLog = await prisma.activityLog.create({
          data: {
            action: 'TASK_OVERDUE',
            details: `Task "${task.title}" is now overdue`,
            taskId: task.id,
            projectId: task.projectId,
            userId: task.assignedToId || 'system',
          },
          include: {
            user: { select: { id: true, name: true } },
          },
        });

        // Emit WebSocket event
        try {
          const io = getIO();
          io.to(`project:${task.projectId}`).emit('activityFeed', {
            ...activityLog,
            task: { id: task.id, title: task.title },
          });
          io.to('global').emit('activityFeed', {
            ...activityLog,
            task: { id: task.id, title: task.title },
          });

          // Notify the assigned developer
          if (task.assignedToId) {
            const notification = await prisma.notification.create({
              data: {
                type: 'TASK_OVERDUE',
                message: `Your task "${task.title}" is now overdue`,
                userId: task.assignedToId,
                relatedTaskId: task.id,
              },
            });
            io.to(`user:${task.assignedToId}`).emit('notification', notification);
          }
        } catch {}
      }

      console.log(`[Cron] Processed ${overdueTasks.length} overdue tasks.`);
    } catch (error) {
      console.error('[Cron] Error checking overdue tasks:', error);
    }
  });

  console.log('[Cron] Overdue task checker started (every 15 minutes)');
};
