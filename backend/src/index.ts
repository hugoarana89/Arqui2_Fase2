import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import DatabaseConnection from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] ?? 3000;

// ── Middlewares ───────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ── Rutas ─────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'API operativa 🚀' });
});

// ── Rutas no encontradas (404) ────────────────
// Debe ir después de todas las rutas definidas
app.use(notFoundHandler);

// ── Manejador global de errores ───────────────
// Debe ser el ÚLTIMO middleware (4 parámetros)
app.use(globalErrorHandler);

// ── Iniciar servidor ──────────────────────────
async function bootstrap(): Promise<void> {
  await DatabaseConnection.getInstance().connect();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   POST  /api/auth/register`);
    console.log(`   POST  /api/auth/login`);
    console.log(`   POST  /api/auth/forgot-password`);
    console.log(`   POST  /api/auth/reset-password`);
    console.log(`   PUT   /api/auth/change-password  🔒`);
    console.log(`   GET   /api/auth/me               🔒`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Error al iniciar la aplicación:', err);
  process.exit(1);
});
