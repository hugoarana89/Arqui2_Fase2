#!/usr/bin/env python3
"""
Generador de datos en tiempo real para simular la planta
Genera un evento cada 3-5 segundos para mantener el flujo activo
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
        self.running = True
        self.porcentaje = 10
        self.direccion = 1  # 1 = subiendo, -1 = bajando
        
        # Conectar a MongoDB
        uri = os.getenv('MONGO_URI')
        self.client = pymongo.MongoClient(uri)
        db_name = os.getenv('DB_NAME', 'ecosort_db')
        self.db = self.client[db_name]
        self.collection = self.db['classification_results']
        
        print("🔄 Generador de datos iniciado")
        print("   Generando un evento cada 3-5 segundos")
        print("   Ctrl+C para detener\n")
    
    def generar_evento(self):
        """Genera un nuevo evento de clasificación"""
        
        # Actualizar porcentaje (simular ciclo de llenado y vaciado)
        if self.direccion == 1:
            self.porcentaje += random.uniform(0.5, 2)
            if self.porcentaje >= 98:
                self.direccion = -1
                print("   🟢 Bodega llena - Iniciando vaciado...")
        else:
            self.porcentage = getattr(self, 'porcentaje', 10)
            self.porcentaje -= random.uniform(1, 3)
            if self.porcentaje <= 5:
                self.direccion = 1
                print("   🟢 Bodega vacía - Iniciando llenado...")
        
        self.porcentaje = max(5, min(98, self.porcentaje))
        
        # Determinar resultado según hora
        hora = datetime.now().hour
        if 8 <= hora <= 18:
            prob_aprobado = 0.85
        else:
            prob_aprobado = 0.70
        
        resultado = 'aprobado' if random.random() < prob_aprobado else 'rechazado'
        
        # Calcular medición según resultado
        if resultado == 'aprobado':
            medicion = random.uniform(0.7, 0.95)
        else:
            medicion = random.uniform(0.1, 0.4)
        
        # Crear documento
        doc = {
            'linea': 'plastico',
            'resultado': resultado,
            'medicion': round(medicion, 3),
            'transparencia': None,
            'porcentaje_almacen_tras_evento': round(self.porcentaje, 2),
            'timestamp': datetime.now()
        }
        
        # Insertar en MongoDB
        self.collection.insert_one(doc)
        
        # Mostrar en consola
        direccion_texto = "↑" if self.direccion == 1 else "↓"
        print(f"📊 [{datetime.now().strftime('%H:%M:%S')}] {self.porcentaje:.1f}% {direccion_texto} | {resultado} ({medicion:.2f})")
        
        return doc
    
    def run(self):
        """Bucle principal"""
        try:
            while self.running:
                self.generar_evento()
                # Esperar entre 3 y 5 segundos
                time.sleep(random.uniform(3, 5))
        except KeyboardInterrupt:
            print("\n⛔ Generador detenido")
        finally:
            self.client.close()

if __name__ == '__main__':
    generator = DataGenerator()
    generator.run()
