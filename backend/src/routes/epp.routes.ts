import { Router } from 'express';
import EppController from '../controllers/epp.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Dispositivo (Raspberry) publica imagen para verificación EPP
router.post('/verify', (req, res, next) => EppController.verify(req, res, next));

// Frontend autenticado consulta histórico
router.get('/verifications', authenticate, (req, res, next) =>
  EppController.getVerifications(req, res, next)
);

// Healthcheck del microservicio de EPP
router.get('/health', (req, res, next) => EppController.health(req, res, next));

export default router;
