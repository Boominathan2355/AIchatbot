import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { encode } from '../utils/crypto';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
      api.getProfile()
        .then((data) => {
          setUser(data.user);
          setIsLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          setToken(null);
          api.setAuthToken('');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const result = await api.login(username, password);
    localStorage.setItem('auth_token', result.token);
    setToken(result.token);
    api.setAuthToken(result.token);
    setUser(result.user);
  };

  const register = async (username: string, password: string) => {
    const result = await api.register(username, password);
    localStorage.setItem('auth_token', result.token);
    setToken(result.token);
    api.setAuthToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    api.setAuthToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
