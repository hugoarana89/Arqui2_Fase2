#!/usr/bin/env python3
"""
Servicio de predicción en tiempo real V3 - 5 segundos de intervalo
Optimizado para máxima velocidad y precisión
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
        self.linea = os.getenv('BODEGA_LINEA', 'plastico')
        self.interval = int(os.getenv('PREDICTION_INTERVAL_SECONDS', 5))  # 5 segundos
        self.model = None
        self.features_expected = None
        self.running = True
        self.last_prediction = None
        
        print(f"🚀 Inicializando predictor V3 para bodega: {self.linea}")
        print(f"⏱️  Intervalo de predicción: {self.interval} segundos")
        
        self.load_model()
        self.connect_mongodb()
        self.connect_mqtt()
        
        signal.signal(signal.SIGINT, self.signal_handler)
    
    def signal_handler(self, sig, frame):
        print("\n⛔ Deteniendo servicio...")
        self.running = False
    
    def load_model(self):
        """Cargar mejor modelo disponible (V3 > V2 > V1)"""
        model_paths = [
            f'models/bodega_{self.linea}_model_v3.pkl',
            f'models/bodega_{self.linea}_model_v2.pkl', 
            f'models/bodega_{self.linea}_model.pkl'
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                print(f"✅ Modelo cargado: {model_path}")
                
                if hasattr(self.model, 'feature_names_in_'):
                    self.features_expected = list(self.model.feature_names_in_)
                else:
                    self.features_expected = [
                        'porcentaje_actual', 'capacidad_restante', 'throughput_15s',
                        'throughput_30s', 'throughput_60s', 'throughput_120s',
                        'velocidad_llenado', 'aceleracion', 'tasa_aprobacion_60s',
                        'tasa_aprobacion_120s', 'hora', 'minuto', 'tiempo_desde_inicio'
                    ]
                
                print(f"📋 Features: {len(self.features_expected)} variables")
                
                # Cargar metadata
                meta_path = model_path.replace('.pkl', '_metadata.json')
                if os.path.exists(meta_path):
                    with open(meta_path, 'r') as f:
                        self.metadata = json.load(f)
                    print(f"📊 Precisión: MAE={self.metadata['metricas']['mae_test']:.2f} min")
                return
        
        print(f"❌ No se encontró ningún modelo entrenado")
        print("   Ejecuta: python train_model_v3.py")
        sys.exit(1)
    
    def connect_mongodb(self):
        uri = os.getenv('MONGO_URI')
        if not uri:
            print("❌ MONGO_URI no encontrado")
            sys.exit(1)
        
        self.mongo_client = pymongo.MongoClient(uri)
        db_name = os.getenv('DB_NAME', 'ecosort_db')
        self.db = self.mongo_client[db_name]
        self.classification_col = self.db['classification_results']
        
        count = self.classification_col.count_documents({})
        print(f"✅ Conectado a MongoDB: {db_name} ({count} documentos)")
    
    def connect_mqtt(self):
        host = os.getenv('MQTT_BROKER_URL', '34.9.126.151')
        port = int(os.getenv('MQTT_BROKER_PORT', 1883))
        
        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.mqtt_client.connect(host, port, 60)
        self.mqtt_client.loop_start()
        print(f"✅ Conectado a MQTT: {host}:{port}")
    
    def get_current_state(self):
        """Obtener estado actual con todas las features necesarias"""
        try:
            # Obtener últimos eventos
            recent_events = list(self.classification_col.find(
                {'linea': self.linea},
                sort=[('timestamp', -1)]
            ).limit(30))
            
            if len(recent_events) < 3:
                return None
            
            recent_events.reverse()
            df_events = pd.DataFrame(recent_events)
            
            last_event = recent_events[-1]
            porcentaje_actual = last_event.get('porcentaje_almacen_tras_evento', 0)
            
            if porcentaje_actual >= 99.5:
                return {'estado': 'LLENA', 'porcentaje': porcentaje_actual}
            
            now = datetime.now()
            
            # Calcular todas las features
            features = {}
            
            # Porcentajes
            features['porcentaje_actual'] = float(porcentaje_actual)
            features['capacidad_restante'] = 100 - features['porcentaje_actual']
            
            # Throughput en múltiples ventanas
            for window in [15, 30, 60, 120]:
                cutoff = now - timedelta(seconds=window)
                eventos_ventana = [e for e in recent_events if e['timestamp'] >= cutoff]
                features[f'throughput_{window}s'] = float(len(eventos_ventana))
            
            # Velocidad y aceleración
            if len(df_events) >= 2:
                delta_p = df_events.iloc[-1]['porcentaje_almacen_tras_evento'] - df_events.iloc[-2]['porcentaje_almacen_tras_evento']
                delta_t = (df_events.iloc[-1]['timestamp'] - df_events.iloc[-2]['timestamp']).total_seconds() / 60
                features['velocidad_llenado'] = max(0, delta_p / delta_t) if delta_t > 0 else 0
            else:
                features['velocidad_llenado'] = 0
            
            if len(df_events) >= 3:
                vel1 = features['velocidad_llenado']
                delta_p2 = df_events.iloc[-2]['porcentaje_almacen_tras_evento'] - df_events.iloc[-3]['porcentaje_almacen_tras_evento']
                delta_t2 = (df_events.iloc[-2]['timestamp'] - df_events.iloc[-3]['timestamp']).total_seconds() / 60
                vel2 = max(0, delta_p2 / delta_t2) if delta_t2 > 0 else 0
                features['aceleracion'] = vel1 - vel2
            else:
                features['aceleracion'] = 0
            
            # Tasa de aprobación
            for window in [60, 120]:
                cutoff = now - timedelta(seconds=window)
                eventos_ventana = [e for e in recent_events if e['timestamp'] >= cutoff]
                if eventos_ventana:
                    aprobados = sum(1 for e in eventos_ventana if e.get('resultado') == 'aprobado')
                    features[f'tasa_aprobacion_{window}s'] = aprobados / len(eventos_ventana)
                else:
                    features[f'tasa_aprobacion_{window}s'] = 0.5
            
            # Tiempo
            features['hora'] = float(now.hour)
            features['minuto'] = float(now.minute)
            
            primer_evento = self.classification_col.find_one(
                {'linea': self.linea}, sort=[('timestamp', 1)]
            )
            if primer_evento:
                features['tiempo_desde_inicio'] = (now - primer_evento['timestamp']).total_seconds() / 60
            else:
                features['tiempo_desde_inicio'] = 0
            
            # Verificar flujo
            if features['throughput_120s'] == 0:
                return {'estado': 'SIN_FLUJO', 'porcentaje': porcentaje_actual, 'features': features}
            
            return {
                'estado': 'OPERANDO',
                'porcentaje': porcentaje_actual,
                'features': features,
                'velocidad': features['velocidad_llenado']
            }
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    def predict(self):
        """Generar predicción"""
        if not self.model:
            return None
        
        state = self.get_current_state()
        if not state:
            return None
        
        if state['estado'] == 'LLENA':
            return {
                'minutos_restantes': 0,
                'estado': 'LLENA',
                'color_semaforo': 'ROJO',
                'porcentaje': state['porcentaje']
            }
        
        if state['estado'] == 'SIN_FLUJO':
            return {
                'minutos_restantes': None,
                'estado': 'SIN_FLUJO',
                'color_semaforo': 'APAGADO',
                'porcentaje': state['porcentaje']
            }
        
        try:
            features_df = pd.DataFrame([state['features']])
            
            if self.features_expected:
                available = [f for f in self.features_expected if f in features_df.columns]
                features_df = features_df[available]
            
            minutos = self.model.predict(features_df)[0]
            minutos = max(0, min(float(minutos), 60))
            
            if minutos > 15:
                color = 'VERDE'
            elif minutos > 5:
                color = 'AMARILLO'
            else:
                color = 'ROJO'
            
            return {
                'minutos_restantes': round(minutos, 1),
                'estado': 'OPERANDO',
                'color_semaforo': color,
                'porcentaje': state['porcentaje'],
                'velocidad': state.get('velocidad', 0)
            }
            
        except Exception as e:
            print(f"❌ Error predicción: {e}")
            return None
    
    def publish(self, prediction):
        if not prediction:
            return
        
        topic = f"ecosort/predicciones/bodega/{self.linea}"
        payload = {
            'linea': self.linea,
            'porcentaje_actual': round(prediction['porcentaje'], 1),
            'minutos_restantes': prediction.get('minutos_restantes'),
            'estado': prediction['estado'],
            'color_semaforo': prediction['color_semaforo'],
            'timestamp': datetime.now().isoformat()
        }
        
        if 'velocidad' in prediction:
            payload['velocidad_llenado'] = round(prediction['velocidad'], 2)
        
        self.mqtt_client.publish(topic, json.dumps(payload), qos=1)
        
        # Mostrar en consola (más compacto para 5 segundos)
        now = datetime.now().strftime('%H:%M:%S')
        if prediction['estado'] == 'OPERANDO':
            print(f"📊 [{now}] {prediction['porcentaje']:.0f}% | {prediction['minutos_restantes']}min | {prediction['color_semaforo']}")
        else:
            print(f"📊 [{now}] {prediction['porcentaje']:.0f}% | {prediction['estado']}")
    
    def run(self):
        print("\n" + "="*50)
        print(f"🚀 PREDICCIÓN EN TIEMPO REAL (c/{self.interval}s)")
        print(f"📍 Bodega: {self.linea.upper()}")
        print("="*50 + "\n")
        
        while self.running:
            start = time.time()
            
            prediction = self.predict()
            if prediction:
                self.publish(prediction)
            else:
                print("⚠️  Esperando datos...")
            
            elapsed = time.time() - start
            sleep_time = max(0, self.interval - elapsed)
            time.sleep(sleep_time)
    
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
