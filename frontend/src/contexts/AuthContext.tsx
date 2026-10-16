import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types';
import { authApi } from '@/services/api';

interface AuthContextType extends AuthState {
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('intellisphere_token');
    const savedUser = localStorage.getItem('intellisphere_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: any) => {
    const response = await authApi.login(credentials);
    const tokenStr = response.access_token;
    const userData: User = {
      id: response.user_id,
      email: response.email,
      full_name: response.full_name,
      role: response.role,
      is_active: true,
    };

    setToken(tokenStr);
    setUser(userData);
    localStorage.setItem('intellisphere_token', tokenStr);
    localStorage.setItem('intellisphere_user', JSON.stringify(userData));
  };

  const register = async (data: any) => {
    const response = await authApi.register(data);
    const tokenStr = response.access_token;
    const userData: User = {
      id: response.user_id,
      email: response.email,
      full_name: response.full_name,
      role: response.role,
      is_active: true,
    };

    setToken(tokenStr);
    setUser(userData);
    localStorage.setItem('intellisphere_token', tokenStr);
    localStorage.setItem('intellisphere_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('intellisphere_token');
    localStorage.removeItem('intellisphere_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
