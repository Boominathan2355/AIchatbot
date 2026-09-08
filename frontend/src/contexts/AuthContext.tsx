import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';
import { AuthUser } from '../types';

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    apiClient.setAuthToken('');
    setToken(null);
    setUser(null);
  };

  const storeSession = ({ token: nextToken, user: nextUser }: { token: string; user: AuthUser }) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextToken);
    apiClient.setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiClient.setAuthToken(token);
    apiClient
      .getCurrentUser()
      .then(setUser)
      .catch(clearSession)
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = async (username: string, password: string) => {
    storeSession(await apiClient.login(username, password));
  };

  const register = async (username: string, password: string) => {
    storeSession(await apiClient.register(username, password));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated: Boolean(user), login, register, logout: clearSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
