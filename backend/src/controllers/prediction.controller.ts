import type { Request, Response, NextFunction } from 'express';
import PredictionModel from '../models/prediction.model.js';

class PredictionController {
  // GET /api/predictions/latest/:linea
  async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const linea = req.params['linea'];
      if (!linea || !['plastico', 'vidrio', 'metal'].includes(linea)) {
        res.status(400).json({ error: 'Línea inválida' });
        return;
      }
      
      const prediction = await PredictionModel.getLatest(linea);
      res.json({ success: true, data: prediction });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/predictions/history/:linea?limit=100
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const linea = req.params['linea'];
      const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
      
      if (!linea || !['plastico', 'vidrio', 'metal'].includes(linea)) {
        res.status(400).json({ error: 'Línea inválida' });
        return;
      }
      
      const history = await PredictionModel.getHistory(linea, limit);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

export default new PredictionController();