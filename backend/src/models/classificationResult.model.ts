import { Collection } from 'mongodb';
import DatabaseConnection from '../config/database.js';
import type { ClassificationResultDocument } from '../types/plant.types.js';

class ClassificationResultModel {
  private get collection(): Collection<ClassificationResultDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance().getCollection<ClassificationResultDocument & Record<string, unknown>>('classification_results');
  }

  async save(data: Omit<ClassificationResultDocument, '_id'>): Promise<void> {
    await this.collection.insertOne({ ...data } as never);
  }

  async findRecent(limit = 100): Promise<ClassificationResultDocument[]> {
    return this.collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as unknown as ClassificationResultDocument[];
  }

  async findByLinea(linea: string, limit = 50): Promise<ClassificationResultDocument[]> {
    return this.collection
      .find({ linea } as never)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as unknown as ClassificationResultDocument[];
  }

  /** Estadísticas de aprobados/rechazados por línea */
  async getStats(): Promise<Record<string, { aprobados: number; rechazados: number }>> {
    const pipeline = [
      {
        $group: {
          _id: { linea: '$linea', resultado: '$resultado' },
          count: { $sum: 1 },
        },
      },
    ];
    const results = await this.collection.aggregate(pipeline).toArray();
    const stats: Record<string, { aprobados: number; rechazados: number }> = {
      plastico: { aprobados: 0, rechazados: 0 },
      vidrio:   { aprobados: 0, rechazados: 0 },
      metal:    { aprobados: 0, rechazados: 0 },
    };
    for (const r of results) {
      const key = (r['_id'] as { linea: string }).linea;
      const res = (r['_id'] as { resultado: string }).resultado;
      if (stats[key]) {
        if (res === 'aprobado')  stats[key]!.aprobados  = r['count'] as number;
        if (res === 'rechazado') stats[key]!.rechazados = r['count'] as number;
      }
    }
    return stats;
  }
}

export default new ClassificationResultModel();
