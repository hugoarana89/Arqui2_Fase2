import type {
  LoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  ApiResponse,
  User,
} from '../types/auth.types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// ── Helpers ───────────────────────────────────
const getToken = (): string | null => localStorage.getItem('token');

const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const jsonHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
});

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? 'Error en la solicitud');
  }
  return data as T;
}

// ── Auth endpoints ────────────────────────────
export const authService = {
  login: (payload: LoginPayload) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<ApiResponse<User>>),

  register: (payload: RegisterPayload) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<ApiResponse<User>>),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<ApiResponse>),

  resetPassword: (payload: ResetPasswordPayload) =>
    fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<ApiResponse>),

  changePassword: (payload: ChangePasswordPayload) =>
    fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<ApiResponse>),

  me: () =>
    fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: authHeaders(),
    }).then(handleResponse<ApiResponse<User>>),
};
