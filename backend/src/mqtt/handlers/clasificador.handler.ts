import { updateState, incrementAlmacen } from '../../state/plantState.js';
import SensorEventModel from '../../models/sensorEvent.model.js';
import ClassificationResultModel from '../../models/classificationResult.model.js';
import { emitStateUpdate } from '../../config/socket.js';
import type { MaterialDetectadoPayload, MaterialResultadoPayload } from '../../types/plant.types.js';

export const handleMaterialDetectado = async (payload: MaterialDetectadoPayload): Promise<void> => {
  updateState({ codigo_material: payload.codigo_material });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/clasificador/material/detectado',
    'clasificador',
    payload as unknown as Record<string, unknown>,
  );
};

export const handleMaterialResultado = async (payload: MaterialResultadoPayload): Promise<void> => {
  let porcentaje_tras_evento: number | null = null;

  // Si el resultado es aprobado → incrementar contador del almacén
  if (payload.resultado === 'aprobado') {
    porcentaje_tras_evento = incrementAlmacen(payload.linea);
  }

  emitStateUpdate();

  // Guardar en sensor_events (raw)
  await SensorEventModel.save(
    'ecosort/clasificador/material/resultado',
    'clasificador',
    payload as unknown as Record<string, unknown>,
  );

  // Guardar en classification_results (tipado)
  await ClassificationResultModel.save({
    linea: payload.linea,
    resultado: payload.resultado,
    medicion: payload.medicion ?? null,
    transparencia: payload.transparencia ?? null,
    porcentaje_almacen_tras_evento: porcentaje_tras_evento,
    timestamp: new Date(payload.timestamp),
  });
};
