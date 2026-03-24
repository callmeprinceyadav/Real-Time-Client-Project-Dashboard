import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ActivityFeed from '../components/ActivityFeed';
import { type DashboardData } from '../types';
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { onlineCount } = useSocket();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        if (res.data.success) setData(res.data.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;
  if (!data) return <div className="page-error">Failed to load dashboard</div>;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your projects</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        {user?.role === 'ADMIN' && (
          <>
            <div className="stat-card stat-projects">
              <div className="stat-icon"><FolderKanban size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.totalProjects}</span>
                <span className="stat-label">Total Projects</span>
              </div>
            </div>
            <div className="stat-card stat-tasks">
              <div className="stat-icon"><CheckSquare size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.totalTasks}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
            </div>
            <div className="stat-card stat-overdue">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.overdueCount}</span>
                <span className="stat-label">Overdue Tasks</span>
              </div>
            </div>
            <div className="stat-card stat-online">
              <div className="stat-icon"><Users size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{onlineCount}</span>
                <span className="stat-label">Users Online</span>
              </div>
            </div>
          </>
        )}

        {user?.role === 'PM' && (
          <>
            <div className="stat-card stat-projects">
              <div className="stat-icon"><FolderKanban size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.projects?.length || 0}</span>
                <span className="stat-label">Your Projects</span>
              </div>
            </div>
            <div className="stat-card stat-tasks">
              <div className="stat-icon"><CheckSquare size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">
                  {data.tasksByStatus?.reduce((s, t) => s + t.count, 0) || 0}
                </span>
                <span className="stat-label">Total Tasks</span>
              </div>
            </div>
            <div className="stat-card stat-overdue">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.overdueCount}</span>
                <span className="stat-label">Overdue</span>
              </div>
            </div>
            <div className="stat-card stat-online">
              <div className="stat-icon"><Clock size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.upcomingDueTasks?.length || 0}</span>
                <span className="stat-label">Due This Week</span>
              </div>
            </div>
          </>
        )}

        {user?.role === 'DEVELOPER' && (
          <>
            <div className="stat-card stat-tasks">
              <div className="stat-icon"><CheckSquare size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.assignedTasks?.length || 0}</span>
                <span className="stat-label">Assigned Tasks</span>
              </div>
            </div>
            <div className="stat-card stat-overdue">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{data.overdueCount}</span>
                <span className="stat-label">Overdue</span>
              </div>
            </div>
            <div className="stat-card stat-projects">
              <div className="stat-icon"><TrendingUp size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">
                  {data.tasksByStatus?.find((s) => s.status === 'IN_PROGRESS')?.count || 0}
                </span>
                <span className="stat-label">In Progress</span>
              </div>
            </div>
            <div className="stat-card stat-online">
              <div className="stat-icon"><CheckSquare size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">
                  {data.tasksByStatus?.find((s) => s.status === 'DONE')?.count || 0}
                </span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Left column: status breakdown + task lists */}
        <div className="dashboard-main">
          {/* Task Status Breakdown */}
          {data.tasksByStatus && data.tasksByStatus.length > 0 && (
            <div className="card">
              <h3 className="card-title">Tasks by Status</h3>
              <div className="status-bars">
                {data.tasksByStatus.map((s) => {
                  const total = data.tasksByStatus!.reduce((sum, t) => sum + t.count, 0);
                  const pct = total > 0 ? (s.count / total) * 100 : 0;
                  return (
                    <div key={s.status} className="status-bar-row">
                      <div className="status-bar-label">
                        <span className={`status-dot ${s.status.toLowerCase()}`} />
                        <span>{statusLabels[s.status] || s.status}</span>
                      </div>
                      <div className="status-bar-track">
                        <div
                          className={`status-bar-fill ${s.status.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="status-bar-count">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Priority breakdown for PM */}
          {data.tasksByPriority && data.tasksByPriority.length > 0 && (
            <div className="card">
              <h3 className="card-title">Tasks by Priority</h3>
              <div className="priority-grid">
                {data.tasksByPriority.map((p) => (
                  <div key={p.priority} className={`priority-card ${p.priority.toLowerCase()}`}>
                    <span className="priority-count">{p.count}</span>
                    <span className="priority-label">{priorityLabels[p.priority]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming tasks for PM */}
          {data.upcomingDueTasks && data.upcomingDueTasks.length > 0 && (
            <div className="card">
              <h3 className="card-title">Due This Week</h3>
              <div className="task-list-compact">
                {data.upcomingDueTasks.map((task) => (
                  <div key={task.id} className="task-list-item" onClick={() => navigate(`/projects/${task.projectId}`)}>
                    <div className="task-item-left">
                      <span className={`priority-indicator ${task.priority.toLowerCase()}`} />
                      <span className="task-item-title">{task.title}</span>
                    </div>
                    <div className="task-item-right">
                      <span className="task-item-due">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                      </span>
                      <span className={`status-badge ${task.status.toLowerCase()}`}>
                        {statusLabels[task.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Developer tasks */}
          {data.assignedTasks && (
            <div className="card">
              <h3 className="card-title">Your Tasks</h3>
              <div className="task-list-compact">
                {data.assignedTasks.map((task) => (
                  <div key={task.id} className="task-list-item" onClick={() => navigate(`/projects/${task.projectId}`)}>
                    <div className="task-item-left">
                      <span className={`priority-indicator ${task.priority.toLowerCase()}`} />
                      <div>
                        <span className="task-item-title">{task.title}</span>
                        <span className="task-item-project">{task.project?.name}</span>
                      </div>
                    </div>
                    <div className="task-item-right">
                      {task.isOverdue && <span className="overdue-badge">Overdue</span>}
                      <span className={`status-badge ${task.status.toLowerCase()}`}>
                        {statusLabels[task.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PM projects */}
          {data.projects && (
            <div className="card">
              <h3 className="card-title">Your Projects</h3>
              <div className="projects-list">
                {data.projects.map((project) => (
                  <div
                    key={project.id}
                    className="project-list-item"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="project-item-main">
                      <h4>{project.name}</h4>
                      <span className="project-client">{project.client?.name}</span>
                    </div>
                    <div className="project-item-meta">
                      <span className="task-count">{project._count?.tasks || 0} tasks</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Activity Feed */}
        <div className="dashboard-sidebar">
          <ActivityFeed initialActivities={data.recentActivity || []} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
