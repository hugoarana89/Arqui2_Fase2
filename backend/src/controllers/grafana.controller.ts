import type { Request, Response, NextFunction } from 'express';
import ClassificationResultModel from '../models/classificationResult.model.js';
import SensorEventModel from '../models/sensorEvent.model.js';
import CommandLogModel from '../models/commandLog.model.js';

// ──────────────────────────────────────────────────────────────────────────────
//  GrafanaController
//
//  Implementa el protocolo JSON API compatible con el plugin
//  "JSON API" y "Infinity datasource" de Grafana.
//
//  Todos los endpoints aceptan POST con body:
//  {
//    "range": { "from": "ISO8601", "to": "ISO8601" },
//    "interval": "1m" | "5m" | "1h" | ...,   ← string de Grafana
//    "intervalMs": 60000,                      ← milisegundos (Grafana lo calcula)
//    "targets": [{ "target": "nombre_serie" }]
//  }
//
//  Las series temporales devuelven formato timeseries:
//  [ { "target": "nombre", "datapoints": [[valor, ts_ms], ...] } ]
//
//  Las tablas devuelven formato table:
//  [ { "columns": [...], "rows": [[...], ...], "type": "table" } ]
// ──────────────────────────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parsea el rango de fechas del body de Grafana */
function parseRange(body: Record<string, unknown>): { from: Date; to: Date } {
  const range = body['range'] as { from?: string; to?: string } | undefined;
  const from = range?.from ? new Date(range.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = range?.to ? new Date(range.to) : new Date();
  return { from, to };
}

/**
 * Parsea el intervalMs del body.
 * Grafana envía el campo 'intervalMs' directamente (ej. 60000).
 * Fallback: parsear el string 'interval' (ej. "1m", "5m", "1h").
 */
function parseIntervalMs(body: Record<string, unknown>): number {
  if (typeof body['intervalMs'] === 'number' && body['intervalMs'] > 0) {
    return body['intervalMs'] as number;
  }
  const str = (body['interval'] as string | undefined) ?? '5m';
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 5 * 60 * 1000; // default 5 min
  const [, num, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return parseInt(num!) * (multipliers[unit!] ?? 60000);
}

// ── Controlador ────────────────────────────────────────────────────────────────
class GrafanaController {

  // ── GET /api/grafana/health ─────────────────────────────────────────────────
  // Grafana llama este endpoint para verificar que la datasource responde.
  health(_req: Request, res: Response): void {
    res.status(200).json({ status: 'ok' });
  }

  // ── POST /api/grafana/materiales-por-linea ──────────────────────────────────
  // Panel: "Cantidad de materiales procesados por las líneas a lo largo del tiempo"
  // Lee sensor_events topic 'ecosort/clasificador/material/resultado' (aprobados+rechazados).
  // Devuelve 3 series: plastico, vidrio, metal
  async materialesPorLinea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for materialesPorLinea with body:', body);
      const { from, to } = parseRange(body);
      const intervalMs = parseIntervalMs(body);

      const seriesData = await SensorEventModel.getMaterielesPorLineaTimeSeries(from, to, intervalMs);

      // Orden fijo: plastico[0], vidrio[1], metal[2]  (el dashboard los accede por índice)
      const response = [
        { target: 'plastico', datapoints: seriesData['plastico'] ?? [] },
        { target: 'vidrio', datapoints: seriesData['vidrio'] ?? [] },
        { target: 'metal', datapoints: seriesData['metal'] ?? [] },
      ];

      res.status(200).json(response);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/clasificador-color ────────────────────────────────────
  // Panel: "Materiales detectados por el clasificador a lo largo del tiempo"
  // Lee sensor_events topic 'ecosort/clasificador/material/detectado'.
  // codigo_material: 0=Plástico, 1=Vidrio, 2=Metal
  // Devuelve 3 series: plastico[0], vidrio[1], metal[2]
  async clasificadorColor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for clasificadorColor with body:', body);
      const { from, to } = parseRange(body);
      const intervalMs = parseIntervalMs(body);

      const seriesData = await SensorEventModel.getClasificadorColorTimeSeries(from, to, intervalMs);

      const response = [
        { target: 'plastico', datapoints: seriesData['plastico'] ?? [] },
        { target: 'vidrio', datapoints: seriesData['vidrio'] ?? [] },
        { target: 'metal', datapoints: seriesData['metal'] ?? [] },
      ];

      res.status(200).json(response);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/parqueos-ocupacion ────────────────────────────────────
  // Panel: "Ocupación de parqueos a lo largo del tiempo"
  // Devuelve 1 serie: parqueos_ocupados (valor en cada cambio de estado)
  async parqueosOcupacion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for parqueosOcupacion with body:', body);
      const { from, to } = parseRange(body);

      const datapoints = await SensorEventModel.getParqueosTimeSeries(from, to);

      res.status(200).json([{ target: 'parqueos_ocupados', datapoints }]);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/eventos-criticos ──────────────────────────────────────
  // Panel: "Eventos críticos — alarmas, humo, emergencias a lo largo del tiempo"
  // Devuelve 4 series: alarmas_humo, alertas_rfid, alertas_parqueo_lleno, paros_emergencia
  async eventosCriticos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for eventosCriticos with body:', body); 
      const { from, to } = parseRange(body);
      const intervalMs = parseIntervalMs(body);

      const [humo, rfid, parqueo, emergencia] = await Promise.all([
        // Detecciones de humo donde alerta_humo es true
        SensorEventModel.getCriticalEventTimeSeries(
          from, to, intervalMs,
          'ecosort/seguridad/alarma/humo',
          { alerta_humo: true },
        ),
        // Alarmas RFID donde alerta_rfid es true
        SensorEventModel.getCriticalEventTimeSeries(
          from, to, intervalMs,
          'ecosort/acceso/puerta/alarma',
          { alerta_rfid: true },
        ),
        // Alertas parqueo lleno
        SensorEventModel.getCriticalEventTimeSeries(
          from, to, intervalMs,
          'ecosort/parqueo/talanquera/alerta',
          { alerta_parqueo_lleno: true },
        ),
        // Paros de emergencia (desde commands_log, comando = 'activar')
        CommandLogModel.getCriticalCommandTimeSeries(
          from, to, intervalMs,
          'ecosort/comandos/seguridad/emergencia',
          'activar',
        ),
      ]);

      res.status(200).json([
        { target: 'alarmas_humo', datapoints: humo },
        { target: 'alertas_rfid', datapoints: rfid },
        { target: 'alertas_parqueo_lleno', datapoints: parqueo },
        { target: 'paros_emergencia', datapoints: emergencia },
      ]);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/throughput ────────────────────────────────────────────
  // Panel: "Throughput — elementos procesados por unidad de tiempo"
  // Devuelve 1 serie: throughput (count por bucket)
  async throughput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for throughput with body:', body);
      const { from, to } = parseRange(body);
      const intervalMs = parseIntervalMs(body);

      const datapoints = await ClassificationResultModel.getThroughput(from, to, intervalMs);

      res.status(200).json([{ target: 'throughput', datapoints }]);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/kpis-produccion ──────────────────────────────────────
  // Panel: Tabla de KPIs de producción y rechazos por línea
  // Devuelve formato TABLE de Grafana
  async kpisProduccion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for kpisProduccion with body:', body);
      const { from, to } = parseRange(body);

      const { porLinea } = await ClassificationResultModel.getKpisProduccion(from, to);

      // Tabla principal: producción por línea
      const produccionTable = {
        type: 'table',
        columns: [
          { text: 'Línea', type: 'string' },
          { text: 'Aprobados', type: 'number' },
          { text: 'Rechazados', type: 'number' },
          { text: 'Total procesados', type: 'number' },
          { text: 'Tasa aprobación', type: 'string' },
        ],
        rows: porLinea.map((r) => [
          r.linea,
          r.aprobados,
          r.rechazados,
          r.total,
          r.tasa_aprobacion,
        ]),
      };

      res.status(200).json([produccionTable]);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/kpis-eventos-criticos ─────────────────────────────────
  // Panel: Tabla de KPIs de eventos críticos (conteos absolutos)
  async kpisEventosCriticos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for kpisEventosCriticos with body:', body);
      const { from, to } = parseRange(body);

      const [
        activacionesHumo,
        alertasRfid,
        alertasParqueoLleno,
        parosEmergencia,
        bodegaPlasticoLlena,
        bodegaVidrioLlena,
        bodegaMetalLlena,
      ] = await Promise.all([
        SensorEventModel.countEvents(from, to, 'ecosort/seguridad/alarma/humo', { alerta_humo: true }),
        SensorEventModel.countEvents(from, to, 'ecosort/acceso/puerta/alarma', { alerta_rfid: true }),
        SensorEventModel.countEvents(from, to, 'ecosort/parqueo/talanquera/alerta', { alerta_parqueo_lleno: true }),
        CommandLogModel.countCommands(from, to, 'ecosort/comandos/seguridad/emergencia', 'activar'),
        // Bodega llena = almacen llegó al 100%
        ClassificationResultModel.getKpisProduccion(from, to).then(
          (r) => Promise.resolve(r.bodegas_llenas['plastico'] ?? 0),
        ),
        ClassificationResultModel.getKpisProduccion(from, to).then(
          (r) => Promise.resolve(r.bodegas_llenas['vidrio'] ?? 0),
        ),
        ClassificationResultModel.getKpisProduccion(from, to).then(
          (r) => Promise.resolve(r.bodegas_llenas['metal'] ?? 0),
        ),
      ]);

      const table = {
        type: 'table',
        columns: [
          { text: 'Evento crítico', type: 'string' },
          { text: 'Cantidad', type: 'number' },
        ],
        rows: [
          ['Activaciones sensor de humo', activacionesHumo],
          ['Paros de emergencia (activados)', parosEmergencia],
          ['Alertas RFID (acceso inválido)', alertasRfid],
          ['Alertas parqueo lleno', alertasParqueoLleno],
          ['Bodega plástico llena (100%)', bodegaPlasticoLlena],
          ['Bodega vidrio llena (100%)', bodegaVidrioLlena],
          ['Bodega metal llena (100%)', bodegaMetalLlena],
        ],
      };

      res.status(200).json([table]);
    } catch (err) { next(err); }
  }

  // ── POST /api/grafana/actividad-sistema ─────────────────────────────────────
  // Panel: "Actividad del sistema — densidad de eventos a lo largo del tiempo"
  // Combina sensor_events + classification_results + commands_log
  // Devuelve 3 series apilables: eventos_sensores, clasificaciones, comandos
  async actividadSistema(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      console.log('Received request for actividadSistema with body:', body);
      const { from, to } = parseRange(body);
      const intervalMs = parseIntervalMs(body);

      const [sensorEvents, clasificaciones, comandos] = await Promise.all([
        SensorEventModel.getAllEventsTimeSeries(from, to, intervalMs),
        ClassificationResultModel.getActivityTimeSeries(from, to, intervalMs),
        CommandLogModel.getAllCommandsTimeSeries(from, to, intervalMs),
      ]);

      res.status(200).json([
        { target: 'eventos_sensores', datapoints: sensorEvents },
        { target: 'clasificaciones', datapoints: clasificaciones },
        { target: 'comandos_enviados', datapoints: comandos },
      ]);
    } catch (err) { next(err); }
  }
}

export default new GrafanaController();
