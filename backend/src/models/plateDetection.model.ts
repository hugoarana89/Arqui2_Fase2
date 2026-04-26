import { Collection, ObjectId } from 'mongodb';
import DatabaseConnection from '../config/database.js';

export type PlateValidationStatus =
  | 'autorizada'
  | 'no_autorizada'
  | 'no_detectada';

export interface PlateDetectionDocument {
  _id?: ObjectId;
  timestamp: Date;
  plate: string | null;
  status: PlateValidationStatus;
  confidence?: number | null;
  source: string;
  createdAt: Date;
}

class PlateDetectionModel {
  private get collection(): Collection<PlateDetectionDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance()
      .getCollection<PlateDetectionDocument & Record<string, unknown>>('plate_detections');
  }

  async create(data: Omit<PlateDetectionDocument, '_id' | 'createdAt' | 'timestamp'> & { timestamp?: Date }): Promise<PlateDetectionDocument> {
    const now = new Date();

    const doc: PlateDetectionDocument = {
      timestamp: data.timestamp ?? now,
      plate: data.plate,
      status: data.status,
      confidence: data.confidence ?? null,
      source: data.source,
      createdAt: now,
    };

    const result = await this.collection.insertOne(doc as never);

    return {
      ...doc,
      _id: result.insertedId,
    };
  }

  async findRecent(limit = 100): Promise<PlateDetectionDocument[]> {
    return this.collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as unknown as PlateDetectionDocument[];
  }
}

export default new PlateDetectionModel();