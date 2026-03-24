import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../api/axios';
import { type User } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(sessionStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);

  const tryRefresh = useCallback(async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      if (data.success) {
        sessionStorage.setItem('accessToken', data.data.accessToken);
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
      }
    } catch {
      sessionStorage.removeItem('accessToken');
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      api.get('/auth/me')
        .then(({ data }) => {
          if (data.success) setUser(data.data);
          setIsLoading(false);
        })
        .catch(() => {
          tryRefresh();
        });
    } else {
      tryRefresh();
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      sessionStorage.setItem('accessToken', data.data.accessToken);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
    } else {
      throw new Error(data.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    sessionStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
