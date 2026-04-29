import type { NextFunction, Request, Response } from 'express';
import { getSocketServer } from '../config/socket.js';
import EppVerificationModel from '../models/eppVerification.model.js';
import { checkEppHealth, verifyPpeImage } from '../services/epp.service.js';
import type { EppVerifyRequestDTO } from '../types/plant.types.js';

class EppController {
  // POST /api/epp/verify
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageBase64, source } = req.body as EppVerifyRequestDTO;
      const epp = await verifyPpeImage(imageBase64);

      const saved = await EppVerificationModel.save({
        access_granted: epp.access_granted,
        missing_mandatory: epp.missing_mandatory,
        detections: epp.detections,
        source: source ?? 'raspberry',
      });

      const io = getSocketServer();
      if (io) {
        io.emit('epp_update', {
          id: saved._id,
          access_granted: saved.access_granted,
          missing_mandatory: saved.missing_mandatory,
          detections: saved.detections,
          source: saved.source,
          createdAt: saved.createdAt,
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          ...saved,
          annotated_image_base64: epp.annotated_image_base64,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/epp/verifications?limit=100
  async getVerifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
      const data = await EppVerificationModel.findRecent(limit);
      res.status(200).json({ status: 'success', count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/epp/health
  async health(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await checkEppHealth();
      res.status(200).json({ status: 'success', data: health });
    } catch (error) {
      next(error);
    }
  }
}

export default new EppController();
