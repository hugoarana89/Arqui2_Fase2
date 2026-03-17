import { updateState } from '../../state/plantState.js';
import SensorEventModel from '../../models/sensorEvent.model.js';
import { emitStateUpdate } from '../../config/socket.js';
import type { HumoPayload } from '../../types/plant.types.js';

export const handleAlarmaHumo = async (payload: HumoPayload): Promise<void> => {
  updateState({
    alerta_humo: payload.alerta_humo,
    umbral_humo: payload.umbral,
  });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/seguridad/alarma/humo',
    'seguridad',
    payload as unknown as Record<string, unknown>,
  );
};
