import { Collection } from 'mongodb';
import DatabaseConnection from '../config/database.js';
import type { SensorEventDocument } from '../types/plant.types.js';

// ──────────────────────────────────────────────
//  SensorEventModel — persiste eventos de sensores
// ──────────────────────────────────────────────
class SensorEventModel {
  private get collection(): Collection<SensorEventDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance().getCollection<SensorEventDocument & Record<string, unknown>>('sensor_events');
  }

  async save(topic: string, category: string, payload: Record<string, unknown>): Promise<void> {
    await this.collection.insertOne({
      topic,
      category,
      payload,
      receivedAt: new Date(),
    } as never);
  }

  async findRecent(limit = 50, category?: string): Promise<SensorEventDocument[]> {
    const filter = category ? { category } : {};
    return this.collection
      .find(filter as never)
      .sort({ receivedAt: -1 })
      .limit(limit)
      .toArray() as unknown as SensorEventDocument[];
  }
}

export default new SensorEventModel();
