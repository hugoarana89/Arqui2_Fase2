import { updateState } from '../../state/plantState.js';
import SensorEventModel from '../../models/sensorEvent.model.js';
import { emitStateUpdate } from '../../config/socket.js';
import type { PuertaPayload, AlarmRfidPayload } from '../../types/plant.types.js';

export const handlePuertaEstado = async (payload: PuertaPayload): Promise<void> => {
  updateState({ puerta_abierta: payload.puerta_abierta });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/acceso/puerta/estado',
    'acceso',
    payload as unknown as Record<string, unknown>,
  );
};

export const handleAlarmaRfid = async (payload: AlarmRfidPayload): Promise<void> => {
  updateState({ alerta_rfid: payload.alerta_rfid });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/acceso/puerta/alarma',
    'acceso',
    payload as unknown as Record<string, unknown>,
  );
};
