import { getSocketServer } from '../../config/socket.js';
import DatabaseConnection from '../../config/database.js';

interface PredictionPayload {
  linea: string;
  porcentaje_actual: number;
  minutos_restantes: number | null;
  estado: 'OPERANDO' | 'LLENA' | 'SIN_FLUJO';
  color_semaforo: string;
  timestamp: string;
}

/**
 * Maneja las predicciones de llenado de bodegas recibidas via MQTT
 * desde el servicio de predicción en Python
 */
export const handlePrediccionBodega = async (payload: PredictionPayload): Promise<void> => {
  try {
    console.log(`📊 Predicción recibida para bodega ${payload.linea}:`, payload);

    // Guardar en MongoDB
    const db = DatabaseConnection.getInstance().getDb();
    const collection = db.collection('bodega_predictions');
    
    await collection.insertOne({
      linea: payload.linea,
      porcentaje_actual: payload.porcentaje_actual,
      minutos_restantes: payload.minutos_restantes,
      estado: payload.estado,
      color_semaforo: payload.color_semaforo,
      timestamp: new Date(payload.timestamp),
      createdAt: new Date()
    });

    // Emitir via WebSocket para el frontend
    const io = getSocketServer();
    if (io) {
      io.emit('prediction_update', {
        linea: payload.linea,
        porcentaje_actual: payload.porcentaje_actual,
        minutos_restantes: payload.minutos_restantes,
        estado: payload.estado,
        color_semaforo: payload.color_semaforo,
        timestamp: payload.timestamp
      });
    }

  } catch (error) {
    console.error('❌ Error manejando predicción de bodega:', error);
  }
};
