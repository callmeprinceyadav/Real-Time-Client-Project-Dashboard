import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { initializeSocket } from './socket';
import { startOverdueChecker } from './jobs/overdueChecker';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import clientRoutes from './routes/clients.routes';
import projectRoutes from './routes/projects.routes';
import taskRoutes from './routes/tasks.routes';
import notificationRoutes from './routes/notifications.routes';
import dashboardRoutes from './routes/dashboard.routes';
import activityRoutes from './routes/activity.routes';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start overdue task checker
startOverdueChecker();

server.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
});

export default app;
