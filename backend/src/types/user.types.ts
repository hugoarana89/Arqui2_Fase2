import type { ObjectId } from 'mongodb';

// ──────────────────────────────────────────────
//  Documento de usuario tal como se guarda en DB
// ──────────────────────────────────────────────
export interface UserDocument {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────────────────────
//  Payloads de entrada (DTOs)
// ──────────────────────────────────────────────
export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// ──────────────────────────────────────────────
//  Payload del JWT
// ──────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  name: string;
  email: string;
}
