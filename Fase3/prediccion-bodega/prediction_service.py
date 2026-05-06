#!/usr/bin/env python3
"""
Servicio de predicción para 3 bodegas: plástico, vidrio, metal
Predicciones cada 5 segundos
"""

import pymongo
import pandas as pd
import numpy as np
import joblib
import json
import time
import paho.mqtt.client as mqtt
import os
import signal
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class BodegaPredictor:
    def __init__(self):
        self.lineas = ['plastico', 'vidrio', 'metal']
        self.models = {}
        self.interval = 5
        self.running = True
        
        print(f"🚀 Inicializando predictor para {len(self.lineas)} bodegas")
        print(f"⏱️  Intervalo: {self.interval} segundos")
        
        self.load_models()
        self.connect_mongodb()
        self.connect_mqtt()
        
        signal.signal(signal.SIGINT, self.signal_handler)
    
    def signal_handler(self, sig, frame):
        print("\n⛔ Deteniendo servicio...")
        self.running = False
    
    def load_models(self):
        for linea in self.lineas:
            model_path = f'models/bodega_{linea}_model.pkl'
            if os.path.exists(model_path):
                self.models[linea] = joblib.load(model_path)
                print(f"✅ Modelo cargado para {linea.upper()}")
                # Cargar métricas
                meta_path = f'models/bodega_{linea}_metadata.json'
                if os.path.exists(meta_path):
                    with open(meta_path) as f:
                        meta = json.load(f)
                        print(f"   📊 MAE: {meta['metricas']['mae']:.2f} min | R²: {meta['metricas']['r2']:.3f}")
            else:
                print(f"⚠️  Modelo no encontrado para {linea.upper()}")
                self.models[linea] = None
    
    def connect_mongodb(self):
        uri = os.getenv('MONGO_URI')
        self.mongo_client = pymongo.MongoClient(uri)
        db_name = os.getenv('DB_NAME', 'ecosort_db')
        self.db = self.mongo_client[db_name]
        self.classification_col = self.db['classification_results']
        print(f"✅ Conectado a MongoDB")
    
    def connect_mqtt(self):
        host = os.getenv('MQTT_BROKER_URL', '172.17.0.1')
        port = int(os.getenv('MQTT_BROKER_PORT', 1883))
        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.mqtt_client.connect(host, port, 60)
        self.mqtt_client.loop_start()
        print(f"✅ Conectado a MQTT: {host}:{port}")
    
    def get_current_state(self, linea):
        try:
            last_event = self.classification_col.find_one(
                {'linea': linea}, sort=[('timestamp', -1)]
            )
            if not last_event:
                return None
            
            porcentaje = last_event.get('porcentaje_almacen_tras_evento', 0)
            if porcentaje is None:
                return None
            
            ahora = datetime.now()
            events_2min = list(self.classification_col.find({
                'linea': linea,
                'timestamp': {'$gte': ahora - timedelta(minutes=2)}
            }))
            
            throughput = len(events_2min)
            
            if throughput == 0:
                return {'estado': 'SIN_FLUJO', 'porcentaje': porcentaje}
            if porcentaje >= 99.5:
                return {'estado': 'LLENA', 'porcentaje': porcentaje}
            
            # Calcular velocidad
            two_events = list(self.classification_col.find(
                {'linea': linea}, sort=[('timestamp', -1)]
            ).limit(2))
            
            velocidad = 0
            if len(two_events) >= 2:
                delta_p = two_events[0]['porcentaje_almacen_tras_evento'] - two_events[1]['porcentaje_almacen_tras_evento']
                delta_t = (two_events[0]['timestamp'] - two_events[1]['timestamp']).total_seconds() / 60
                velocidad = max(0, delta_p / delta_t) if delta_t > 0 else 0
            
            return {
                'estado': 'OPERANDO',
                'porcentaje': porcentaje,
                'velocidad': velocidad,
                'throughput': throughput
            }
        except Exception as e:
            return None
    
    def predict(self, linea, state):
        if not self.models.get(linea):
            return None
        
        if state['estado'] == 'LLENA':
            return {'minutos_restantes': 0, 'estado': 'LLENA', 'color': 'ROJO', 'porcentaje': state['porcentaje']}
        if state['estado'] == 'SIN_FLUJO':
            return {'minutos_restantes': None, 'estado': 'SIN_FLUJO', 'color': 'APAGADO', 'porcentaje': state['porcentaje']}
        
        try:
            if state['velocidad'] > 0:
                minutos = (100 - state['porcentaje']) / state['velocidad']
                minutos = max(0, min(minutos, 60))
            else:
                minutos = 30
            
            color = 'VERDE' if minutos > 15 else 'AMARILLO' if minutos > 5 else 'ROJO'
            
            return {
                'minutos_restantes': round(minutos, 1),
                'estado': 'OPERANDO',
                'color': color,
                'porcentaje': state['porcentaje']
            }
        except:
            return None
    
    def publish(self, linea, prediction, state):
        if not prediction:
            return
        
        payload = {
            'linea': linea,
            'porcentaje_actual': round(prediction['porcentaje'], 1),
            'minutos_restantes': prediction.get('minutos_restantes'),
            'estado': prediction['estado'],
            'color_semaforo': prediction['color'],
            'velocidad_llenado': state.get('velocidad', 0),
            'timestamp': datetime.now().isoformat()
        }
        
        self.mqtt_client.publish(f"ecosort/predicciones/bodega/{linea}", json.dumps(payload), qos=1)
        
        emoji = {'VERDE': '🟢', 'AMARILLO': '🟡', 'ROJO': '🔴', 'APAGADO': '⚫'}.get(prediction['color'], '⚪')
        if prediction['estado'] == 'OPERANDO':
            print(f"{emoji} [{datetime.now().strftime('%H:%M:%S')}] {linea.upper()}: {prediction['porcentaje']:.0f}% → {prediction['minutos_restantes']} min")
        else:
            print(f"{emoji} [{datetime.now().strftime('%H:%M:%S')}] {linea.upper()}: {prediction['porcentaje']:.0f}% → {prediction['estado']}")
    
    def run(self):
        print("\n" + "="*50)
        print(f"🚀 PREDICCIÓN EN TIEMPO REAL (c/{self.interval}s)")
        print("📍 Bodegas: PLASTICO, VIDRIO, METAL")
        print("="*50 + "\n")
        
        while self.running:
            start = time.time()
            for linea in self.lineas:
                state = self.get_current_state(linea)
                if state:
                    pred = self.predict(linea, state)
                    if pred:
                        self.publish(linea, pred, state)
            time.sleep(max(0, self.interval - (time.time() - start)))
    
    def cleanup(self):
        if hasattr(self, 'mqtt_client'):
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        if hasattr(self, 'mongo_client'):
            self.mongo_client.close()

if __name__ == '__main__':
    predictor = BodegaPredictor()
    try:
        predictor.run()
    finally:
        predictor.cleanup()
