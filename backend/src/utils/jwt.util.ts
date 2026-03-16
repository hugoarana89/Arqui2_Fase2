import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/user.types.js';

const SECRET = process.env.JWT_SECRET ?? 'change_this_secret_in_env';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

// ──────────────────────────────────────────────
//  Utilidad JWT — generación y verificación
// ──────────────────────────────────────────────
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload;
};
