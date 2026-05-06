import { Collection } from 'mongodb';
import DatabaseConnection from '../config/database.js';
import type { EppVerificationDocument } from '../types/plant.types.js';
import type { PlateDetectionDocument } from './plateDetection.model.js';

// ──────────────────────────────────────────────────────────────────────────────
//  GrafanaEppPlatesModel
//
//  Métodos de agregación pensados para los endpoints del GrafanaController:
//    · getEppTimeSeries  → "Evolución de verificaciones de EPP"
//    · getPlatesTimeSeries → "Desempeño del reconocimiento de placas"
//
//  Formato de salida (compatible con marcusolsson-json-datasource):
//    { target: string; datapoints: Array<[number, number]> }[]
//    donde cada datapoint es [valor, timestamp_ms].
// ──────────────────────────────────────────────────────────────────────────────

class GrafanaEppPlatesModel {

  // ── Colecciones ──────────────────────────────────────────────────────────────

  private get eppCollection(): Collection<EppVerificationDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance()
      .getCollection<EppVerificationDocument & Record<string, unknown>>('epp_verifications');
  }

  private get platesCollection(): Collection<PlateDetectionDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance()
      .getCollection<PlateDetectionDocument & Record<string, unknown>>('plate_detections');
  }

  // ── EPP ──────────────────────────────────────────────────────────────────────

  /**
   * Serie temporal de verificaciones EPP agrupadas por bucket de tiempo.
   *
   * Devuelve tres series:
   *   · epp_exitosas   → access_granted === true
   *   · epp_fallidas   → access_granted === false
   *   · epp_total      → todos los registros del rango
   *
   * Cada serie: Array<[count, timestamp_ms]>
   */
  async getEppTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Record<'epp_exitosas' | 'epp_fallidas' | 'epp_total', Array<[number, number]>>> {

    const bucketExpr = {
      $multiply: [
        { $toLong: { $floor: { $divide: [{ $toLong: '$createdAt' }, intervalMs] } } },
        intervalMs,
      ],
    };

    // Una sola pasada: agrupa por (access_granted, bucket)
    const pipeline = [
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            access_granted: '$access_granted',
            bucket: bucketExpr,
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.bucket': 1 } },
    ];

    const results = await this.eppCollection.aggregate(pipeline).toArray();

    // Acumuladores intermedios: bucket_ms → count
    const exitosasMap = new Map<number, number>();
    const fallidasMap = new Map<number, number>();

    for (const r of results) {
      const id = r['_id'] as { access_granted: boolean; bucket: number };
      const bucket: number = id.bucket;
      const count = r['count'] as number;

      if (id.access_granted) {
        exitosasMap.set(bucket, (exitosasMap.get(bucket) ?? 0) + count);
      } else {
        fallidasMap.set(bucket, (fallidasMap.get(bucket) ?? 0) + count);
      }
    }

    // Unión de todos los buckets para calcular el total
    const allBuckets = new Set([...exitosasMap.keys(), ...fallidasMap.keys()]);
    const sortedBuckets = [...allBuckets].sort((a, b) => a - b);

    const epp_exitosas: Array<[number, number]> = [];
    const epp_fallidas: Array<[number, number]> = [];
    const epp_total:    Array<[number, number]> = [];

    for (const bucket of sortedBuckets) {
      const exitosas = exitosasMap.get(bucket) ?? 0;
      const fallidas = fallidasMap.get(bucket) ?? 0;
      epp_exitosas.push([exitosas, bucket]);
      epp_fallidas.push([fallidas, bucket]);
      epp_total.push([exitosas + fallidas, bucket]);
    }

    return { epp_exitosas, epp_fallidas, epp_total };
  }

  // ── Placas ───────────────────────────────────────────────────────────────────

  /**
   * Serie temporal del reconocimiento de placas agrupada por bucket de tiempo.
   *
   * Devuelve tres series según el campo `status` de PlateDetectionDocument:
   *   · placas_autorizadas    → status === 'autorizada'
   *   · placas_no_autorizadas → status === 'no_autorizada'
   *   · placas_no_detectadas  → status === 'no_detectada'
   *
   * Cada serie: Array<[count, timestamp_ms]>
   */
  async getPlatesTimeSeries(
    from: Date,
    to: Date,
    intervalMs: number,
  ): Promise<Record<
    'placas_autorizadas' | 'placas_no_autorizadas' | 'placas_no_detectadas',
    Array<[number, number]>
  >> {

    const bucketExpr = {
      $multiply: [
        { $toLong: { $floor: { $divide: [{ $toLong: '$timestamp' }, intervalMs] } } },
        intervalMs,
      ],
    };

    // Una sola pasada: agrupa por (status, bucket)
    const pipeline = [
      { $match: { timestamp: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            status: '$status',
            bucket: bucketExpr,
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.bucket': 1 } },
    ];

    const results = await this.platesCollection.aggregate(pipeline).toArray();

    // Acumuladores intermedios: bucket_ms → count por status
    const autorizadasMap    = new Map<number, number>();
    const noAutorizadasMap  = new Map<number, number>();
    const noDetectadasMap   = new Map<number, number>();

    for (const r of results) {
      const id = r['_id'] as { status: string; bucket: number };
      const bucket: number = id.bucket;
      const count = r['count'] as number;

      switch (id.status) {
        case 'autorizada':
          autorizadasMap.set(bucket, (autorizadasMap.get(bucket) ?? 0) + count);
          break;
        case 'no_autorizada':
          noAutorizadasMap.set(bucket, (noAutorizadasMap.get(bucket) ?? 0) + count);
          break;
        case 'no_detectada':
          noDetectadasMap.set(bucket, (noDetectadasMap.get(bucket) ?? 0) + count);
          break;
      }
    }

    // Unión de todos los buckets para mantener ejes alineados entre series
    const allBuckets = new Set([
      ...autorizadasMap.keys(),
      ...noAutorizadasMap.keys(),
      ...noDetectadasMap.keys(),
    ]);
    const sortedBuckets = [...allBuckets].sort((a, b) => a - b);

    const placas_autorizadas:    Array<[number, number]> = [];
    const placas_no_autorizadas: Array<[number, number]> = [];
    const placas_no_detectadas:  Array<[number, number]> = [];

    for (const bucket of sortedBuckets) {
      placas_autorizadas.push([autorizadasMap.get(bucket)   ?? 0, bucket]);
      placas_no_autorizadas.push([noAutorizadasMap.get(bucket) ?? 0, bucket]);
      placas_no_detectadas.push([noDetectadasMap.get(bucket)  ?? 0, bucket]);
    }

    return { placas_autorizadas, placas_no_autorizadas, placas_no_detectadas };
  }
}

export default new GrafanaEppPlatesModel();