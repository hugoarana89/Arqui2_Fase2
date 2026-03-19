import { Router } from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

// ──────────────────────────────────────────────
//  Rutas de autenticación
// ──────────────────────────────────────────────
const router = Router();

// Rutas públicas
router.post('/register',        (req, res, next) => AuthController.register(req, res, next));
router.post('/login',           (req, res, next) => AuthController.login(req, res, next));
router.post('/forgot-password', (req, res, next) => AuthController.forgotPassword(req, res, next));
router.post('/reset-password',  (req, res, next) => AuthController.resetPassword(req, res, next));

// Rutas protegidas (requieren JWT válido)
router.put('/change-password',  authenticate, (req, res, next) => AuthController.changePassword(req, res, next));
router.get('/me',               authenticate, (req, res, next) => AuthController.me(req, res, next));

export default router;
