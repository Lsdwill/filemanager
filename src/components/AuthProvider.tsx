'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      verify(savedToken);
    }
  }, []);

  async function verify(t: string) {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      });
      if (res.ok) {
        setToken(t);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
      }
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setIsAuthenticated(false);
    }
  }

  async function login(password: string): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function logout() {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}