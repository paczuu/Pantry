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
  register: (email: string, pass: string, name: string, householdName?: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('spizarnia_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('spizarnia_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.error('Błąd weryfikacji sesji:', err);
      localStorage.removeItem('spizarnia_token');
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
      localStorage.setItem('spizarnia_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Witaj ponownie, ${data.user.name}!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Błąd logowania.', 'error');
      throw error;
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    householdName?: string,
    inviteCode?: string
  ) => {
    try {
      const data = await api.register(email, pass, name, householdName, inviteCode);
      localStorage.setItem('spizarnia_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Konto utworzone pomyślnie! Witaj ${data.user.name}.`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Błąd rejestracji.', 'error');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('spizarnia_token');
    setToken(null);
    setUser(null);
    showToast('Wylogowano pomyślnie.', 'info');
  };

  const joinHousehold = async (inviteCode: string) => {
    try {
      const data = await api.joinHousehold(inviteCode);
      setUser(data.user);
      showToast('Dołączono do gospodarstwa domowego!', 'success');
      await refreshUser();
    } catch (error: any) {
      showToast(error.message || 'Błąd dołączania do gospodarstwa.', 'error');
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
