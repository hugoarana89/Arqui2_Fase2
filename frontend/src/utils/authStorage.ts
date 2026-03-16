// ──────────────────────────────────────────────
//  authStorage — helpers para leer/escribir sesión
//  en localStorage. Compatible con el NavBar existente.
// ──────────────────────────────────────────────
import type { User } from '../types/auth.types';

export const getToken = (): string | null => localStorage.getItem('token');

export const getUser = (): User | null => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;

  // Verificar expiración del JWT sin librería
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  } catch {
    return false;
  }
  return true;
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
