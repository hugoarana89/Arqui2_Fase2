#!/usr/bin/env python3
"""
Cliente MQTT para escuchar predicciones de las 3 bodegas
"""

import paho.mqtt.client as mqtt
import json
import os
from dotenv import load_dotenv

load_dotenv()

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload)
        emoji = {'VERDE': '🟢', 'AMARILLO': '🟡', 'ROJO': '🔴', 'APAGADO': '⚫'}.get(data.get('color_semaforo'), '⚪')
        minutos = data.get('minutos_restantes', 'N/A')
        print(f"{emoji} [{data['linea'].upper()}] {data['porcentaje_actual']:.1f}% → {minutos} min ({data['estado']})")
    except Exception as e:
        print(f"📡 {msg.topic}: {msg.payload}")

def main():
    host = os.getenv('MQTT_BROKER_URL', '172.17.0.1')
    port = int(os.getenv('MQTT_BROKER_PORT', 1883))
    
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    client.connect(host, port, 60)
    client.subscribe("ecosort/predicciones/bodega/#")
    
    print("🔌 Escuchando predicciones de bodegas... (Ctrl+C para salir)\n")
    client.loop_forever()

if __name__ == '__main__':
    main()
