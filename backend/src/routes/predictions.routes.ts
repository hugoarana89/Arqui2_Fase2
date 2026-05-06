import { Router } from 'express';
import PredictionController from '../controllers/prediction.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/latest/:linea', (req, res, next) => 
  PredictionController.getLatest(req, res, next)
);
router.get('/history/:linea', (req, res, next) => 
  PredictionController.getHistory(req, res, next)
);

export default router;
