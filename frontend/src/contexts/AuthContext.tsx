import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pantry_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('pantry_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.error('Error session expired:', err);
      localStorage.removeItem('pantry_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    try {
      const data = await api.login(email, pass);
      localStorage.setItem('pantry_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Login error.', 'error');
      throw error;
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    inviteCode?: string
  ) => {
    try {
      const data = await api.register(email, pass, name, inviteCode);
      localStorage.setItem('pantry_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Account created successfully! Welcome ${data.user.name}.`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Registration error.', 'error');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('pantry_token');
    setToken(null);
    setUser(null);
    showToast('Logout successfully.', 'info');
  };

  const joinHousehold = async (inviteCode: string) => {
    try {
      const data = await api.joinHousehold(inviteCode);
      setUser(data.user);
      showToast('Joined new household!', 'success');
      await refreshUser();
    } catch (error: any) {
      showToast(error.message || 'Error while joining household.', 'error');
      throw error;
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        joinHousehold,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
