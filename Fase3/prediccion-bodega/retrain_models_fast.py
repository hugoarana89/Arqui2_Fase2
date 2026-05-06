#!/usr/bin/env python3
"""
Reentrenamiento rápido - versión optimizada
"""

import pymongo
import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

def train_fast(linea):
    print(f"\n📊 Entrenando {linea.upper()}...")
    
    uri = os.getenv('MONGO_URI')
    client = pymongo.MongoClient(uri)
    db = client[os.getenv('DB_NAME', 'ecosort_db')]
    collection = db['classification_results']
    
    # Usar SOLO datos recientes (últimos 3 días) para acelerar
    three_days_ago = datetime.now() - timedelta(days=3)
    cursor = collection.find({
        'linea': linea,
        'porcentaje_almacen_tras_evento': {'$exists': True, '$ne': None},
        'timestamp': {'$gte': three_days_ago}
    }).sort('timestamp', 1)
    
    df = pd.DataFrame(list(cursor))
    print(f"   Datos: {len(df)} registros")
    
    if len(df) < 50:
        print(f"   Datos insuficientes, usando históricos...")
        cursor = collection.find({
            'linea': linea,
            'porcentaje_almacen_tras_evento': {'$exists': True, '$ne': None}
        }).sort('timestamp', 1)
        df = pd.DataFrame(list(cursor))
        print(f"   Total: {len(df)} registros")
    
    if len(df) < 30:
        print(f"   ❌ No hay suficientes datos")
        client.close()
        return
    
    df = df.tail(1500)  # Limitar a 1500 registros máximo para velocidad
    
    # Features simplificadas (más rápidas)
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    X = pd.DataFrame()
    X['porcentaje_actual'] = df['porcentaje_almacen_tras_evento']
    X['capacidad_restante'] = 100 - X['porcentaje_actual']
    
    # Velocidad
    velocidad = [0]
    for i in range(1, len(df)):
        delta_p = df.iloc[i]['porcentaje_almacen_tras_evento'] - df.iloc[i-1]['porcentaje_almacen_tras_evento']
        delta_t = (df.iloc[i]['timestamp'] - df.iloc[i-1]['timestamp']).total_seconds() / 60
        vel = delta_p / delta_t if delta_t > 0 else 0
        velocidad.append(max(0, vel))
    X['velocidad'] = velocidad
    
    # Target simplificado
    y = []
    for idx, row in df.iterrows():
        p = row['porcentaje_almacen_tras_evento']
        if p >= 98:
            y.append(0)
        elif velocidad[idx] > 0:
            minutos = (98 - p) / velocidad[idx]
            y.append(min(minutos, 60))
        else:
            y.append(30)
    
    mask = ~(pd.isna(y) | X.isna().any(axis=1))
    X = X[mask]
    y = np.array(y)[mask]
    
    print(f"   Muestras: {len(X)}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"   ✅ MAE: {mae:.2f} min | R²: {r2:.4f}")
    
    joblib.dump(model, f'models/bodega_{linea}_model.pkl')
    
    metadata = {
        'linea': linea,
        'fecha_entrenamiento': datetime.now().isoformat(),
        'n_muestras': len(X),
        'metricas': {'mae_test': float(mae), 'r2_test': float(r2)}
    }
    with open(f'models/bodega_{linea}_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    client.close()

if __name__ == '__main__':
    print("="*60)
    print("🚀 REENTRENAMIENTO RÁPIDO")
    print("="*60)
    
    for linea in ['plastico', 'vidrio', 'metal']:
        train_fast(linea)
    
    print("\n✅ COMPLETADO")
