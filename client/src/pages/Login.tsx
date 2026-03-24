import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email: string) => {
    setEmail(email);
    setPassword('password123');
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Zap size={32} />
          </div>
          <h1>Velozity</h1>
          <p>Real-Time Project Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading} id="login-submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="quick-login">
          <p>Quick Login</p>
          <div className="quick-login-buttons">
            <button onClick={() => quickLogin('admin@velozity.com')} className="quick-btn admin">
              Admin
            </button>
            <button onClick={() => quickLogin('ravi@velozity.com')} className="quick-btn pm">
              PM
            </button>
            <button onClick={() => quickLogin('amit@velozity.com')} className="quick-btn dev">
              Developer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
