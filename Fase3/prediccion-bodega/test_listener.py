#!/usr/bin/env python3
"""
Cliente MQTT para escuchar predicciones
"""

import paho.mqtt.client as mqtt
import json
import os
from dotenv import load_dotenv

load_dotenv()

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload)
        print(f"\n📡 [{msg.topic}]")
        print(json.dumps(data, indent=2))
    except:
        print(f"\n📡 [{msg.topic}] {msg.payload}")

def main():
    host = os.getenv('MQTT_BROKER_URL', '34.9.126.151')
    port = int(os.getenv('MQTT_BROKER_PORT', 1883))
    
    # Usar callback API version 2 para evitar warning
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    
    print(f"🔌 Conectando a {host}:{port}...")
    client.connect(host, port, 60)
    
    client.subscribe("ecosort/predicciones/bodega/#")
    print("✅ Suscrito a predicciones de bodegas")
    print("Esperando mensajes... (Ctrl+C para salir)\n")
    
    client.loop_forever()

if __name__ == '__main__':
    main()