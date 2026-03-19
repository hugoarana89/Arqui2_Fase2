import type { MqttClient } from 'mqtt';
import { handleParqueosEstado, handleTalanqueraEstado, handleAlertaParqueo } from './handlers/parqueo.handler.js';
import { handlePuertaEstado, handleAlarmaRfid } from './handlers/acceso.handler.js';
import { handleBandaPrincipal, handleBandaPlastico, handleBandaVidrio, handleBandaMetal } from './handlers/bandas.handler.js';
import { handleMaterialDetectado, handleMaterialResultado } from './handlers/clasificador.handler.js';
import { handleAlarmaHumo } from './handlers/seguridad.handler.js';

// ──────────────────────────────────────────────
//  Topics de recepción (Raspberry → backend)
// ──────────────────────────────────────────────
const TOPICS = [
  'ecosort/planta/parqueos/estado',
  'ecosort/parqueo/talanquera/estado',
  'ecosort/parqueo/talanquera/alerta',
  'ecosort/acceso/puerta/estado',
  'ecosort/acceso/puerta/alarma',
  'ecosort/procesamiento/bandas/principal',
  'ecosort/procesamiento/bandas/plastico',
  'ecosort/procesamiento/bandas/vidrio',
  'ecosort/procesamiento/bandas/metal',
  'ecosort/clasificador/material/detectado',
  'ecosort/clasificador/material/resultado',
  'ecosort/seguridad/alarma/humo',
] as const;

type Topic = typeof TOPICS[number];

/** Suscribe al cliente MQTT a todos los topics y registra los handlers */
export const registerMqttSubscriptions = (client: MqttClient): void => {
  // Suscribir a todos los topics de una vez
  client.subscribe(TOPICS as unknown as string[], { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Error suscribiéndose a topics:', err.message);
      return;
    }
    console.log(`📡 Suscrito a ${TOPICS.length} topics MQTT`);
  });

  // Router de mensajes entrantes
  client.on('message', (topic: string, message: Buffer) => {
    let payload: Record<string, unknown>;

    // Parsear JSON — si falla, ignorar el mensaje
    try {
      payload = JSON.parse(message.toString()) as Record<string, unknown>;
    } catch {
      console.warn(`⚠️  Mensaje no-JSON en topic ${topic}: ${message.toString()}`);
      return;
    }

    console.log(`📨 MQTT [${topic}]:`, payload);

    // Dispatch al handler correspondiente
    const handler = topicHandlers[topic as Topic];
    if (handler) {
      handler(payload).catch((err: Error) =>
        console.error(`❌ Error en handler de ${topic}:`, err.message),
      );
    } else {
      console.warn(`⚠️  Sin handler para topic: ${topic}`);
    }
  });
};

// ── Mapa topic → handler ───────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topicHandlers: Record<Topic, (payload: any) => Promise<void>> = {
  'ecosort/planta/parqueos/estado':           handleParqueosEstado,
  'ecosort/parqueo/talanquera/estado':        handleTalanqueraEstado,
  'ecosort/parqueo/talanquera/alerta':        handleAlertaParqueo,
  'ecosort/acceso/puerta/estado':             handlePuertaEstado,
  'ecosort/acceso/puerta/alarma':             handleAlarmaRfid,
  'ecosort/procesamiento/bandas/principal':   handleBandaPrincipal,
  'ecosort/procesamiento/bandas/plastico':    handleBandaPlastico,
  'ecosort/procesamiento/bandas/vidrio':      handleBandaVidrio,
  'ecosort/procesamiento/bandas/metal':       handleBandaMetal,
  'ecosort/clasificador/material/detectado':  handleMaterialDetectado,
  'ecosort/clasificador/material/resultado':  handleMaterialResultado,
  'ecosort/seguridad/alarma/humo':            handleAlarmaHumo,
};
