import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ActivityFeed from '../components/ActivityFeed';
import { type Project, type Task, type ActivityLog, type User } from '../types';
import { Plus, Filter, ArrowLeft, Calendar, AlertTriangle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const statusOrder = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const priorityLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assignedToId: '', priority: 'MEDIUM', dueDate: '',
  });
  const [formError, setFormError] = useState('');

  // Filters
  const filterStatus = searchParams.get('status') || '';
  const filterPriority = searchParams.get('priority') || '';
  const filterDueFrom = searchParams.get('dueDateFrom') || '';
  const filterDueTo = searchParams.get('dueDateTo') || '';

  const canManage = user?.role === 'ADMIN' || user?.role === 'PM';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, activityRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/activity?limit=20`),
        ]);
        if (projRes.data.success) setProject(projRes.data.data);
        if (activityRes.data.success) {
          const projActivities = activityRes.data.data.filter(
            (a: ActivityLog) => a.projectId === id
          );
          setActivities(projActivities);
        }

        if (canManage) {
          const devRes = await api.get('/users/developers');
          if (devRes.data.success) setDevelopers(devRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load project', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, canManage]);

  // Listen for real-time task updates
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('joinProject', id);

    const handleTaskUpdate = () => {
      // Re-fetch project to get updated tasks
      api.get(`/projects/${id}`).then((res) => {
        if (res.data.success) setProject(res.data.data);
      });
    };

    socket.on('taskUpdate', handleTaskUpdate);
    return () => {
      socket.off('taskUpdate', handleTaskUpdate);
      socket.emit('leaveProject', id);
    };
  }, [socket, id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.post('/tasks', {
        ...taskForm,
        projectId: id,
        assignedToId: taskForm.assignedToId || undefined,
        dueDate: taskForm.dueDate || undefined,
      });
      if (res.data.success) {
        setProject((prev) => prev ? { ...prev, tasks: [res.data.data, ...(prev.tasks || [])] } : prev);
        setShowTaskForm(false);
        setTaskForm({ title: '', description: '', assignedToId: '', priority: 'MEDIUM', dueDate: '' });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      if (res.data.success) {
        setProject((prev) => {
          if (!prev || !prev.tasks) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, status: newStatus as any } : t),
          };
        });
      }
    } catch (err: any) {
      console.error('Failed to update task status', err);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  // Apply filters to tasks
  const filteredTasks = (project?.tasks || []).filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterDueFrom && t.dueDate && new Date(t.dueDate) < new Date(filterDueFrom)) return false;
    if (filterDueTo && t.dueDate && new Date(t.dueDate) > new Date(filterDueTo)) return false;
    return true;
  });

  // Group tasks by status for Kanban view
  const tasksByStatus: Record<string, Task[]> = {};
  statusOrder.forEach((s) => { tasksByStatus[s] = []; });
  filteredTasks.forEach((t) => {
    if (tasksByStatus[t.status]) tasksByStatus[t.status].push(t);
  });

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;
  if (!project) return <div className="page-error">Project not found</div>;

  return (
    <div className="project-detail-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-with-back">
          <button className="back-btn" onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{project.name}</h1>
            <p className="page-subtitle">
              {project.client?.name} · {project.tasks?.length || 0} tasks
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)} id="filter-toggle">
            <Filter size={16} /> Filters
          </button>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowTaskForm(true)} id="create-task-btn">
              <Plus size={18} /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filters-bar">
          <div className="filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => updateFilter('status', e.target.value)} id="filter-status">
              <option value="">All</option>
              {statusOrder.map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Priority</label>
            <select value={filterPriority} onChange={(e) => updateFilter('priority', e.target.value)} id="filter-priority">
              <option value="">All</option>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                <option key={p} value={p}>{priorityLabels[p]}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Due From</label>
            <input type="date" value={filterDueFrom} onChange={(e) => updateFilter('dueDateFrom', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Due To</label>
            <input type="date" value={filterDueTo} onChange={(e) => updateFilter('dueDateTo', e.target.value)} />
          </div>
          <button className="btn-text" onClick={() => setSearchParams({})}>Clear</button>
        </div>
      )}

      <div className="project-content">
        {/* Kanban Board */}
        <div className="kanban-board">
          {statusOrder.map((status) => (
            <div key={status} className="kanban-column">
              <div className="kanban-header">
                <span className={`status-dot ${status.toLowerCase()}`} />
                <h3>{statusLabels[status]}</h3>
                <span className="kanban-count">{tasksByStatus[status].length}</span>
              </div>
              <div className="kanban-cards">
                {tasksByStatus[status].map((task) => (
                  <div key={task.id} className={`task-card ${task.isOverdue ? 'overdue' : ''}`} id={`task-${task.id}`}>
                    <div className="task-card-top">
                      <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      {task.isOverdue && (
                        <span className="overdue-badge">
                          <AlertTriangle size={12} /> Overdue
                        </span>
                      )}
                    </div>
                    <h4 className="task-card-title">{task.title}</h4>
                    {task.description && (
                      <p className="task-card-desc">{task.description.slice(0, 80)}...</p>
                    )}
                    <div className="task-card-meta">
                      {task.assignedTo && (
                        <div className="task-assignee">
                          <div className="mini-avatar">{task.assignedTo.name.charAt(0)}</div>
                          <span>{task.assignedTo.name}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <span className="task-due">
                          <Calendar size={12} />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Status change buttons */}
                    {(user?.role === 'ADMIN' || user?.role === 'PM' ||
                      (user?.role === 'DEVELOPER' && task.assignedToId === user.id)) && (
                      <div className="task-card-actions">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="status-select"
                        >
                          {statusOrder.map((s) => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed Sidebar */}
        <div className="project-activity-sidebar">
          <ActivityFeed initialActivities={activities} projectId={id} />
        </div>
      </div>

      {/* Create task modal */}
      {showTaskForm && (
        <div className="modal-overlay" onClick={() => setShowTaskForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Task</h2>
            <form onSubmit={handleCreateTask}>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-group">
                <label>Title</label>
                <input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title"
                  required
                  id="task-title-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    value={taskForm.assignedToId}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
                    id="task-assignee-select"
                  >
                    <option value="">Unassigned</option>
                    {developers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    id="task-priority-select"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTaskForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" id="submit-task-btn">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
