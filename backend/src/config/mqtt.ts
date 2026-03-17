import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';

// ──────────────────────────────────────────────
//  Singleton del cliente MQTT
//  Se conecta al broker Mosquitto (Docker)
// ──────────────────────────────────────────────
let client: MqttClient | null = null;

export const getMqttClient = (): MqttClient => {
  if (!client) throw new Error('MQTT client no inicializado. Llama initMqttClient() primero.');
  return client;
};

export const initMqttClient = (): Promise<MqttClient> => {
  return new Promise((resolve, reject) => {
    const brokerUrl = process.env['MQTT_BROKER_URL'] ?? 'mqtt://localhost:1883';

    client = mqtt.connect(brokerUrl, {
      clientId: `ecosort_backend_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });

    client.on('connect', () => {
      console.log(`✅ Conectado al broker MQTT: ${brokerUrl}`);
      resolve(client!);
    });

    client.on('error', (err) => {
      console.error('❌ Error MQTT:', err.message);
      reject(err);
    });

    client.on('reconnect', () => {
      console.log('🔄 Reconectando al broker MQTT...');
    });

    client.on('offline', () => {
      console.warn('⚠️  MQTT client offline');
    });
  });
};

/**
 * Publica un mensaje en un topic MQTT.
 * Retorna una promesa que resuelve cuando el broker confirma el publish.
 */
export const publishMqtt = (topic: string, payload: Record<string, unknown>): Promise<void> => {
  return new Promise((resolve, reject) => {
    const c = getMqttClient();
    const message = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    });

    c.publish(topic, message, { qos: 1 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};
