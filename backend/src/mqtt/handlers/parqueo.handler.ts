import { updateState } from '../../state/plantState.js';
import SensorEventModel from '../../models/sensorEvent.model.js';
import { emitStateUpdate } from '../../config/socket.js';
import type { ParqueosPayload, TalanqueraPayload, AlertaParqueoPayload } from '../../types/plant.types.js';

export const handleParqueosEstado = async (payload: ParqueosPayload): Promise<void> => {
  updateState({ parqueos_ocupados: payload.parqueos_ocupados });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/planta/parqueos/estado',
    'parqueo',
    payload as unknown as Record<string, unknown>,
  );
};

export const handleTalanqueraEstado = async (payload: TalanqueraPayload): Promise<void> => {
  updateState({ talanquera_abierta: payload.talanquera_abierta });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/parqueo/talanquera/estado',
    'parqueo',
    payload as unknown as Record<string, unknown>,
  );
};

export const handleAlertaParqueo = async (payload: AlertaParqueoPayload): Promise<void> => {
  updateState({ alerta_parqueo_lleno: payload.alerta_parqueo_lleno });
  emitStateUpdate();
  await SensorEventModel.save(
    'ecosort/parqueo/talanquera/alerta',
    'parqueo',
    payload as unknown as Record<string, unknown>,
  );
};
