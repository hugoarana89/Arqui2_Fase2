import { Collection } from 'mongodb';
import DatabaseConnection from '../config/database.js';
import type { SensorEventDocument } from '../types/plant.types.js';

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

  // ── Nuevos métodos para Grafana ────────────────────────────────────────────

  /**
   * Serie temporal de ocupación de parqueos.
   * Lee sensor_events con topic de parqueos y extrae payload.parqueos_ocupados.
   * Devuelve pares [timestamp_ms, parqueos_ocupados].
   */
  async getParqueosTimeSeries(from: Date, to: Date): Promise<Array<[number, number]>> {
    const pipeline = [
      {
        $match: {
          topic: 'ecosort/planta/parqueos/estado',
          receivedAt: { $gte: from, $lte: to },
        },
      },
      { $sort: { receivedAt: 1 } },
      {
        $project: {
          _id: 0,
          ts:    { $toLong: '$receivedAt' },
          value: { $ifNull: ['$payload.parqueos_ocupados', 0] },
        },
      },
    ];
    const results = await this.collection.aggregate(pipeline).toArray();
    return results.map((r) => [r['value'] as number, r['ts'] as number] as [number, number]);
  }

  /**
   * Serie temporal de eventos críticos agrupados por bucket.
   * Filtra por topic y, opcionalmente, por un campo booleano dentro del payload.
   * Devuelve pares [timestamp_ms, count].
   */
  async getCriticalEventTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
    topic: string,
    payloadFilter?: Record<string, unknown>,
  ): Promise<Array<[number, number]>> {
    const matchStage: Record<string, unknown> = {
      topic,
      receivedAt: { $gte: from, $lte: to },
    };

    // Agregar filtros de payload si se especifican (ej. payload.alerta_humo: true)
    if (payloadFilter) {
      for (const [k, v] of Object.entries(payloadFilter)) {
        matchStage[`payload.${k}`] = v;
      }
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$receivedAt' }, intervalMs] } } },
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
   * Conteo total de eventos por topic y payload filter dentro de un rango de fechas.
   * Usado para los KPIs de eventos críticos (número absoluto, no serie temporal).
   */
  async countEvents(
    from: Date,
    to: Date,
    topic: string,
    payloadFilter?: Record<string, unknown>,
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      topic,
      receivedAt: { $gte: from, $lte: to },
    };
    if (payloadFilter) {
      for (const [k, v] of Object.entries(payloadFilter)) {
        filter[`payload.${k}`] = v;
      }
    }
    return this.collection.countDocuments(filter as never);
  }

  /**
   * Serie temporal de materiales procesados (aprobados + rechazados) por línea.
   * Lee sensor_events con topic 'ecosort/clasificador/material/resultado'.
   * Devuelve 3 series: plastico, vidrio, metal — pares [count, timestamp_ms].
   */
  async getMaterielesPorLineaTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Record<string, Array<[number, number]>>> {
    const pipeline = [
      {
        $match: {
          topic: 'ecosort/clasificador/material/resultado',
          receivedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            linea: '$payload.linea',
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$receivedAt' }, intervalMs] } } },
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

    const series: Record<string, Array<[number, number]>> = {
      plastico: [],
      vidrio:   [],
      metal:    [],
    };

    for (const r of results) {
      const id = r['_id'] as { linea: string; bucket: number };
      if (series[id.linea]) {
        series[id.linea]!.push([r['count'] as number, id.bucket]);
      }
    }
    return series;
  }

  /**
   * Serie temporal de materiales clasificados por código (0=Plástico, 1=Vidrio, 2=Metal).
   * Lee sensor_events con topic 'ecosort/clasificador/material/detectado'.
   * Devuelve 3 series: plastico, vidrio, metal — pares [count, timestamp_ms].
   */
  async getClasificadorColorTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Record<string, Array<[number, number]>>> {
    const codigoMap: Record<number, string> = { 0: 'plastico', 1: 'vidrio', 2: 'metal' };

    const pipeline = [
      {
        $match: {
          topic: 'ecosort/clasificador/material/detectado',
          receivedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            codigo: '$payload.codigo_material',
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$receivedAt' }, intervalMs] } } },
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

    const series: Record<string, Array<[number, number]>> = {
      plastico: [],
      vidrio:   [],
      metal:    [],
    };

    for (const r of results) {
      const id = r['_id'] as { codigo: number; bucket: number };
      const linea = codigoMap[id.codigo];
      if (linea && series[linea]) {
        series[linea]!.push([r['count'] as number, id.bucket]);
      }
    }
    return series;
  }

  /**
   * Serie temporal combinando TODOS los eventos (cualquier topic),
   * agrupada por bucket. Usada para el panel "Actividad del sistema".
   */
  async getAllEventsTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Array<[number, number]>> {
    const pipeline = [
      { $match: { receivedAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$receivedAt' }, intervalMs] } } },
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

export default new SensorEventModel();
