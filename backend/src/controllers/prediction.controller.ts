import type { Request, Response, NextFunction } from 'express';
import DatabaseConnection from '../config/database.js';

class PredictionController {
  async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const linea = req.params['linea'] as string;
      
      if (!linea || !['plastico', 'vidrio', 'metal'].includes(linea)) {
        res.status(400).json({ error: 'Línea inválida' });
        return;
      }
      
      const db = DatabaseConnection.getInstance().getDb();
      const collection = db.collection('bodega_predictions');
      
      const latest = await collection.findOne(
        { linea },
        { sort: { timestamp: -1 } }
      );
      
      res.json({ success: true, data: latest });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const linea = req.params['linea'] as string;
      const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
      
      if (!linea || !['plastico', 'vidrio', 'metal'].includes(linea)) {
        res.status(400).json({ error: 'Línea inválida' });
        return;
      }
      
      const db = DatabaseConnection.getInstance().getDb();
      const collection = db.collection('bodega_predictions');
      
      const history = await collection.find({ linea })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

export default new PredictionController();
