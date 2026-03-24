import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { type Task } from '../types';
import { Filter, AlertTriangle, Calendar, CheckSquare } from 'lucide-react';

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

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filterStatus = searchParams.get('status') || '';
  const filterPriority = searchParams.get('priority') || '';
  const filterDueFrom = searchParams.get('dueDateFrom') || '';
  const filterDueTo = searchParams.get('dueDateTo') || '';

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterPriority) params.set('priority', filterPriority);
        if (filterDueFrom) params.set('dueDateFrom', filterDueFrom);
        if (filterDueTo) params.set('dueDateTo', filterDueTo);

        const res = await api.get(`/tasks?${params.toString()}`);
        if (res.data.success) setTasks(res.data.data);
      } catch {} finally { setLoading(false); }
    };
    fetchTasks();
  }, [filterStatus, filterPriority, filterDueFrom, filterDueTo]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus as any } : t));
    } catch {}
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)} id="tasks-filter-toggle">
          <Filter size={16} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters-bar">
          <div className="filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All</option>
              {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Priority</label>
            <select value={filterPriority} onChange={(e) => updateFilter('priority', e.target.value)}>
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

      <div className="tasks-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <CheckSquare size={48} />
            <h3>No tasks found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-row ${task.isOverdue ? 'overdue' : ''}`}
              id={`task-row-${task.id}`}
            >
              <div className="task-row-left">
                <span className={`priority-indicator ${task.priority.toLowerCase()}`} />
                <div className="task-row-info">
                  <h4
                    className="task-row-title clickable"
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                  >
                    {task.title}
                  </h4>
                  <div className="task-row-meta">
                    <span className="task-project-name">{task.project?.name}</span>
                    {task.assignedTo && <span className="task-assignee-name">→ {task.assignedTo.name}</span>}
                  </div>
                </div>
              </div>
              <div className="task-row-right">
                {task.isOverdue && (
                  <span className="overdue-badge"><AlertTriangle size={12} /> Overdue</span>
                )}
                {task.dueDate && (
                  <span className="task-due-text">
                    <Calendar size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
                {(user?.role === 'ADMIN' || user?.role === 'PM' ||
                  (user?.role === 'DEVELOPER' && task.assignedToId === user.id)) && (
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="status-select"
                  >
                    {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((s) => (
                      <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tasks;
