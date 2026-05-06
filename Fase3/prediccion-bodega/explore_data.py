#!/usr/bin/env python3
"""
Explorar datos históricos de clasificación en MongoDB
"""

import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

def main():
    print("="*60)
    print("📊 EXPLORADOR DE DATOS - EcoSort")
    print("="*60)
    
    # Conectar a MongoDB
    print("\n🔌 Conectando a MongoDB...")
    uri = os.getenv('MONGO_URI')
    if not uri:
        print("❌ MONGO_URI no encontrado en .env")
        return
    
    client = pymongo.MongoClient(uri)
    db_name = os.getenv('DB_NAME', 'ecosort_db')
    db = client[db_name]
    
    # Verificar colecciones
    print(f"\n📚 Base de datos: {db_name}")
    print("Colecciones encontradas:")
    for col in db.list_collection_names():
        count = db[col].count_documents({})
        print(f"   📄 {col}: {count} documentos")
    
    # Analizar classification_results
    collection = db['classification_results']
    total = collection.count_documents({})
    
    if total == 0:
        print("\n⚠️  No hay datos en classification_results")
        print("   Ejecuta el simulador primero para generar datos.")
        client.close()
        return
    
    print(f"\n📈 ANÁLISIS DE classification_results ({total} registros)")
    print("-"*40)
    
    # Por línea
    for linea in ['plastico', 'vidrio', 'metal']:
        count = collection.count_documents({'linea': linea})
        print(f"\n📍 Línea {linea.upper()}: {count} registros")
        
        if count > 0:
            # Rango de fechas
            oldest = collection.find_one({'linea': linea}, sort=[('timestamp', 1)])
            newest = collection.find_one({'linea': linea}, sort=[('timestamp', -1)])
            
            if oldest and newest:
                print(f"   📅 Desde: {oldest['timestamp']}")
                print(f"   📅 Hasta: {newest['timestamp']}")
            
            # Tasa de aprobación
            aprobados = collection.count_documents({'linea': linea, 'resultado': 'aprobado'})
            rechazados = collection.count_documents({'linea': linea, 'resultado': 'rechazado'})
            tasa = (aprobados / count * 100) if count > 0 else 0
            print(f"   ✅ Aprobados: {aprobados} ({tasa:.1f}%)")
            print(f"   ❌ Rechazados: {rechazados}")
            
            # Porcentaje de almacenamiento
            docs = list(collection.find(
                {'linea': linea, 'porcentaje_almacen_tras_evento': {'$exists': True}}
            ))
            if docs:
                porcentajes = [d.get('porcentaje_almacen_tras_evento', 0) for d in docs]
                print(f"   📊 Almacenamiento - Min: {min(porcentajes)}% | Max: {max(porcentajes)}% | Prom: {sum(porcentajes)/len(porcentajes):.1f}%")
    
    client.close()
    print("\n✅ Análisis completado")

if __name__ == '__main__':
    main()
