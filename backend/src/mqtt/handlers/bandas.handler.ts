import { updateState } from '../../state/plantState.js';
import SensorEventModel from '../../models/sensorEvent.model.js';
import { emitStateUpdate } from '../../config/socket.js';

interface BandaPayloadGeneric extends Record<string, unknown> {
  timestamp: string;
}

const saveAndEmit = async (topic: string, updates: object, payload: BandaPayloadGeneric): Promise<void> => {
  updateState(updates);
  emitStateUpdate();
  await SensorEventModel.save(topic, 'banda', payload);
};

export const handleBandaPrincipal = (payload: { timestamp: string; banda_principal: boolean }): Promise<void> =>
  saveAndEmit('ecosort/procesamiento/bandas/principal', { banda_principal: payload.banda_principal }, payload);

export const handleBandaPlastico = (payload: { timestamp: string; banda_plastico: boolean }): Promise<void> =>
  saveAndEmit('ecosort/procesamiento/bandas/plastico', { banda_plastico: payload.banda_plastico }, payload);

export const handleBandaVidrio = (payload: { timestamp: string; banda_vidrio: boolean }): Promise<void> =>
  saveAndEmit('ecosort/procesamiento/bandas/vidrio', { banda_vidrio: payload.banda_vidrio }, payload);

export const handleBandaMetal = (payload: { timestamp: string; banda_metal: boolean }): Promise<void> =>
  saveAndEmit('ecosort/procesamiento/bandas/metal', { banda_metal: payload.banda_metal }, payload);
