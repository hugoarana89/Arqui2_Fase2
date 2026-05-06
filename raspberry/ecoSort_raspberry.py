#!/usr/bin/env python3
from __future__ import annotations

"""
EcoSort — Raspberry Pi
Comunicación serial con Arduino + MQTT con backend Node.js.
Captura de webcam y envío a servicio ML de reconocimiento de placas.

Requiere:
    pip install paho-mqtt
    pip install pyserial
    pip install opencv-python
    pip install requests
"""

import json
import base64
import time
import threading
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
import serial
import cv2
import requests
import os

# ══════════════════════════════════════════════════════════════
#  CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════

# Arduino
ARDUINO_PORT = "COM6"   # Nombre del puerto serial del arduino, ejp: /dev/ttyUSB0 en Linux o COM3 en Windows
BAUD_RATE    = 115200 # En el arduinio debe estar configurado con la misma velocidad de baudios
TIMEOUT      = 1                # segundos

# MQTT
MQTT_HOST      = "34.9.126.151"
MQTT_PORT      = 1883
MQTT_USER      = ""
MQTT_PASS      = ""
MQTT_CLIENT_ID = "ecosort_python"

# 🎥 Webcam y Servicio ML
WEBCAM_DEVICE_ID    = 0              # ID de la cámara (0 = cámara predeterminada)
BACKEND_API_URL     = os.getenv("BACKEND_API_URL", "http://localhost:4000")
BACKEND_EPP_ENDPOINT = f"{BACKEND_API_URL}/api/epp/verify"
BACKEND_PLATES_DETECT_ENDPOINT = f"{BACKEND_API_URL}/api/plates/detect"
BACKEND_PLATES_VALIDATE_ENDPOINT = f"{BACKEND_API_URL}/api/plates/validate"
CAPTURE_TIMEOUT     = 5              # segundos para timeout de la captura
CAPTURE_RETRIES     = 3              # intentos de captura

# ══════════════════════════════════════════════════════════════
#  ESTADO GLOBAL
# ══════════════════════════════════════════════════════════════

# 🅿️  Parqueo
num_parqueos_ocupados = -1
talanquera_abierta    = False
talanquera_alerta     = False

# 🚪 Acceso
puerta_abierta = False
puerta_alarma  = False

# ⚙️  Bandas
banda_principal_activa = False
banda_plastico_activa  = False
banda_vidrio_activa    = False
banda_metal_activa     = False

# 🔍 Clasificador
material_detectado    = None
resultado_clasificador = {"plastico": None, "vidrio": None, "metal": None}

# 🚨 Alarma de humo
alarma_humo_activa = False

# ⏳ Estados de ejecución para evitar capturas duplicadas
epp_verification_in_progress = False
plate_capture_in_progress = False


# ══════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════

def ts() -> str:
    """Timestamp ISO 8601 UTC."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def to_bool(value: str) -> bool:
    """Convierte 'true'/'false' (string) a booleano Python."""
    return value.strip().lower() == "true"


def pub(client: mqtt.Client, topic: str, payload: dict) -> None:
    """Publica un dict como JSON en el topic indicado."""
    data   = json.dumps(payload)
    result = client.publish(topic, data, qos=1)
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"  ✅ Publicado [{topic}]  →  {data}")
    else:
        print(f"  ❌ Error al publicar [{topic}] — código: {result.rc}")


# ══════════════════════════════════════════════════════════════
#  SERVICIO ML DE RECONOCIMIENTO DE PLACAS
# ══════════════════════════════════════════════════════════════

def send_frame_to_backend_plate_service(frame_bytes: bytes) -> dict | None:
    """
    Envía un frame de imagen al backend para que lo reenvíe al servicio ML de placas.
    Retorna el resultado de la detección o None si hay error.
    """
    if not frame_bytes:
        print("⚠️  No hay datos de frame para enviar al backend de placas")
        return None
    
    try:
        image_base64 = base64.b64encode(frame_bytes).decode("utf-8")
        response = requests.post(
            BACKEND_PLATES_DETECT_ENDPOINT,
            json={
                "imageBase64": image_base64,
                "source": "raspberry",
            },
            timeout=CAPTURE_TIMEOUT
        )
        
        if response.status_code == 200:
            payload = response.json()
            result = payload.get("data", payload) if isinstance(payload, dict) else payload
            print(f"  ✅ Backend plate response: {result}")
            return result
        else:
            print(f"⚠️  Error del backend de placas (status: {response.status_code})")
            return None
            
    except requests.exceptions.Timeout:
        print(f"⚠️  Timeout al conectar con backend de placas en {CAPTURE_TIMEOUT}s")
        return None
    except requests.exceptions.ConnectionError:
        print(f"⚠️  No se pudo conectar al backend de placas: {BACKEND_PLATES_DETECT_ENDPOINT}")
        return None
    except Exception as e:
        print(f"❌ Error al enviar frame al backend de placas: {e}")
        return None


def validate_plate_with_backend(plate: str | None, confidence: float | None) -> dict | None:
    """
    Envía el resultado de detección al backend para registrar y validar la placa.
    """
    try:
        response = requests.post(
            BACKEND_PLATES_VALIDATE_ENDPOINT,
            json={
                "plate": plate,
                "confidence": confidence,
                "source": "raspberry",
            },
            timeout=CAPTURE_TIMEOUT,
        )

        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ Validación de placa: {result}")
            return result

        print(f"⚠️  Backend de validación de placas respondió status {response.status_code}: {response.text}")
        return None
    except requests.exceptions.Timeout:
        print(f"⚠️  Timeout al conectar backend de validación de placas en {CAPTURE_TIMEOUT}s")
    except requests.exceptions.ConnectionError:
        print(f"⚠️  No se pudo conectar al backend de validación de placas: {BACKEND_PLATES_VALIDATE_ENDPOINT}")
    except Exception as e:
        print(f"❌ Error validando placa: {e}")

    return None


def start_epp_verification() -> None:
    """Lanza la verificación EPP una sola vez por evento de apertura de puerta."""
    global epp_verification_in_progress, webcam_instance

    if not webcam_instance:
        print("⚠️  Webcam no disponible para verificación EPP")
        return

    if epp_verification_in_progress:
        print("ℹ️  Verificación EPP ya en curso")
        return

    def _worker() -> None:
        global epp_verification_in_progress
        try:
            capture_and_verify_epp(webcam_instance)
        finally:
            epp_verification_in_progress = False

    epp_verification_in_progress = True
    threading.Thread(target=_worker, daemon=True).start()


def start_plate_capture() -> None:
    """Lanza la detección de placa una sola vez por evento de vehículo."""
    global plate_capture_in_progress, webcam_instance, mqtt_client

    if not webcam_instance:
        print("⚠️  Webcam no disponible para captura de placa")
        return

    if plate_capture_in_progress:
        print("ℹ️  Captura de placa ya en curso")
        return

    def _worker() -> None:
        global plate_capture_in_progress
        try:
            capture_and_detect_plate(webcam_instance, mqtt_client)
        finally:
            plate_capture_in_progress = False

    plate_capture_in_progress = True
    threading.Thread(target=_worker, daemon=True).start()


def capture_and_detect_plate(webcam: WebcamCapture, mqtt_client: mqtt.Client) -> dict | None:
    """
    Captura un frame de la webcam e intenta detectar una placa.
    Reintentos configurables en CAPTURE_RETRIES.
    """
    for attempt in range(1, CAPTURE_RETRIES + 1):
        print(f"📸 Intento {attempt}/{CAPTURE_RETRIES} de captura y detección...")
        
        frame_bytes = webcam.capture_frame()
        if not frame_bytes:
            print(f"⚠️  Intento {attempt}: No se pudo capturar frame")
            time.sleep(0.5)
            continue
        
        result = send_frame_to_backend_plate_service(frame_bytes)

        plate = None
        confidence = None
        if result and isinstance(result, dict):
            plate = result.get('plate')
            confidence = result.get('confidence')

        validation = validate_plate_with_backend(plate, confidence)

        if validation and isinstance(validation, dict):
            normalized_plate = validation.get('plate') if isinstance(validation, dict) else plate
            status = validation.get('status') if isinstance(validation, dict) else None

            if status == 'autorizada' and result and result.get('success'):
                print(f"✅ Placa autorizada: {normalized_plate}")

                if mqtt_client:
                    pub(mqtt_client, "ecosort/acceso/placa/detectada", {
                        "timestamp": ts(),
                        "plate": normalized_plate,
                        "confidence": confidence,
                        "candidates": result.get('candidates', []),
                        "status": status,
                    })

                return {
                    "detection": result,
                    "validation": validation,
                }

            if status == 'no_autorizada':
                print(f"⚠️  Intento {attempt}: placa detectada pero no autorizada. Reposicionando vehículo...")
            elif status == 'no_detectada':
                print(f"⚠️  Intento {attempt}: placa no detectada. Reposicionando vehículo...")
            else:
                print(f"⚠️  Intento {attempt}: no se pudo completar el flujo de placas ({status})")
        else:
            print(f"⚠️  Intento {attempt}: no se pudo completar el flujo de placas")

        time.sleep(0.5)
    
    print("❌ No se pudo detectar placa después de los reintentos")
    return None


def capture_and_verify_epp(webcam: WebcamCapture) -> dict | None:
    """
    Captura un frame de la webcam y lo envía al backend para verificación EPP.
    El backend actúa como gateway hacia el microservicio de verificación EPP.
    """
    for attempt in range(1, CAPTURE_RETRIES + 1):
        print(f"🦺 Intento {attempt}/{CAPTURE_RETRIES} de verificación EPP...")

        frame_bytes = webcam.capture_frame()
        if not frame_bytes:
            print(f"⚠️  Intento {attempt}: No se pudo capturar frame para EPP")
            time.sleep(0.5)
            continue

        image_base64 = base64.b64encode(frame_bytes).decode("utf-8")

        try:
            response = requests.post(
                BACKEND_EPP_ENDPOINT,
                json={
                    "imageBase64": image_base64,
                    "source": "raspberry",
                },
                timeout=CAPTURE_TIMEOUT,
            )

            if response.status_code == 200:
                result = response.json()
                data = result.get("data", {}) if isinstance(result, dict) else {}
                access_granted = data.get("access_granted")
                missing = data.get("missing_mandatory", [])
                if access_granted:
                    print(f"✅ EPP verificado. access_granted={access_granted}, missing={missing}")
                    return result

                print(f"⚠️  EPP no cumple aún. access_granted={access_granted}, missing={missing}")
                time.sleep(0.5)
                continue

            print(f"⚠️  Backend EPP respondió status {response.status_code}: {response.text}")
        except requests.exceptions.Timeout:
            print(f"⚠️  Timeout al conectar backend EPP en {CAPTURE_TIMEOUT}s")
        except requests.exceptions.ConnectionError:
            print(f"⚠️  No se pudo conectar al backend EPP: {BACKEND_EPP_ENDPOINT}")
        except Exception as e:
            print(f"❌ Error verificando EPP: {e}")

        time.sleep(0.5)

    print("❌ No se pudo completar la verificación EPP")
    return None


# ══════════════════════════════════════════════════════════════
#  COMUNICACIÓN SERIAL CON ARDUINO
# ══════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
#  CAPTURA DE WEBCAM
# ══════════════════════════════════════════════════════════════

class WebcamCapture:
    """Maneja la captura de imágenes desde la webcam."""
    
    def __init__(self, device_id: int = 0):
        self.device_id = device_id
        self.cap = None
        self.running = False
    
    def connect(self) -> bool:
        """Abre la conexión con la webcam."""
        try:
            self.cap = cv2.VideoCapture(self.device_id)
            if not self.cap.isOpened():
                print(f"❌ No se pudo abrir la webcam (device_id: {self.device_id})")
                return False
            print(f"✅ Webcam conectada (device_id: {self.device_id})")
            return True
        except Exception as e:
            print(f"❌ Error al conectar webcam: {e}")
            return False
    
    def capture_frame(self) -> bytes | None:
        """Captura un frame y lo retorna como bytes JPEG."""
        if not self.cap or not self.cap.isOpened():
            print("⚠️  Webcam no está abierta")
            return None
        
        try:
            ret, frame = self.cap.read()
            if not ret:
                print("⚠️  No se pudo capturar frame de la webcam")
                return None
            
            # Codificar frame como JPEG
            success, buffer = cv2.imencode('.jpg', frame)
            if not success:
                print("⚠️  No se pudo codificar el frame")
                return None
            
            return buffer.tobytes()
        except Exception as e:
            print(f"❌ Error al capturar frame: {e}")
            return None
    
    def disconnect(self) -> None:
        """Cierra la conexión con la webcam."""
        if self.cap:
            self.cap.release()
            print("🔌 Webcam desconectada")


class SerialCommunicator:
    def __init__(self, port: str, baud_rate: int, timeout: int):
        self.port        = port
        self.baud_rate   = baud_rate
        self.timeout     = timeout
        self.serial_conn = None
        self.running     = False

    def connect(self) -> bool:
        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=self.timeout,
            )
            time.sleep(2)   # Esperar reinicio del Arduino al abrir el puerto
            print(f"✅ Serial conectado: {self.port} @ {self.baud_rate} bps")
            return True
        except serial.SerialException as e:
            print(f"❌ Error serial al conectar: {e}")
            return False

    def disconnect(self) -> None:
        self.running = False
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            print("🔌 Conexión serial cerrada")

    def send(self, message: str) -> None:
        """Envía una línea de texto al Arduino."""
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write((message + "\n").encode("utf-8"))
                print(f"📤 Serial TX: {message}")
            except serial.SerialException as e:
                print(f"❌ Error serial al enviar: {e}")
        else:
            print("⚠️  Serial: no hay conexión activa")

    def receive(self) -> str | None:
        """Lee una línea si hay datos disponibles; retorna None si no hay nada."""
        if self.serial_conn and self.serial_conn.is_open:
            try:
                if self.serial_conn.in_waiting > 0:
                    raw     = self.serial_conn.readline()
                    message = raw.decode("utf-8").strip()
                    if message:
                        print(f"📥 Serial RX: {message}")
                        return message
            except (serial.SerialException, UnicodeDecodeError) as e:
                print(f"❌ Error serial al recibir: {e}")
        return None

    def listen_loop(self, callback=None) -> None:
        """Hilo de escucha continua. Llama a callback(msg) por cada línea recibida."""
        self.running = True
        print("👂 Escuchando mensajes del Arduino...")
        while self.running:
            message = self.receive()
            if message and callback:
                callback(message)
            time.sleep(0.05)


# ══════════════════════════════════════════════════════════════
#  CALLBACK: ARDUINO → RASPBERRY (mensajes seriales)
# ══════════════════════════════════════════════════════════════

def on_serial_message(message: str) -> None:
    """
    Procesa cada mensaje recibido desde el Arduino.
    Protocolo: "clave,valor"  o  "resultado_clasificador,linea,resultado,medicion"
    """
    global num_parqueos_ocupados, talanquera_abierta, talanquera_alerta
    global puerta_abierta, puerta_alarma
    global banda_principal_activa, banda_plastico_activa, banda_vidrio_activa, banda_metal_activa
    global material_detectado, alarma_humo_activa

    if "," not in message:
        print(f"⚠️  Mensaje serial sin formato reconocido: '{message}'")
        return

    parts = [p.strip() for p in message.split(",")]

    # ── 2 partes: "clave,valor" ──────────────────────────────
    if len(parts) == 2:
        key, value = parts[0], parts[1]

        if key == "parqueos_ocupados":
            try:
                temp = int(value)
            except ValueError:
                print(f"⚠️  parqueos_ocupados valor no entero: '{value}'")
                return
            
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if num_parqueos_ocupados != temp:
                num_parqueos_ocupados = temp
                pub(mqtt_client, "ecosort/planta/parqueos/estado", {
                    "timestamp": ts(),
                    "parqueos_ocupados": temp,
                })

        elif key == "talanquera_abierta":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if talanquera_abierta != temp:
                talanquera_abierta = temp
                pub(mqtt_client, "ecosort/parqueo/talanquera/estado", {
                    "timestamp": ts(),
                    "talanquera_abierta": talanquera_abierta,
                })

        elif key == "talanquera_alerta":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if talanquera_alerta != temp:
                talanquera_alerta = temp
                pub(mqtt_client, "ecosort/parqueo/talanquera/alerta", {
                    "timestamp": ts(),
                    "alerta_parqueo_lleno": talanquera_alerta,
                })

        elif key == "puerta_abierta":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if puerta_abierta != temp:
                puerta_abierta = temp
                pub(mqtt_client, "ecosort/acceso/puerta/estado", {
                    "timestamp": ts(),
                    "puerta_abierta": puerta_abierta,
                })

                # Al abrirse la puerta, capturar evidencia y verificar EPP en backend
                if puerta_abierta:
                    print("\n🦺 Puerta abierta - Iniciando verificación EPP...")
                    start_epp_verification()

        elif key == "puerta_alarma":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if puerta_alarma != temp:
                puerta_alarma = temp
                pub(mqtt_client, "ecosort/acceso/puerta/alarma", {
                    "timestamp": ts(),
                    "alerta_rfid": puerta_alarma,
                })

        elif key == "banda_principal":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if banda_principal_activa != temp:
                banda_principal_activa = temp
                pub(mqtt_client, "ecosort/procesamiento/bandas/principal", {
                    "timestamp": ts(),
                    "banda_principal": banda_principal_activa,
                })

        elif key == "banda_plastico":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if banda_plastico_activa != temp:
                banda_plastico_activa = temp
                pub(mqtt_client, "ecosort/procesamiento/bandas/plastico", {
                    "timestamp": ts(),
                    "banda_plastico": banda_plastico_activa,
                })

        elif key == "banda_vidrio":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if banda_vidrio_activa != temp:
                banda_vidrio_activa = temp
                pub(mqtt_client, "ecosort/procesamiento/bandas/vidrio", {
                    "timestamp": ts(),
                    "banda_vidrio": banda_vidrio_activa,
                })

        elif key == "banda_metal":
            temp = to_bool(value)
            # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
            if banda_metal_activa != temp:
                banda_metal_activa = temp
                pub(mqtt_client, "ecosort/procesamiento/bandas/metal", {
                    "timestamp": ts(),
                    "banda_metal": banda_metal_activa,
                })
                
        elif key == "material_detectado":
            # Aqui si se puede repetir el valor por ejemplo se detecta plastico y despues ingresa otro plastico
            # Validar que el valor sea 0: platico, 1: vidrio, 2: metal, otros no son válidos
            try:
                temp = int(value)
            except ValueError:
                print(f"⚠️  material_detectado valor no entero: '{value}'")
                return
            
            if temp not in [0, 1, 2]:
                print(f"⚠️  material_detectado valor fuera de rango: {temp}")
                return
            
            material_detectado = temp
            pub(mqtt_client, "ecosort/clasificador/material/detectado", {
                "timestamp": ts(),
                "codigo_material": material_detectado,
            })

        elif key == "vehiculo_detectado":
            # Comando explícito para detonar la captura de placa cuando el Arduino
            # detecta presencia de un vehículo en la entrada.
            temp = to_bool(value)
            if temp:
                print("\n🚗 Vehículo detectado - Iniciando captura de placa...")
                start_plate_capture()

        else:
            print(f"⚠️  Clave serial desconocida: '{key}'")

    # 3 partes:
    
    elif len(parts) == 3 and parts[0] == "alarma_humo":
        _, value, medicion_str = parts
        temp = to_bool(value)
        # este if es para solo publicar en MQTT si el valor cambió, evitando spam de mensajes idénticos
        if alarma_humo_activa != temp:
            alarma_humo_activa = temp
            try:
                medicion = float(medicion_str)
            except ValueError:
                print(f"❌ Medición de humo no numérica: '{medicion_str}'")
                medicion = 0.0

            pub(mqtt_client, "ecosort/seguridad/alarma/humo", {
                "timestamp": ts(),
                "alerta_humo": alarma_humo_activa,
                "umbral": medicion,
            })
    
    # 4 partes: "resultado,linea,resultado,medicion" ──
    elif len(parts) == 4 and parts[0] == "resultado":
        _, linea, resultado, medicion_str = parts

        try:
            medicion = float(medicion_str)
        except ValueError:
            print(f"❌ Medición no numérica: '{medicion_str}'")
            return

        resultado_norm = "rechazado" if resultado == "rechazado" else "aprobado"

        if linea == "plastico":
            pub(mqtt_client, "ecosort/clasificador/material/resultado", {
                "timestamp":    ts(),
                "linea":        "plastico",
                "resultado":    resultado_norm,
                "medicion":     medicion,
                "transparencia": 0,
            })

        elif linea == "vidrio":
            pub(mqtt_client, "ecosort/clasificador/material/resultado", {
                "timestamp":    ts(),
                "linea":        "vidrio",
                "resultado":    resultado_norm,
                "medicion":     0,
                "transparencia": medicion,
            })

        elif linea == "metal":
            pub(mqtt_client, "ecosort/clasificador/material/resultado", {
                "timestamp":    ts(),
                "linea":        "metal",
                "resultado":    resultado_norm,
                "medicion":     medicion,
                "transparencia": 0,
            })

        else:
            print(f"⚠️  Línea de clasificador desconocida: '{linea}'")

    else:
        print(f"⚠️  Mensaje serial con número de partes inesperado: {parts}")


# ══════════════════════════════════════════════════════════════
#  CALLBACK: BACKEND (MQTT) → RASPBERRY → ARDUINO
# ══════════════════════════════════════════════════════════════

# Topics a los que la Raspberry se suscribe (comandos de control del backend)
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
        print("🟢 Conectado al broker MQTT")
        for topic in SUBSCRIBE_TOPICS:
            client.subscribe(topic, qos=1)
        print(f"📡 Suscrito a {len(SUBSCRIBE_TOPICS)} topics")
    else:
        codes = {
            1: "Protocolo no soportado",
            2: "ID de cliente rechazado",
            3: "Servidor no disponible",
            4: "Usuario/contraseña incorrectos",
            5: "No autorizado",
        }
        print(f"❌ Error MQTT al conectar: {codes.get(rc, f'código {rc}')}")


def on_mqtt_message(client, userdata, msg):
    # debugear mensajes MQTT recibidos desde el backend, traducirlos a comandos seriales para el Arduino
    """
    Recibe un comando MQTT del backend y lo traduce a un mensaje serial para el Arduino.

    Protocolo serial de salida: "clave,valor\n"
    """
    try:
        payload = json.loads(msg.payload.decode())
    except Exception:
        print(f"❌ Payload MQTT no es JSON válido: {msg.payload}")
        return

    print(f"\n📨 MQTT RX [{msg.topic}]  →  {json.dumps(payload)}")

    topic   = msg.topic
    comando = payload.get("comando", "")

    # ── Líneas de producción ─────────────────────────────────
    if topic in (
        "ecosort/comandos/linea/principal",
        "ecosort/comandos/linea/plastico",
        "ecosort/comandos/linea/vidrio",
        "ecosort/comandos/linea/metal",
    ):
        linea  = payload.get("linea", topic.split("/")[-1])
        activa = "true" if comando == "reanudar" else "false"
        serial_comm.send(f"banda_{linea},{activa}")

    # ── Puerta de acceso ─────────────────────────────────────
    elif topic == "ecosort/comandos/acceso/puerta":
        abierta = "true" if comando == "abrir" else "false"
        serial_comm.send(f"puerta_abierta,{abierta}")

    # ── Talanquera de parqueo ────────────────────────────────
    elif topic == "ecosort/comandos/parqueo/talanquera":
        abierta = "true" if comando == "abrir" else "false"
        serial_comm.send(f"talanquera_abierta,{abierta}")

    # ── Iluminación ──────────────────────────────────────────
    elif topic == "ecosort/comandos/planta/iluminacion":
        encendida = "true" if comando == "encender" else "false"
        serial_comm.send(f"iluminacion,{encendida}")

    # ── Emergencia ───────────────────────────────────────────
    elif topic == "ecosort/comandos/seguridad/emergencia":
        activa = "true" if comando == "activar" else "false"
        serial_comm.send(f"emergencia,{activa}")

    else:
        print(f"⚠️  Topic MQTT sin handler: '{topic}'")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print("⚠️  Desconectado del broker MQTT inesperadamente. Reconectando...")


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

# Variables globales accesibles desde los callbacks
serial_comm: SerialCommunicator = None
mqtt_client: mqtt.Client        = None
webcam_instance: WebcamCapture  = None


def main():
    global serial_comm, mqtt_client, webcam_instance

    # ── 0. Iniciar webcam (opcional) ─────────────────────
    print("\n📷 Inicializando webcam...")
    webcam_instance = WebcamCapture(WEBCAM_DEVICE_ID)
    if not webcam_instance.connect():
        print("⚠️  Advertencia: Webcam no disponible. Continuando sin captura de placas.")
        webcam_instance = None
    
    # ── 1. Iniciar comunicación serial ───────────────────────
    serial_comm = SerialCommunicator(ARDUINO_PORT, BAUD_RATE, TIMEOUT)
    if not serial_comm.connect():
        print("❌ No se pudo conectar al Arduino. Saliendo.")
        return

    # Hilo de escucha serial (Arduino → Raspberry → MQTT)
    serial_thread = threading.Thread(
        target=serial_comm.listen_loop,
        args=(on_serial_message,),
        daemon=True,
    )
    serial_thread.start()

    # ── 2. Iniciar cliente MQTT ──────────────────────────────
    mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID, clean_session=True)

    if MQTT_USER:
        mqtt_client.username_pw_set(MQTT_USER, MQTT_PASS)

    mqtt_client.on_connect    = on_connect
    mqtt_client.on_message    = on_mqtt_message
    mqtt_client.on_disconnect = on_disconnect

    print(f"\nConectando al broker MQTT {MQTT_HOST}:{MQTT_PORT} ...")
    try:
        mqtt_client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    except ConnectionRefusedError:
        print(f"❌ Broker MQTT rechazó la conexión en {MQTT_HOST}:{MQTT_PORT}")
        serial_comm.disconnect()
        return
    except Exception as e:
        print(f"❌ Error al conectar con el broker MQTT: {e}")
        serial_comm.disconnect()
        return

    # Loop MQTT en hilo del propio cliente (no bloqueante)
    mqtt_client.loop_start()
    time.sleep(1)   # Dar tiempo a que on_connect dispare

    print("\n🚀 EcoSort activo. Ctrl+C para salir.\n")

    try:
        while True:
            time.sleep(1)   # Mantener el hilo principal vivo
    except KeyboardInterrupt:
        print("\n⛔ Detenido por el usuario")
    finally:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        serial_comm.disconnect()
        if webcam_instance:
            webcam_instance.disconnect()
        print("👋 EcoSort finalizado")


if __name__ == "__main__":
    main()