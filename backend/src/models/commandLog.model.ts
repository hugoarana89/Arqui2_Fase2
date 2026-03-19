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

  // ── Nuevos métodos para Grafana ────────────────────────────────────────────

  /**
   * Serie temporal de comandos específicos agrupados por bucket.
   * Usada para graficar paros de emergencia a lo largo del tiempo.
   */
  async getCriticalCommandTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
    topic: string,
    comando: string,
  ): Promise<Array<[number, number]>> {
    const pipeline = [
      { $match: { topic, comando, sentAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$sentAt' }, intervalMs] } } },
                intervalMs,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.bucket': 1 } },
    ];
    const results = await this.collection.aggregate(pipeline).toArray();
    return results.map((r) => {
      const id = r['_id'] as { bucket: number };
      return [r['count'] as number, id.bucket] as [number, number];
    });
  }

  /**
   * Conteo total de un comando específico dentro de un rango de fechas.
   * Usado para los KPIs de eventos críticos.
   */
  async countCommands(from: Date, to: Date, topic: string, comando: string): Promise<number> {
    return this.collection.countDocuments({
      topic,
      comando,
      sentAt: { $gte: from, $lte: to },
    } as never);
  }

  /**
   * Serie temporal de todos los comandos enviados agrupados por bucket.
   * Usada para el panel de actividad del sistema.
   */
  async getAllCommandsTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Array<[number, number]>> {
    const pipeline = [
      { $match: { sentAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$sentAt' }, intervalMs] } } },
                intervalMs,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.bucket': 1 } },
    ];
    const results = await this.collection.aggregate(pipeline).toArray();
    return results.map((r) => {
      const id = r['_id'] as { bucket: number };
      return [r['count'] as number, id.bucket] as [number, number];
    });
  }
}

export default new CommandLogModel();
