import { Router } from 'express';
import MonitoringController from '../controllers/monitoring.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/state',                   (req, res, next) => MonitoringController.getState(req, res, next));
router.get('/events',                  (req, res, next) => MonitoringController.getSensorEvents(req, res, next));
router.get('/classifications',         (req, res, next) => MonitoringController.getClassifications(req, res, next));
router.get('/classifications/stats',   (req, res, next) => MonitoringController.getClassificationStats(req, res, next));
router.get('/commands',                (req, res, next) => MonitoringController.getCommandHistory(req, res, next));

export default router;
