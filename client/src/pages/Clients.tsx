import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { type Client } from '../types';
import { Plus, Building2, Mail, Phone } from 'lucide-react';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get('/clients');
        if (res.data.success) setClients(res.data.data);
      } catch {} finally { setLoading(false); }
    };
    fetchClients();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.post('/clients', form);
      if (res.data.success) {
        setClients((prev) => [res.data.data, ...prev]);
        setShowForm(false);
        setForm({ name: '', email: '', company: '', phone: '' });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create client');
    }
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="clients-page">
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="page-subtitle">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)} id="create-client-btn">
          <Plus size={18} /> New Client
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Client</h2>
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
                <label>Company</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="clients-grid">
        {clients.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} />
            <h3>No clients yet</h3>
          </div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="client-card">
              <div className="client-avatar">{client.name.charAt(0)}</div>
              <h3>{client.name}</h3>
              <p className="client-company">{client.company}</p>
              <div className="client-info">
                <span><Mail size={14} /> {client.email}</span>
                {client.phone && <span><Phone size={14} /> {client.phone}</span>}
              </div>
              <div className="client-projects-count">
                {client._count?.projects || 0} projects
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Clients;
