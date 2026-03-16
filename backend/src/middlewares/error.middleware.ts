import type { Request, Response, NextFunction } from 'express';

// ──────────────────────────────────────────────
//  Clase base para errores operacionales
//  Permite distinguir errores esperados de bugs
// ──────────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    // Mantiene el stack trace correcto en V8
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores HTTP semánticos listos para usar en controladores
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado.`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado.') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'El recurso ya existe.') {
    super(message, 409);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud inválida.') {
    super(message, 400);
  }
}

// ──────────────────────────────────────────────
//  Middleware 404 — rutas no encontradas
//  Debe ir DESPUÉS de todas las rutas
// ──────────────────────────────────────────────
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError('Ruta'));
};

// ──────────────────────────────────────────────
//  Middleware global de errores
//  Express lo identifica por los 4 parámetros (err, req, res, next)
//  Debe ir AL FINAL de todo en index.ts
// ──────────────────────────────────────────────
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // Error operacional conocido (AppError o subclase)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
    });
    return;
  }

  // Error de MongoDB: clave duplicada (email ya registrado)
  if ((err as NodeJS.ErrnoException).name === 'MongoServerError') {
    const mongoErr = err as Error & { code?: number };
    if (mongoErr.code === 11000) {
      res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'El correo electrónico ya está registrado.',
      });
      return;
    }
  }

  // Error de JWT malformado
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Token inválido.',
    });
    return;
  }

  // Token JWT expirado
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'El token ha expirado. Inicia sesión nuevamente.',
    });
    return;
  }

  // Error de validación de body (JSON malformado)
  if (err.name === 'SyntaxError') {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'JSON malformado en el cuerpo de la petición.',
    });
    return;
  }

  // Error inesperado — no exponer detalles en producción
  const isDev = process.env['NODE_ENV'] === 'development';
  console.error('💥 Error inesperado:', err);

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Error interno del servidor.',
    ...(isDev && { detail: err.message, stack: err.stack }),
  });
};
