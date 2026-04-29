#!/usr/bin/env python3
"""
Test de captura de webcam y envío al servicio ML de placas.
Util para pruebas sin necesidad de todo el sistema EcoSort.

Uso:
    python test_plate_detection.py
"""

import cv2
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración
ML_PLATES_API_URL = os.getenv("ML_PLATES_API_URL", "http://localhost:8000")
ML_PLATES_ENDPOINT = f"{ML_PLATES_API_URL}/detect-plate"
WEBCAM_DEVICE_ID = 0

def test_webcam():
    """Prueba la webcam capturando un frame."""
    print("📷 Probando webcam...")
    
    cap = cv2.VideoCapture(WEBCAM_DEVICE_ID)
    if not cap.isOpened():
        print("❌ No se pudo abrir la webcam")
        return False
    
    print("✅ Webcam abierta correctamente")
    
    # Capturar un frame
    ret, frame = cap.read()
    if not ret:
        print("❌ No se pudo capturar un frame")
        cap.release()
        return False
    
    print(f"✅ Frame capturado: {frame.shape}")
    
    # Guardar frame para verificación
    cv2.imwrite("/tmp/test_frame.jpg", frame)
    print("📁 Frame guardado en /tmp/test_frame.jpg")
    
    cap.release()
    return True

def test_ml_service():
    """Prueba la conexión con el servicio ML."""
    print(f"\n🔌 Probando conexión con servicio ML en {ML_PLATES_ENDPOINT}...")
    
    try:
        # Probar health check
        response = requests.get(f"{ML_PLATES_API_URL}/", timeout=5)
        if response.status_code == 200:
            print(f"✅ Servicio ML respondiendo: {response.json()}")
            return True
        else:
            print(f"❌ Servicio ML retornó status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ No se pudo conectar a {ML_PLATES_API_URL}")
        return False
    except Exception as e:
        print(f"❌ Error al conectar: {e}")
        return False

def test_plate_detection():
    """Captura un frame y envía al servicio ML."""
    print("\n📸 Iniciando captura y detección de placa...")
    
    cap = cv2.VideoCapture(WEBCAM_DEVICE_ID)
    if not cap.isOpened():
        print("❌ No se pudo abrir la webcam")
        return
    
    ret, frame = cap.read()
    if not ret:
        print("❌ No se pudo capturar un frame")
        cap.release()
        return
    
    # Codificar como JPEG
    success, buffer = cv2.imencode('.jpg', frame)
    if not success:
        print("❌ No se pudo codificar el frame")
        cap.release()
        return
    
    frame_bytes = buffer.tobytes()
    
    # Enviar al servicio ML
    try:
        print(f"📤 Enviando frame ({len(frame_bytes)} bytes) al servicio ML...")
        files = {'file': ('frame.jpg', frame_bytes, 'image/jpeg')}
        response = requests.post(
            ML_PLATES_ENDPOINT,
            files=files,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Respuesta del ML:\n{result}")
            
            if result.get('success'):
                plate = result.get('plate')
                confidence = result.get('confidence')
                print(f"\n🎉 PLACA DETECTADA: {plate} (confianza: {confidence})")
            else:
                print(f"\n⚠️  Placa no detectada: {result.get('message')}")
        else:
            print(f"❌ Error del servicio (status: {response.status_code})")
            print(f"   Respuesta: {response.text}")
    except Exception as e:
        print(f"❌ Error al enviar al ML: {e}")
    finally:
        cap.release()

def main():
    print("=" * 60)
    print("TEST DE RECONOCIMIENTO DE PLACAS - EcoSort")
    print("=" * 60)
    
    # Test 1: Webcam
    print("\n[1/3] PRUEBA DE WEBCAM")
    print("-" * 60)
    if not test_webcam():
        print("⚠️  Webcam no disponible. Continua de todos modos.")
    
    # Test 2: Servicio ML
    print("\n[2/3] PRUEBA DE SERVICIO ML")
    print("-" * 60)
    ml_available = test_ml_service()
    
    # Test 3: Detección completa
    if ml_available:
        print("\n[3/3] PRUEBA DE DETECCIÓN COMPLETA")
        print("-" * 60)
        test_plate_detection()
    else:
        print("\n⚠️  Prueba de detección saltada (servicio ML no disponible)")
    
    print("\n" + "=" * 60)
    print("PRUEBAS COMPLETADAS")
    print("=" * 60)

if __name__ == "__main__":
    main()
