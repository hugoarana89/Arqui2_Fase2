import { Collection } from 'mongodb';
import DatabaseConnection from '../config/database.js';
import type { EppVerificationDocument } from '../types/plant.types.js';

class EppVerificationModel {
  private get collection(): Collection<EppVerificationDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance().getCollection<EppVerificationDocument & Record<string, unknown>>('epp_verifications');
  }

  async save(data: Omit<EppVerificationDocument, '_id' | 'createdAt'>): Promise<EppVerificationDocument> {
    const doc: EppVerificationDocument = {
      ...data,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(doc as never);
    return {
      ...doc,
      _id: result.insertedId,
    };
  }

  async findRecent(limit = 100): Promise<EppVerificationDocument[]> {
    return this.collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray() as unknown as EppVerificationDocument[];
  }
}

export default new EppVerificationModel();
