import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { type User } from '../types';
import { Plus, Shield, Briefcase, Code } from 'lucide-react';

const roleIcons: Record<string, React.ReactNode> = {
  ADMIN: <Shield size={16} />,
  PM: <Briefcase size={16} />,
  DEVELOPER: <Code size={16} />,
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  PM: 'Project Manager',
  DEVELOPER: 'Developer',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'DEVELOPER' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        if (res.data.success) setUsers(res.data.data);
      } catch {} finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.post('/users', form);
      if (res.data.success) {
        setUsers((prev) => [res.data.data, ...prev]);
        setShowForm(false);
        setForm({ name: '', email: '', password: '', role: 'DEVELOPER' });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create user');
    }
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)} id="create-user-btn">
          <Plus size={18} /> New User
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add User</h2>
            <form onSubmit={handleCreate}>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="DEVELOPER">Developer</option>
                  <option value="PM">Project Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-grid">
        {users.map((u) => (
          <div key={u.id} className={`user-card role-${u.role.toLowerCase()}`}>
            <div className="user-card-avatar" style={{
              background: u.role === 'ADMIN' ? '#f59e0b' : u.role === 'PM' ? '#8b5cf6' : '#10b981',
            }}>
              {u.name.charAt(0)}
            </div>
            <h3>{u.name}</h3>
            <p className="user-email">{u.email}</p>
            <div className="user-role-badge">
              {roleIcons[u.role]} {roleLabels[u.role]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersPage;
