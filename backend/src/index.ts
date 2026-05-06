import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import platesRoutes from './routes/plates.routes.js';
import DatabaseConnection from './config/database.js';
import { initMqttClient } from './config/mqtt.js';
import { initSocketServer } from './config/socket.js';
import { registerMqttSubscriptions } from './mqtt/mqttSubscriber.js';

import authRoutes       from './routes/auth.routes.js';
import controlRoutes    from './routes/control.routes.js';
import monitoringRoutes from './routes/monitoring.routes.js';
import grafanaRoutes    from './routes/grafana.routes.js';
import eppRoutes        from './routes/epp.routes.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app  = express();
const PORT = process.env['PORT'] ?? 4000;

// ── Middlewares ───────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] ?? '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// ── Rutas HTTP ────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/control',    controlRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/grafana',    grafanaRoutes);
app.use('/api/epp',        eppRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'EcoSort API operativa 🚀' });
});

app.use('/api/plates', platesRoutes);



// ── Manejadores de error ──────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Bootstrap ─────────────────────────────────
async function bootstrap(): Promise<void> {
  await DatabaseConnection.getInstance().connect();

  const httpServer = createServer(app);
  initSocketServer(httpServer);

  const mqttClient = await initMqttClient();
  registerMqttSubscriptions(mqttClient);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 EcoSort API corriendo en http://localhost:${PORT}`);

    console.log(`\n📋 Endpoints AUTH:`);
    console.log(`   POST  /api/auth/register`);
    console.log(`   POST  /api/auth/login`);
    console.log(`   POST  /api/auth/forgot-password`);
    console.log(`   POST  /api/auth/reset-password`);
    console.log(`   PUT   /api/auth/change-password     🔒`);
    console.log(`   GET   /api/auth/me                  🔒`);

    console.log(`\n📋 Endpoints CONTROL (🔒 JWT requerido):`);
    console.log(`   POST  /api/control/linea`);
    console.log(`   POST  /api/control/acceso`);
    console.log(`   POST  /api/control/iluminacion`);
    console.log(`   POST  /api/control/emergencia`);

    console.log(`\n📋 Endpoints MONITORING (🔒 JWT requerido):`);
    console.log(`   GET   /api/monitoring/state`);
    console.log(`   GET   /api/monitoring/events`);
    console.log(`   GET   /api/monitoring/classifications`);
    console.log(`   GET   /api/monitoring/classifications/stats`);
    console.log(`   GET   /api/monitoring/commands`);

    console.log(`\n📊 Endpoints GRAFANA (sin JWT, server-side):`);
    console.log(`   GET   /api/grafana/health`);
    console.log(`   POST  /api/grafana/materiales-por-linea`);
    console.log(`   POST  /api/grafana/parqueos-ocupacion`);
    console.log(`   POST  /api/grafana/eventos-criticos`);
    console.log(`   POST  /api/grafana/throughput`);
    console.log(`   POST  /api/grafana/kpis-produccion`);
    console.log(`   POST  /api/grafana/kpis-eventos-criticos`);
    console.log(`   POST  /api/grafana/actividad-sistema`);

    console.log(`\n🦺 Endpoints EPP:`);
    console.log(`   POST  /api/epp/verify               (dispositivo)`);
    console.log(`   GET   /api/epp/verifications        🔒`);
    console.log(`   GET   /api/epp/health`);

    console.log(`\n🚗 Endpoints PLATES:`);
    console.log(`   POST  /api/plates/detect            (dispositivo)`);
    console.log(`   POST  /api/plates/validate          (dispositivo)`);
    console.log(`   GET   /api/plates/authorized        🔒`);
    console.log(`   POST  /api/plates/authorized        🔒`);
    console.log(`   PUT   /api/plates/authorized/:id    🔒`);
    console.log(`   DELETE /api/plates/authorized/:id   🔒`);
    console.log(`   GET   /api/plates/detections        🔒`);

    console.log(`\n🔌 WebSocket en ws://localhost:${PORT} (evento: state_update)`);
  });
}

bootstrap().catch((err: Error) => {
  console.error('❌ Error al iniciar la aplicación:', err.message);
  process.exit(1);
});
