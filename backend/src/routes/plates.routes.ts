import { Router } from 'express';
import PlatesController from '../controllers/plates.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/authorized', authenticate, (req, res, next) =>
  PlatesController.getAuthorizedPlates(req, res, next)
);

router.post('/authorized', authenticate, (req, res, next) =>
  PlatesController.createAuthorizedPlate(req, res, next)
);

router.put('/authorized/:id', authenticate, (req, res, next) =>
  PlatesController.updateAuthorizedPlate(req, res, next)
);

router.delete('/authorized/:id', authenticate, (req, res, next) =>
  PlatesController.deleteAuthorizedPlate(req, res, next)
);

router.post('/validate', (req, res, next) =>
  PlatesController.validatePlate(req, res, next)
);

router.get('/detections', authenticate, (req, res, next) =>
  PlatesController.getPlateDetections(req, res, next)
);

export default router;