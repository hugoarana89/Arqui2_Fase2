import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util.js';
import type { JwtPayload } from '../types/user.types.js';

// Extiende Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ──────────────────────────────────────────────
//  Middleware de autenticación JWT
// ──────────────────────────────────────────────
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de autenticación requerido.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Token de autenticación requerido.' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};
