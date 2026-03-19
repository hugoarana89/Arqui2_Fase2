import { Router, type Request, type Response, type NextFunction } from 'express';
import GrafanaController from '../controllers/grafana.controller.js';

// ──────────────────────────────────────────────────────────────────────────────
//  Rutas de Grafana JSON API
//
//  Protegidas con API key en header: x-grafana-key
//  Grafana llama estos endpoints server-side (desde el contenedor de Grafana),
//  no desde el navegador, por lo que JWT no aplica aquí.
//
//  Configuración en Grafana datasource:
//    URL: http://backend:4000/api/grafana          ← red interna Docker
//    Custom Header — Name:  x-grafana-key
//                  — Value: (el valor de GRAFANA_API_KEY en tu .env)
// ──────────────────────────────────────────────────────────────────────────────

const router = Router();

// ── Middleware de API key ──────────────────────────────────────────────────────
// Valida el header x-grafana-key en todas las rutas de este router.
// Si GRAFANA_API_KEY no está definida en .env, rechaza TODAS las peticiones
// para evitar dejar los endpoints accidentalmente abiertos en producción.
const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const configuredKey = process.env['GRAFANA_API_KEY'];

  if (!configuredKey) {
    res.status(503).json({
      message: 'GRAFANA_API_KEY no está configurada en el servidor. Define la variable de entorno.',
    });
    return;
  }

  const providedKey = req.headers['x-grafana-key'];

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({ message: 'API key inválida o ausente.' });
    return;
  }

  next();
};

// Health check — Grafana lo llama al guardar la datasource (también protegido)
router.get('/health', requireApiKey, (req, res) => GrafanaController.health(req, res));

// ── Endpoints de series temporales ────────────────────────────────────────────
router.post('/materiales-por-linea',  requireApiKey, (req, res, next) => GrafanaController.materialesPorLinea(req, res, next));
router.post('/clasificador-color',    requireApiKey, (req, res, next) => GrafanaController.clasificadorColor(req, res, next));
router.post('/parqueos-ocupacion',    requireApiKey, (req, res, next) => GrafanaController.parqueosOcupacion(req, res, next));
router.post('/eventos-criticos',      requireApiKey, (req, res, next) => GrafanaController.eventosCriticos(req, res, next));
router.post('/throughput',            requireApiKey, (req, res, next) => GrafanaController.throughput(req, res, next));

// ── Endpoints de tablas (KPIs) ────────────────────────────────────────────────
router.post('/kpis-produccion',       requireApiKey, (req, res, next) => GrafanaController.kpisProduccion(req, res, next));
router.post('/kpis-eventos-criticos', requireApiKey, (req, res, next) => GrafanaController.kpisEventosCriticos(req, res, next));
router.post('/actividad-sistema',     requireApiKey, (req, res, next) => GrafanaController.actividadSistema(req, res, next));

export default router;
