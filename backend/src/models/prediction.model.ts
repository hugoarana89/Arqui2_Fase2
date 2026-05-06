import { Collection, ObjectId } from 'mongodb';
import DatabaseConnection from '../config/database.js';

export interface PredictionDocument {
  _id?: ObjectId;
  linea: string;
  porcentaje_actual: number;
  minutos_restantes: number | null;
  estado: 'OPERANDO' | 'LLENA' | 'SIN_FLUJO';
  color_semaforo: string;
  timestamp: Date;
  createdAt: Date;
}

class PredictionModel {
  private get collection(): Collection<PredictionDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance()
      .getCollection<PredictionDocument & Record<string, unknown>>('bodega_predictions');
  }

  async save(data: Omit<PredictionDocument, '_id' | 'createdAt'>): Promise<void> {
    await this.collection.insertOne({
      ...data,
      createdAt: new Date()
    } as never);
  }

  async getLatest(linea: string): Promise<PredictionDocument | null> {
    return this.collection.findOne(
      { linea } as never,
      { sort: { timestamp: -1 } }
    ) as Promise<PredictionDocument | null>;
  }

  async getHistory(linea: string, limit = 100): Promise<PredictionDocument[]> {
    return this.collection
      .find({ linea } as never)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as unknown as PredictionDocument[];
  }
}

export default new PredictionModel();