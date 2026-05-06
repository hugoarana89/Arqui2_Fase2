import { getSocketServer } from '../../config/socket.js';
import DatabaseConnection from '../../config/database.js';

export const handlePrediccionBodega = async (payload: any) => {
  try {
    console.log(`📊 Predicción recibida:`, payload);
    
    const db = DatabaseConnection.getInstance().getDb();
    const collection = db.collection('bodega_predictions');
    
    await collection.insertOne({
      linea: payload.linea,
      porcentaje_actual: payload.porcentaje_actual,
      minutos_restantes: payload.minutos_restantes,
      estado: payload.estado,
      color_semaforo: payload.color_semaforo,
      velocidad_llenado: payload.velocidad_llenado,
      timestamp: new Date(payload.timestamp),
      createdAt: new Date()
    });
    
    const io = getSocketServer();
    if (io) {
      io.emit('prediction_update', payload);
      console.log(`📡 Predicción emitida por WebSocket`);
    }
    
  } catch (error) {
    console.error('❌ Error manejando predicción:', error);
  }
};
