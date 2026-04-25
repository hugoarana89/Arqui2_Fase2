import { Collection, ObjectId } from 'mongodb';
import DatabaseConnection from '../config/database.js';

export interface AuthorizedPlateDocument {
  _id?: ObjectId;
  plate: string;
  owner?: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class AuthorizedPlateModel {
  private get collection(): Collection<AuthorizedPlateDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance()
      .getCollection<AuthorizedPlateDocument & Record<string, unknown>>('authorized_plates');
  }

  async create(data: Omit<AuthorizedPlateDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<AuthorizedPlateDocument> {
    const now = new Date();

    const doc: AuthorizedPlateDocument = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as never);

    return {
      ...doc,
      _id: result.insertedId,
    };
  }

  async findAll(): Promise<AuthorizedPlateDocument[]> {
    return this.collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray() as unknown as AuthorizedPlateDocument[];
  }

  async findActiveByPlate(plate: string): Promise<AuthorizedPlateDocument | null> {
    return this.collection.findOne({
      plate,
      active: true,
    } as never) as Promise<AuthorizedPlateDocument | null>;
  }

  async update(id: string, data: Partial<AuthorizedPlateDocument>): Promise<AuthorizedPlateDocument | null> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) } as never,
      { $set: updateData } as never,
      { returnDocument: 'after' }
    );

    return result as AuthorizedPlateDocument | null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: new ObjectId(id),
    } as never);

    return result.deletedCount === 1;
  }
}

export default new AuthorizedPlateModel();