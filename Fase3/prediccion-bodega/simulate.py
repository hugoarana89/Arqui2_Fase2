#!/usr/bin/env python3
"""
Simulador de datos para las 3 bodegas
Genera eventos cada 3-5 segundos
"""

import pymongo
import os
import random
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class DataGenerator:
    def __init__(self):
        self.lineas = ['plastico', 'vidrio', 'metal']
        self.porcentajes = {l: random.uniform(5, 15) for l in self.lineas}
        self.direcciones = {l: 1 for l in self.lineas}  # 1=subiendo, -1=bajando
        
        uri = os.getenv('MONGO_URI')
        self.client = pymongo.MongoClient(uri)
        db_name = os.getenv('DB_NAME', 'ecosort_db')
        self.db = self.client[db_name]
        self.collection = self.db['classification_results']
        
        print("🔄 Generador de datos iniciado")
        print("   Generando eventos para: PLASTICO, VIDRIO, METAL")
        print("   Ctrl+C para detener\n")
    
    def generar_evento(self, linea):
        porcentaje = self.porcentajes[linea]
        direccion = self.direcciones[linea]
        
        if direccion == 1:
            porcentaje += random.uniform(0.3, 2)
            if porcentaje >= 98:
                self.direcciones[linea] = -1
                print(f"   🟢 {linea.upper()} - Bodega llena, iniciando vaciado...")
        else:
            porcentaje -= random.uniform(0.5, 2.5)
            if porcentaje <= 5:
                self.direcciones[linea] = 1
                print(f"   🟢 {linea.upper()} - Bodega vacía, iniciando llenado...")
        
        porcentaje = max(5, min(98, porcentaje))
        self.porcentajes[linea] = porcentaje
        
        hora = datetime.now().hour
        prob_aprobado = 0.85 if 8 <= hora <= 18 else 0.70
        
        resultado = 'aprobado' if random.random() < prob_aprobado else 'rechazado'
        medicion = random.uniform(0.7, 0.95) if resultado == 'aprobado' else random.uniform(0.1, 0.4)
        
        doc = {
            'linea': linea,
            'resultado': resultado,
            'medicion': round(medicion, 3),
            'transparencia': None,
            'porcentaje_almacen_tras_evento': round(porcentaje, 2),
            'timestamp': datetime.now()
        }
        self.collection.insert_one(doc)
        
        direccion_texto = "↑" if self.direcciones[linea] == 1 else "↓"
        print(f"📊 [{datetime.now().strftime('%H:%M:%S')}] {linea.upper()}: {porcentaje:.1f}% {direccion_texto} | {resultado}")
    
    def run(self):
        try:
            while True:
                linea = random.choice(self.lineas)
                self.generar_evento(linea)
                time.sleep(random.uniform(3, 5))
        except KeyboardInterrupt:
            print("\n⛔ Generador detenido")
        finally:
            self.client.close()

if __name__ == '__main__':
    generator = DataGenerator()
    generator.run()
