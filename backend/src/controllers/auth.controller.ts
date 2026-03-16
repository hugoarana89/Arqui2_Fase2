import type { Request, Response, NextFunction } from 'express';
import UserModel from '../models/user.model.js';
import EmailService from '../services/email.service.js';
import { generateToken } from '../utils/jwt.util.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../middlewares/error.middleware.js';
import type {
  RegisterDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
} from '../types/user.types.js';

// ──────────────────────────────────────────────
//  AuthController
//  Todos los métodos reciben next() y propagan
//  errores al globalErrorHandler via next(err)
// ──────────────────────────────────────────────
class AuthController {

  // POST /api/auth/register
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body as RegisterDTO;

      if (!name || !email || !password)
        throw new BadRequestError('Nombre, correo y contraseña son requeridos.');

      if (password.length < 6)
        throw new BadRequestError('La contraseña debe tener al menos 6 caracteres.');

      const existing = await UserModel.findByEmail(email);
      if (existing)
        throw new ConflictError('El correo ya está registrado.');

      const user = await UserModel.create({ name, email, password });

      const token = generateToken({
        userId: user._id!.toString(),
        name: user.name,
        email: user.email,
      });

      EmailService.sendWelcome(user.email, user.name).catch((err) =>
        console.error('⚠️  Error enviando correo de bienvenida:', err),
      );

      res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente.',
        token,
        user: UserModel.sanitize(user),
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginDTO;

      if (!email || !password)
        throw new BadRequestError('Correo y contraseña son requeridos.');

      const user = await UserModel.findByEmail(email);
      if (!user)
        throw new UnauthorizedError('Credenciales inválidas.');

      const passwordValid = await UserModel.verifyPassword(password, user.password);
      if (!passwordValid)
        throw new UnauthorizedError('Credenciales inválidas.');

      const token = generateToken({
        userId: user._id!.toString(),
        name: user.name,
        email: user.email,
      });

      res.status(200).json({
        status: 'success',
        message: 'Inicio de sesión exitoso.',
        token,
        user: UserModel.sanitize(user),
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/forgot-password
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as ForgotPasswordDTO;

      if (!email)
        throw new BadRequestError('El correo es requerido.');

      const user = await UserModel.findByEmail(email);

      // Respuesta idéntica para no revelar si el email existe (seguridad)
      if (!user) {
        res.status(200).json({
          status: 'success',
          message: 'Si el correo está registrado, recibirás las instrucciones en tu bandeja.',
        });
        return;
      }

      const resetToken = await UserModel.generatePasswordResetToken(user._id!);

      EmailService.sendPasswordReset(user.email, user.name, resetToken).catch((err) =>
        console.error('⚠️  Error enviando correo de recuperación:', err),
      );

      res.status(200).json({
        status: 'success',
        message: 'Si el correo está registrado, recibirás las instrucciones en tu bandeja.',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body as ResetPasswordDTO;

      if (!token || !newPassword)
        throw new BadRequestError('Token y nueva contraseña son requeridos.');

      if (newPassword.length < 6)
        throw new BadRequestError('La contraseña debe tener al menos 6 caracteres.');

      const user = await UserModel.findByResetToken(token);
      if (!user)
        throw new BadRequestError('Token inválido o expirado.');

      await UserModel.resetPassword(user._id!, newPassword);

      res.status(200).json({
        status: 'success',
        message: 'Contraseña restablecida exitosamente.',
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/auth/change-password  🔒
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordDTO;
      const userId = req.user?.userId;

      if (!userId)
        throw new UnauthorizedError('No autenticado.');

      if (!currentPassword || !newPassword)
        throw new BadRequestError('Contraseña actual y nueva son requeridas.');

      if (newPassword.length < 6)
        throw new BadRequestError('La nueva contraseña debe tener al menos 6 caracteres.');

      const result = await UserModel.changePassword(userId, { currentPassword, newPassword });

      if (!result.success)
        throw new BadRequestError(result.message);

      const user = await UserModel.findById(userId);
      if (user) {
        EmailService.sendPasswordChanged(user.email, user.name).catch((err) =>
          console.error('⚠️  Error enviando notificación de cambio de contraseña:', err),
        );
      }

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/me  🔒
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId)
        throw new UnauthorizedError('No autenticado.');

      const user = await UserModel.findById(userId);
      if (!user)
        throw new NotFoundError('Usuario');

      res.status(200).json({
        status: 'success',
        user: UserModel.sanitize(user),
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new AuthController();
