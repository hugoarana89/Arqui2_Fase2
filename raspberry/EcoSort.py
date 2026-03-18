#!/usr/bin/env python3
"""
EcoSort MQTT Tester
Prueba los topics de Mosquitto MQTT para el backend de EcoSort.

Requiere: pip install paho-mqtt
"""

import json
import time
import threading
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

# ──────────────────────────────────────────────
#  CONFIGURACIÓN — cambiar a ip en producción
# ──────────────────────────────────────────────
MQTT_HOST = "localhost"
MQTT_PORT = 1883
MQTT_USER = ""          # Dejar vacío si no hay autenticación
MQTT_PASS = ""          # Dejar vacío si no hay autenticación
MQTT_CLIENT_ID = "ecosort_python"

# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────
def ts() -> str:
    """Timestamp ISO 8601 actual."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def pub(client: mqtt.Client, topic: str, payload: dict) -> None:
    data = json.dumps(payload)
    result = client.publish(topic, data, qos=1)
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"\n  ✅ Publicado en [{topic}]")
        print(f"     {data}")
    else:
        print(f"\n  ❌ Error al publicar en [{topic}] — código: {result.rc}")

# ──────────────────────────────────────────────
#  PARTE 2 — TOPICS DE ESCUCHA (nodejs → python)
# ──────────────────────────────────────────────
SUBSCRIBE_TOPICS = [
    "ecosort/comandos/linea/principal",
    "ecosort/comandos/linea/plastico",
    "ecosort/comandos/linea/vidrio",
    "ecosort/comandos/linea/metal",
    "ecosort/comandos/acceso/puerta",
    "ecosort/comandos/parqueo/talanquera",
    "ecosort/comandos/planta/iluminacion",
    "ecosort/comandos/seguridad/emergencia",
]

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("\n  🟢 Conectado a Mosquitto MQTT")
        for topic in SUBSCRIBE_TOPICS:
            client.subscribe(topic, qos=1)
        print(f"  📡 Suscrito a {len(SUBSCRIBE_TOPICS)} topics de comandos (nodejs → python)\n")
    else:
        codes = {
            1: "Protocolo no soportado",
            2: "ID de cliente rechazado",
            3: "Servidor no disponible",
            4: "Usuario/contraseña incorrectos",
            5: "No autorizado",
        }
        print(f"\n  ❌ Error de conexión: {codes.get(rc, f'código {rc}')}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        payload_str = json.dumps(payload, ensure_ascii=False, indent=4)
    except Exception:
        payload_str = msg.payload.decode()

    print(f"\n  📨 COMANDO RECIBIDO")
    print(f"  Topic  : {msg.topic}")
    print(f"  Payload: {payload_str}")
    print("\n  Elige una opción > ", end="", flush=True)

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print("\n  ⚠️  Desconectado inesperadamente. Reconectando...")

# ──────────────────────────────────────────────
#  PARTE 1 — MENÚ DE PUBLICACIÓN (python → nodejs)
# ──────────────────────────────────────────────
MENU = """
╔══════════════════════════════════════════════════════╗
║          EcoSort — MQTT Tester (Python)              ║
╠══════════════════════════════════════════════════════╣
║  🅿️  PARQUEOS                                        ║
║   1  → ecosort/planta/parqueos/estado                ║
║   2  → ecosort/parqueo/talanquera/estado             ║
║   3  → ecosort/parqueo/talanquera/alerta             ║
╠══════════════════════════════════════════════════════╣
║  🚪 ACCESO                                           ║
║   4  → ecosort/acceso/puerta/estado                  ║
║   5  → ecosort/acceso/puerta/alarma                  ║
╠══════════════════════════════════════════════════════╣
║  ⚙️  BANDAS DE PROCESAMIENTO                         ║
║   6  → ecosort/procesamiento/bandas/principal        ║
║   7  → ecosort/procesamiento/bandas/plastico         ║
║   8  → ecosort/procesamiento/bandas/vidrio           ║
║   9  → ecosort/procesamiento/bandas/metal            ║
╠══════════════════════════════════════════════════════╣
║  🔍 CLASIFICADOR                                     ║
║   10 → ecosort/clasificador/material/detectado       ║
║   11 → ecosort/clasificador/material/resultado       ║
╠══════════════════════════════════════════════════════╣
║  🔥 SEGURIDAD                                        ║
║   12 → ecosort/seguridad/alarma/humo                 ║
╠══════════════════════════════════════════════════════╣
║   0  → Salir                                         ║
╚══════════════════════════════════════════════════════╝
"""

def handle_option(client: mqtt.Client, option: str) -> bool:
    """Ejecuta la opción elegida. Retorna False si se quiere salir."""
    option = option.strip()

    if option == "0":
        return False

    elif option == "1":
        pub(client, "ecosort/planta/parqueos/estado", {
            "timestamp": ts(),
            "parqueos_ocupados": 3,
        })

    elif option == "2":
        pub(client, "ecosort/parqueo/talanquera/estado", {
            "timestamp": ts(),
            "talanquera_abierta": True,
        })

    elif option == "3":
        pub(client, "ecosort/parqueo/talanquera/alerta", {
            "timestamp": ts(),
            "alerta_parqueo_lleno": True,
        })

    elif option == "4":
        pub(client, "ecosort/acceso/puerta/estado", {
            "timestamp": ts(),
            "puerta_abierta": False,
        })

    elif option == "5":
        pub(client, "ecosort/acceso/puerta/alarma", {
            "timestamp": ts(),
            "alerta_rfid": True,
        })

    elif option == "6":
        pub(client, "ecosort/procesamiento/bandas/principal", {
            "timestamp": ts(),
            "banda_principal": True,
        })

    elif option == "7":
        pub(client, "ecosort/procesamiento/bandas/plastico", {
            "timestamp": ts(),
            "banda_plastico": True,
        })

    elif option == "8":
        pub(client, "ecosort/procesamiento/bandas/vidrio", {
            "timestamp": ts(),
            "banda_vidrio": True,
        })

    elif option == "9":
        pub(client, "ecosort/procesamiento/bandas/metal", {
            "timestamp": ts(),
            "banda_metal": True,
        })

    elif option == "10":
        pub(client, "ecosort/clasificador/material/detectado", {
            "timestamp": ts(),
            "codigo_material": 2,
        })

    elif option == "11":
        pub(client, "ecosort/clasificador/material/resultado", {
            "timestamp": ts(),
            "linea": "plastico",
            "resultado": "aprobado",
            "medicion": 85.4,
            "transparencia": 0.92,
        })

    elif option == "12":
        pub(client, "ecosort/seguridad/alarma/humo", {
            "timestamp": ts(),
            "alerta_humo": True,
            "umbral": 450,
        })

    else:
        print(f"  ⚠️  Opción '{option}' no reconocida. Intenta de nuevo.")

    return True

# ──────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────
def main():
    # Crear cliente
    client = mqtt.Client(client_id=MQTT_CLIENT_ID, clean_session=True)

    # Autenticación (si aplica)
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)

    # Callbacks
    client.on_connect    = on_connect
    client.on_message    = on_message
    client.on_disconnect = on_disconnect

    # Conectar
    print(f"\n  Conectando a {MQTT_HOST}:{MQTT_PORT} ...")
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    except ConnectionRefusedError:
        print(f"\n  ❌ No se pudo conectar a {MQTT_HOST}:{MQTT_PORT}")
        print("     Verifica que Mosquitto esté corriendo y que el host/puerto sean correctos.")
        return
    except Exception as e:
        print(f"\n  ❌ Error de conexión: {e}")
        return

    # Loop MQTT en hilo separado
    client.loop_start()
    time.sleep(1)  # Esperar a que on_connect dispare

    print(MENU)

    try:
        while True:
            option = input("  Elige una opción > ")
            if not handle_option(client, option):
                break
    except KeyboardInterrupt:
        print("\n\n  Interrumpido por el usuario.")
    finally:
        print("  Desconectando...")
        client.loop_stop()
        client.disconnect()
        print("  👋 Hasta luego.\n")

if __name__ == "__main__":
    main()
