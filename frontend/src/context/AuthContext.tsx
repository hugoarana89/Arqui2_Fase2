import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, AuthState } from '../types/auth.types';
import { authService } from '../services/auth.service';

// ──────────────────────────────────────────────
//  Tipos del contexto
// ──────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ──────────────────────────────────────────────
//  Contexto
// ──────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ──────────────────────────────────────────────
//  Provider
// ──────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Al montar: restaurar sesión desde localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        setState({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.clear();
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  // Refresca los datos del usuario desde la API
  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.me();
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
        setState((s) => ({ ...s, user: res.user! }));
      }
    } catch {
      // Token expirado — forzar logout
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ──────────────────────────────────────────────
//  Hook de consumo
// ──────────────────────────────────────────────
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
