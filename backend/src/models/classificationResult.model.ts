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

  /** Estadísticas globales de aprobados/rechazados por línea (sin filtro de fechas) */
  async getStats(): Promise<Record<string, { aprobados: number; rechazados: number }>> {
    const pipeline = [
      { $group: { _id: { linea: '$linea', resultado: '$resultado' }, count: { $sum: 1 } } },
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

  // ── Nuevos métodos para Grafana ────────────────────────────────────────────

  /**
   * Serie temporal de materiales procesados agrupados por bucket de tiempo.
   * Devuelve puntos [timestamp_ms, count] por cada combinación linea+resultado.
   * intervalMs: tamaño del bucket en milisegundos (ej. 60000 = 1 min).
   */
  async getTimeSeriesByLinea(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Record<string, Array<[number, number]>>> {
    const pipeline = [
      { $match: { timestamp: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            linea:     '$linea',
            resultado: '$resultado',
            // Truncar al bucket: floor(timestamp / interval) * interval
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$timestamp' }, intervalMs] } } },
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

    // Inicializar las 6 series
    const series: Record<string, Array<[number, number]>> = {
      plastico_aprobados:  [],
      plastico_rechazados: [],
      vidrio_aprobados:    [],
      vidrio_rechazados:   [],
      metal_aprobados:     [],
      metal_rechazados:    [],
    };

    for (const r of results) {
      const id = r['_id'] as { linea: string; resultado: string; bucket: number };
      const key = `${id.linea}_${id.resultado}`;
      if (series[key]) {
        series[key]!.push([r['count'] as number, id.bucket]);
      }
    }
    return series;
  }

  /**
   * Throughput: cantidad de elementos procesados (cualquier resultado) por bucket temporal.
   * Devuelve pares [timestamp_ms, count].
   */
  async getThroughput(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Array<[number, number]>> {
    const pipeline = [
      { $match: { timestamp: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            bucket: {
              $multiply: [
                { $toLong: { $floor: { $divide: [{ $toLong: '$timestamp' }, intervalMs] } } },
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
   
  /* Devuelve conteos de aprobados, rechazados y total por línea,
   * más conteo de bodegas llenas (porcentaje_almacen_tras_evento = 100).
   */
  async getKpisProduccion(from: Date, to: Date): Promise<{
    porLinea: Array<{
      linea: string;
      aprobados: number;
      rechazados: number;
      total: number;
      tasa_aprobacion: string;
    }>;
    bodegas_llenas: Record<string, number>;
  }> {
    // Conteo por línea y resultado
    const pipeline = [
      { $match: { timestamp: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { linea: '$linea', resultado: '$resultado' },
          count: { $sum: 1 },
        },
      },
    ];
    const results = await this.collection.aggregate(pipeline).toArray();

    const counts: Record<string, { aprobados: number; rechazados: number }> = {
      plastico: { aprobados: 0, rechazados: 0 },
      vidrio:   { aprobados: 0, rechazados: 0 },
      metal:    { aprobados: 0, rechazados: 0 },
    };
    for (const r of results) {
      const id = r['_id'] as { linea: string; resultado: string };
      if (counts[id.linea]) {
        if (id.resultado === 'aprobado')  counts[id.linea]!.aprobados  = r['count'] as number;
        if (id.resultado === 'rechazado') counts[id.linea]!.rechazados = r['count'] as number;
      }
    }

    const porLinea = ['plastico', 'vidrio', 'metal'].map((linea) => {
      const { aprobados, rechazados } = counts[linea]!;
      const total = aprobados + rechazados;
      return {
        linea,
        aprobados,
        rechazados,
        total,
        tasa_aprobacion: total > 0 ? `${((aprobados / total) * 100).toFixed(1)}%` : '0%',
      };
    });

    // Bodegas llenas: porcentaje_almacen_tras_evento === 100 por línea
    const bodegaPipeline = [
      {
        $match: {
          timestamp: { $gte: from, $lte: to },
          porcentaje_almacen_tras_evento: 100,
          resultado: 'aprobado',
        },
      },
      { $group: { _id: '$linea', count: { $sum: 1 } } },
    ];
    const bodegaResults = await this.collection.aggregate(bodegaPipeline).toArray();
    const bodegas_llenas: Record<string, number> = { plastico: 0, vidrio: 0, metal: 0 };
    for (const r of bodegaResults) {
      const linea = r['_id'] as string;
      if (bodegas_llenas[linea] !== undefined) {
        bodegas_llenas[linea] = r['count'] as number;
      }
    }

    return { porLinea, bodegas_llenas };
  }

  /**
   * Actividad total (todos los registros) agrupada por bucket temporal.
   * Usada para el panel de "Actividad del sistema".
   */
  async getActivityTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Array<[number, number]>> {
    return this.getThroughput(from, to, intervalMs);
  }
}

export default new ClassificationResultModel();
