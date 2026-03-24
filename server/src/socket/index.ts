import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';

let io: SocketIOServer;

// Track online users: userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const getOnlineUserCount = (): number => {
  return onlineUsers.size;
};

export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT authentication middleware for Socket.io
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret) as {
        id: string;
        email: string;
        role: string;
        name: string;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user;
    if (!user) return;

    console.log(`[Socket] ${user.name} (${user.role}) connected`);

    // Track online user
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
    }
    onlineUsers.get(user.id)!.add(socket.id);

    // Join personal room for notifications
    socket.join(`user:${user.id}`);

    // Admin joins global room
    if (user.role === 'ADMIN') {
      socket.join('global');
    }

    // PM joins rooms for their projects
    if (user.role === 'PM') {
      const projects = await prisma.project.findMany({
        where: { createdById: user.id },
        select: { id: true },
      });
      projects.forEach((p) => socket.join(`project:${p.id}`));
    }

    // Developer joins rooms for projects they have tasks in
    if (user.role === 'DEVELOPER') {
      const tasks = await prisma.task.findMany({
        where: { assignedToId: user.id },
        select: { projectId: true },
        distinct: ['projectId'],
      });
      tasks.forEach((t) => socket.join(`project:${t.projectId}`));
    }

    // Broadcast updated online count
    io.emit('onlineUsers', {
      count: onlineUsers.size,
      userIds: getOnlineUserIds(),
    });

    // Handle client requesting missed events
    socket.on('getMissedEvents', async (data: { lastSeenAt: string }) => {
      try {
        const since = new Date(data.lastSeenAt);
        let where: any = { createdAt: { gt: since } };

        if (user.role === 'PM') {
          where.project = { createdById: user.id };
        } else if (user.role === 'DEVELOPER') {
          where.task = { assignedToId: user.id };
        }

        const missedEvents = await prisma.activityLog.findMany({
          where,
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        });

        socket.emit('missedEvents', missedEvents);
      } catch (error) {
        console.error('[Socket] Error fetching missed events:', error);
      }
    });

    // Handle joining a specific project room (for viewing project detail page)
    socket.on('joinProject', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leaveProject', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] ${user.name} disconnected`);

      const userSockets = onlineUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
        }
      }

      io.emit('onlineUsers', {
        count: onlineUsers.size,
        userIds: getOnlineUserIds(),
      });
    });
  });

  return io;
};
