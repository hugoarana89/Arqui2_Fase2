import type { Request, Response, NextFunction } from 'express';
import { publishMqtt } from '../config/mqtt.js';
import CommandLogModel from '../models/commandLog.model.js';
import { updateState } from '../state/plantState.js';
import { emitStateUpdate } from '../config/socket.js';
import { BadRequestError } from '../middlewares/error.middleware.js';
import { ObjectId } from 'mongodb';
import type {
  LineaComandoDTO,
  AccesoComandoDTO,
  IluminacionComandoDTO,
  EmergenciaComandoDTO,
} from '../types/plant.types.js';

// ──────────────────────────────────────────────
//  Helper: guarda el comando en DB y publica MQTT
// ──────────────────────────────────────────────
const sendCommand = async (
  topic: string,
  comando: string,
  payload: Record<string, unknown>,
  userId: string,
  userName: string,
): Promise<void> => {
  await publishMqtt(topic, payload);
  await CommandLogModel.save({
    topic,
    comando,
    payload,
    userId: new ObjectId(userId),
    userName,
    sentAt: new Date(),
    status: 'sent',
  });
};

class ControlController {

  // ── POST /api/control/linea ────────────────
  // Pausar / reanudar cualquier línea de producción
  async controlLinea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { comando, linea } = req.body as LineaComandoDTO;
      if (!comando || !linea) throw new BadRequestError('comando y linea son requeridos.');

      const validComandos = ['pausar', 'reanudar'];
      const validLineas   = ['principal', 'plastico', 'vidrio', 'metal'];
      if (!validComandos.includes(comando)) throw new BadRequestError(`comando debe ser: ${validComandos.join(' | ')}`);
      if (!validLineas.includes(linea))     throw new BadRequestError(`linea debe ser: ${validLineas.join(' | ')}`);

      const topicMap: Record<string, string> = {
        principal: 'ecosort/comandos/linea/principal',
        plastico:  'ecosort/comandos/linea/plastico',
        vidrio:    'ecosort/comandos/linea/vidrio',
        metal:     'ecosort/comandos/linea/metal',
      };
      const topic = topicMap[linea]!;
      const payload = { comando, linea, usuario: req.user!.email };

      // Actualizar estado local en RAM
      const bandaKey = linea === 'principal' ? 'banda_principal' : `banda_${linea}` as keyof import('../state/plantState.js').PlantState;
      updateState({ [bandaKey]: comando === 'reanudar' });
      emitStateUpdate();

      await sendCommand(topic, comando, payload, req.user!.userId, req.user!.name);

      res.status(200).json({ status: 'success', message: `Línea ${linea} ${comando === 'pausar' ? 'pausada' : 'reanudada'}.`, topic, payload });
    } catch (err) { next(err); }
  }

  // ── POST /api/control/acceso ───────────────
  // Abrir / cerrar puerta principal o talanquera
  async controlAcceso(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { comando, elemento } = req.body as AccesoComandoDTO;
      if (!comando || !elemento) throw new BadRequestError('comando y elemento son requeridos.');

      const validComandos  = ['abrir', 'cerrar'];
      const validElementos = ['puerta_principal', 'talanquera'];
      if (!validComandos.includes(comando))   throw new BadRequestError(`comando debe ser: ${validComandos.join(' | ')}`);
      if (!validElementos.includes(elemento)) throw new BadRequestError(`elemento debe ser: ${validElementos.join(' | ')}`);

      const topicMap: Record<string, string> = {
        puerta_principal: 'ecosort/comandos/acceso/puerta',
        talanquera:       'ecosort/comandos/parqueo/talanquera',
      };
      const topic = topicMap[elemento]!;
      const payload = { comando, elemento, usuario: req.user!.email };

      // Actualizar estado en RAM
      const isOpen = comando === 'abrir';
      if (elemento === 'puerta_principal') updateState({ puerta_abierta: isOpen });
      if (elemento === 'talanquera')       updateState({ talanquera_abierta: isOpen });
      emitStateUpdate();

      await sendCommand(topic, comando, payload, req.user!.userId, req.user!.name);

      res.status(200).json({ status: 'success', message: `${elemento} ${isOpen ? 'abierta' : 'cerrada'}.`, topic, payload });
    } catch (err) { next(err); }
  }

  // ── POST /api/control/iluminacion ─────────
  async controlIluminacion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { comando } = req.body as IluminacionComandoDTO;
      if (!comando) throw new BadRequestError('comando es requerido.');

      const validComandos = ['encender', 'apagar'];
      if (!validComandos.includes(comando)) throw new BadRequestError(`comando debe ser: ${validComandos.join(' | ')}`);

      const topic = 'ecosort/comandos/planta/iluminacion';
      const payload = { comando, usuario: req.user!.email };

      updateState({ iluminacion: comando === 'encender' });
      emitStateUpdate();

      await sendCommand(topic, comando, payload, req.user!.userId, req.user!.name);

      res.status(200).json({ status: 'success', message: `Iluminación ${comando === 'encender' ? 'encendida' : 'apagada'}.`, topic, payload });
    } catch (err) { next(err); }
  }

  // ── POST /api/control/emergencia ──────────
  async controlEmergencia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { comando, motivo } = req.body as EmergenciaComandoDTO;
      if (!comando) throw new BadRequestError('comando es requerido.');

      const validComandos = ['activar', 'desactivar'];
      if (!validComandos.includes(comando)) throw new BadRequestError(`comando debe ser: ${validComandos.join(' | ')}`);

      const isActive = comando === 'activar';
      const topic = 'ecosort/comandos/seguridad/emergencia';
      const payload: Record<string, unknown> = {
        comando,
        estado: isActive ? 1 : 0,
        usuario: req.user!.email,
        ...(isActive && motivo ? { motivo } : {}),
      };

      updateState({ modo_emergencia: isActive });
      emitStateUpdate();

      await sendCommand(topic, comando, payload, req.user!.userId, req.user!.name);

      res.status(200).json({ status: 'success', message: `Modo emergencia ${isActive ? 'activado' : 'desactivado'}.`, topic, payload });
    } catch (err) { next(err); }
  }
}

export default new ControlController();
