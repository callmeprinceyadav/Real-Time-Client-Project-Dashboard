export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  createdAt?: string;
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  clientId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string; company?: string };
  createdBy?: { id: string; name: string };
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  isOverdue: boolean;
  projectId: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  assignedTo?: { id: string; name: string; email?: string };
  activityLogs?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  taskId?: string;
  projectId: string;
  userId: string;
  createdAt: string;
  user?: { id: string; name: string };
  task?: { id: string; title: string };
  project?: { id: string; name: string };
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  userId: string;
  relatedTaskId?: string;
  createdAt: string;
  relatedTask?: { id: string; title: string; projectId: string };
}

export interface DashboardData {
  role: Role;
  totalProjects?: number;
  totalTasks?: number;
  tasksByStatus?: { status: TaskStatus; count: number }[];
  tasksByPriority?: { priority: TaskPriority; count: number }[];
  overdueCount?: number;
  recentActivity?: ActivityLog[];
  projects?: Project[];
  upcomingDueTasks?: Task[];
  assignedTasks?: Task[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: { field: string; message: string }[];
}
