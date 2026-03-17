import { Collection, ObjectId } from 'mongodb';
import DatabaseConnection from '../config/database.js';
import type { CommandLogDocument } from '../types/plant.types.js';

class CommandLogModel {
  private get collection(): Collection<CommandLogDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance().getCollection<CommandLogDocument & Record<string, unknown>>('commands_log');
  }

  async save(data: Omit<CommandLogDocument, '_id'>): Promise<void> {
    await this.collection.insertOne({ ...data } as never);
  }

  async findRecent(limit = 100): Promise<CommandLogDocument[]> {
    return this.collection
      .find({})
      .sort({ sentAt: -1 })
      .limit(limit)
      .toArray() as unknown as CommandLogDocument[];
  }

  async findByUser(userId: string, limit = 50): Promise<CommandLogDocument[]> {
    if (!ObjectId.isValid(userId)) return [];
    return this.collection
      .find({ userId: new ObjectId(userId) } as never)
      .sort({ sentAt: -1 })
      .limit(limit)
      .toArray() as unknown as CommandLogDocument[];
  }
}

export default new CommandLogModel();
