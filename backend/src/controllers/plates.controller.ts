import type { Request, Response, NextFunction } from 'express';
import AuthorizedPlate from '../models/authorizedPlate.model.js';
import PlateDetection from '../models/plateDetection.model.js';
import { getSocketServer } from '../config/socket.js';
import { detectPlateImage } from '../services/plates.service.js';
import type { PlateDetectRequestDTO, PlateValidateRequestDTO } from '../types/plant.types.js';

const normalizePlate = (plate: string): string => {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

class PlatesController {
  async detectPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageBase64 } = req.body as PlateDetectRequestDTO;
      const result = await detectPlateImage(imageBase64);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuthorizedPlates(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plates = await AuthorizedPlate.findAll();
      res.json(plates);
    } catch (error) {
      next(error);
    }
  }

  async createAuthorizedPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate, owner, description } = req.body;

      if (!plate) {
        res.status(400).json({ message: 'La placa es obligatoria' });
        return;
      }

      const normalizedPlate = normalizePlate(plate);

      const created = await AuthorizedPlate.create({
        plate: normalizedPlate,
        owner: owner ?? '',
        description: description ?? '',
        active: true,
      });

      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

async updateAuthorizedPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const { plate, owner, description, active } = req.body;

    const updateData: Record<string, unknown> = {};

    if (plate !== undefined) updateData['plate'] = normalizePlate(String(plate));
    if (owner !== undefined) updateData['owner'] = owner;
    if (description !== undefined) updateData['description'] = description;
    if (active !== undefined) updateData['active'] = active;

    const updated = await AuthorizedPlate.update(id, updateData);

    if (!updated) {
      res.status(404).json({ message: 'Placa no encontrada' });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

  async deleteAuthorizedPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params['id']);

      const deleted = await AuthorizedPlate.delete(id);

      if (!deleted) {
        res.status(404).json({ message: 'Placa no encontrada' });
        return;
      }

      res.json({ message: 'Placa eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  async validatePlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate, confidence, source } = req.body as PlateValidateRequestDTO;

      let status: 'autorizada' | 'no_autorizada' | 'no_detectada' = 'no_detectada';
      let normalizedPlate: string | null = null;

      if (typeof plate === 'string' && plate.trim()) {
        normalizedPlate = normalizePlate(plate);

        const authorized = await AuthorizedPlate.findActiveByPlate(normalizedPlate);
        status = authorized ? 'autorizada' : 'no_autorizada';
      }

      const detection = await PlateDetection.create({
        plate: normalizedPlate,
        status,
        confidence: typeof confidence === 'number' ? confidence : null,
        source: source ?? 'raspberry',
      });

      const io = getSocketServer();
      if (io) {
        io.emit('plate_update', {
          plate: normalizedPlate,
          status,
          confidence: detection.confidence,
          timestamp: detection.timestamp,
        });
      }

      res.json({
        authorized: status === 'autorizada',
        plate: normalizedPlate,
        status,
        detection,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlateDetections(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detections = await PlateDetection.findRecent(100);
      res.json(detections);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatesController();