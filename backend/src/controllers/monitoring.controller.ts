import type { Request, Response, NextFunction } from 'express';
import { getPublicState } from '../state/plantState.js';
import SensorEventModel from '../models/sensorEvent.model.js';
import ClassificationResultModel from '../models/classificationResult.model.js';
import CommandLogModel from '../models/commandLog.model.js';

// ──────────────────────────────────────────────
//  MonitoringController — datos para el dashboard
// ──────────────────────────────────────────────
class MonitoringController {

  // GET /api/monitoring/state
  // Fallback HTTP para obtener el estado actual (por si no se usa WS)
  async getState(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ status: 'success', data: getPublicState() });
    } catch (err) { next(err); }
  }

  // GET /api/monitoring/events?category=parqueo&limit=50
  async getSensorEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit    = Math.min(parseInt(req.query['limit'] as string) || 50, 200);
      const category = req.query['category'] as string | undefined;
      const events   = await SensorEventModel.findRecent(limit, category);
      res.status(200).json({ status: 'success', count: events.length, data: events });
    } catch (err) { next(err); }
  }

  // GET /api/monitoring/classifications?linea=plastico&limit=100
  async getClassifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
      const linea = req.query['linea'] as string | undefined;
      const data  = linea
        ? await ClassificationResultModel.findByLinea(linea, limit)
        : await ClassificationResultModel.findRecent(limit);
      res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) { next(err); }
  }

  // GET /api/monitoring/classifications/stats
  async getClassificationStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ClassificationResultModel.getStats();
      res.status(200).json({ status: 'success', data: stats });
    } catch (err) { next(err); }
  }

  // GET /api/monitoring/commands?limit=100
  async getCommandHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
      const data  = await CommandLogModel.findRecent(limit);
      res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) { next(err); }
  }
}

export default new MonitoringController();
