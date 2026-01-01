import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;  // ← Added
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);  // ← Added

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
      setIsAuthenticated(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setUser(res.data);
      setIsAuthenticated(true);  // ← Set on success
    } catch (err) {
      toast.error('Session expired. Please login again.');
      logout();
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    fetchProfile();  // ← Fetch immediately
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};