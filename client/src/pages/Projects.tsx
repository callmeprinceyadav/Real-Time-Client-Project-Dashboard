import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { type Project, type Client } from '../types';
import { Plus, FolderKanban, ArrowRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  ACTIVE: '#10b981',
  COMPLETED: '#6366f1',
  ON_HOLD: '#f59e0b',
  ARCHIVED: '#6b7280',
};

const Projects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '' });
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PM';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, clientRes] = await Promise.all([
          api.get('/projects'),
          canCreate ? api.get('/clients') : Promise.resolve({ data: { data: [] } }),
        ]);
        if (projRes.data.success) setProjects(projRes.data.data);
        if (clientRes.data.data) setClients(clientRes.data.data);
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, [canCreate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.post('/projects', form);
      if (res.data.success) {
        setProjects((prev) => [res.data.data, ...prev]);
        setShowForm(false);
        setForm({ name: '', description: '', clientId: '' });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create project');
    }
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm(true)} id="create-project-btn">
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Project</h2>
            <form onSubmit={handleCreate}>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-group">
                <label>Project Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Project name"
                  required
                  id="project-name-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Project description"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Client</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                  id="project-client-select"
                >
                  <option value="">Select a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" id="submit-project-btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects grid */}
      <div className="projects-grid">
        {projects.length === 0 ? (
          <div className="empty-state">
            <FolderKanban size={48} />
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}`)}
              id={`project-${project.id}`}
            >
              <div className="project-card-header">
                <div
                  className="project-status-dot"
                  style={{ background: statusColors[project.status] }}
                  title={project.status}
                />
                <h3>{project.name}</h3>
              </div>
              {project.description && (
                <p className="project-card-desc">{project.description.slice(0, 100)}...</p>
              )}
              <div className="project-card-meta">
                <span className="project-client-name">{project.client?.name}</span>
                <span className="project-task-count">{project._count?.tasks || 0} tasks</span>
              </div>
              <div className="project-card-footer">
                <span className="project-creator">by {project.createdBy?.name}</span>
                <ArrowRight size={16} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Projects;
