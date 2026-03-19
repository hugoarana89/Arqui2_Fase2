import { Router } from 'express';
import ControlController from '../controllers/control.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

// ──────────────────────────────────────────────
//  Rutas de control — todas protegidas con JWT
//  POST → valida → guarda en DB → publica MQTT
// ──────────────────────────────────────────────
const router = Router();

router.use(authenticate); // protege todas las rutas de este router

router.post('/linea',       (req, res, next) => ControlController.controlLinea(req, res, next));
router.post('/acceso',      (req, res, next) => ControlController.controlAcceso(req, res, next));
router.post('/iluminacion', (req, res, next) => ControlController.controlIluminacion(req, res, next));
router.post('/emergencia',  (req, res, next) => ControlController.controlEmergencia(req, res, next));
router.post('/almacen/reset', (req, res, next) => ControlController.resetAlmacen(req, res, next));

export default router;
