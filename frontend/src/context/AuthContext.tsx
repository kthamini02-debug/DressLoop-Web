import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'ngo' | 'admin';
  organization_name?: string;
  registration_number?: string;
  verification_document?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => void;
  updateProfile: (payload: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('dress_token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user details on mount/token change
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // Token is invalid/expired
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('dress_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return res.data;
    } catch (error: any) {
      throw error.response?.data?.error || 'Login failed. Please try again.';
    }
  };

  const register = async (payload: any) => {
    try {
      const res = await api.post('/auth/register', payload);
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('dress_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return res.data;
    } catch (error: any) {
      throw error.response?.data?.error || 'Registration failed. Please try again.';
    }
  };

  const logout = () => {
    localStorage.removeItem('dress_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (payload: any) => {
    try {
      const res = await api.put('/auth/profile', payload);
      const { user: updatedUser } = res.data;
      setUser(prev => prev ? { ...prev, ...updatedUser } : null);
      return res.data;
    } catch (error: any) {
      throw error.response?.data?.error || 'Failed to update profile.';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
