#!/usr/bin/env python3
"""
Reentrenar modelos de predicción con los datos MÁS RECIENTES de MongoDB
Actualiza las métricas basadas en datos actuales (no solo históricos)
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

def build_features_advanced(df):
    """Construye características avanzadas para predicción"""
    
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    X = pd.DataFrame()
    
    # 1. Porcentaje actual
    X['porcentaje_actual'] = df['porcentaje_almacen_tras_evento']
    
    # 2. Capacidad restante
    X['capacidad_restante'] = 100 - X['porcentaje_actual']
    
    # 3-5. Múltiples ventanas de throughput
    for window in [15, 30, 60, 120]:
        throughput = []
        for i, row in df.iterrows():
            mask = (df['timestamp'] >= row['timestamp'] - pd.Timedelta(seconds=window)) & (df['timestamp'] < row['timestamp'])
            throughput.append(len(df[mask]))
        X[f'throughput_{window}s'] = throughput
    
    # 6. Velocidad de llenado
    velocidad = [0]
    for i in range(1, len(df)):
        delta_p = df.iloc[i]['porcentaje_almacen_tras_evento'] - df.iloc[i-1]['porcentaje_almacen_tras_evento']
        delta_t = (df.iloc[i]['timestamp'] - df.iloc[i-1]['timestamp']).total_seconds() / 60
        vel = delta_p / delta_t if delta_t > 0 else 0
        velocidad.append(max(0, vel))
    X['velocidad_llenado'] = velocidad
    
    # 7. Aceleración
    aceleracion = [0, 0]
    for i in range(2, len(df)):
        acel = velocidad[i] - velocidad[i-1]
        aceleracion.append(acel)
    X['aceleracion'] = aceleracion
    
    # 8-9. Ventanas de tasa de aprobación
    for window in [60, 120]:
        aprobacion = []
        for i, row in df.iterrows():
            mask = (df['timestamp'] >= row['timestamp'] - pd.Timedelta(seconds=window)) & (df['timestamp'] < row['timestamp'])
            eventos = df[mask]
            if len(eventos) > 0:
                aprobados = len(eventos[eventos['resultado'] == 'aprobado'])
                tasa = aprobados / len(eventos)
            else:
                tasa = 0.5
            aprobacion.append(tasa)
        X[f'tasa_aprobacion_{window}s'] = aprobacion
    
    # 10-11. Características temporales
    X['hora'] = pd.to_datetime(df['timestamp']).dt.hour
    X['minuto'] = pd.to_datetime(df['timestamp']).dt.minute
    
    # 12. Tiempo desde inicio
    X['tiempo_desde_inicio'] = (pd.to_datetime(df['timestamp']) - df['timestamp'].min()).dt.total_seconds() / 60
    
    # Variable objetivo: minutos hasta llenado
    y = []
    for idx, row in df.iterrows():
        porcentaje_actual = row['porcentaje_almacen_tras_evento']
        
        if porcentaje_actual >= 99.5:
            y.append(0)
            continue
        
        eventos_futuros = df.iloc[idx+1:].copy()
        
        if len(eventos_futuros) == 0:
            vel = velocidad[idx] if idx < len(velocidad) else 0
            if vel > 0:
                tiempo_estimado = (100 - porcentaje_actual) / vel
                y.append(min(tiempo_estimado, 60))
            else:
                y.append(30)
            continue
        
        tiempo_lleno = None
        for _, futuro in eventos_futuros.iterrows():
            if futuro['porcentaje_almacen_tras_evento'] >= 99.5:
                tiempo_lleno = futuro['timestamp']
                break
        
        if tiempo_lleno:
            minutos_restantes = (tiempo_lleno - row['timestamp']).total_seconds() / 60
            y.append(min(minutos_restantes, 60))
        else:
            vel = velocidad[idx] if idx < len(velocidad) else 0
            if vel > 0:
                tiempo_estimado = (100 - porcentaje_actual) / vel
                y.append(min(tiempo_estimado, 60))
            else:
                y.append(30)
    
    return X, np.array(y)

def train_model_for_linea(linea):
    print(f"\n{'='*60}")
    print(f"📊 Reentrenando modelo para: {linea.upper()}")
    print(f"{'='*60}")
    
    # Conectar a MongoDB
    uri = os.getenv('MONGO_URI')
    client = pymongo.MongoClient(uri)
    db_name = os.getenv('DB_NAME', 'ecosort_db')
    db = client[db_name]
    collection = db['classification_results']
    
    # Obtener datos RECIENTES (últimos 7 días)
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    cursor = collection.find({
        'linea': linea,
        'porcentaje_almacen_tras_evento': {'$exists': True, '$ne': None},
        'timestamp': {'$gte': seven_days_ago}
    }).sort('timestamp', 1)
    
    df = pd.DataFrame(list(cursor))
    print(f"📈 Datos recientes (última semana): {len(df)} registros")
    
    if len(df) < 50:
        print(f"⚠️ Datos insuficientes, incluyendo datos históricos...")
        cursor = collection.find({
            'linea': linea,
            'porcentaje_almacen_tras_evento': {'$exists': True, '$ne': None}
        }).sort('timestamp', 1)
        df = pd.DataFrame(list(cursor))
        print(f"📈 Total con datos históricos: {len(df)} registros")
    
    if len(df) < 30:
        print(f"❌ Datos insuficientes para entrenar {linea}")
        client.close()
        return
    
    print(f"   Rango: {df['timestamp'].min()} a {df['timestamp'].max()}")
    
    # Construir features
    X, y = build_features_advanced(df)
    
    # Limpiar datos inválidos
    mask = ~(pd.isna(y) | X.isna().any(axis=1) | (y <= 0) | (y > 60))
    X = X[mask]
    y = y[mask]
    
    print(f"✅ Muestras válidas: {len(X)}")
    
    if len(X) < 30:
        print(f"❌ No hay suficientes datos de calidad para {linea}")
        client.close()
        return
    
    # Dividir datos
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Entrenar modelo
    print("🤖 Entrenando Gradient Boosting...")
    model = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.05,
        max_depth=5,
        min_samples_split=3,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluación
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    mae_train = mean_absolute_error(y_train, y_pred_train)
    rmse_train = np.sqrt(mean_squared_error(y_train, y_pred_train))
    r2_train = r2_score(y_train, y_pred_train)
    
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
    r2_test = r2_score(y_test, y_pred_test)
    
    print(f"\n📊 MÉTRICAS NUEVAS - {linea.upper()}:")
    print(f"   TRAIN - MAE: {mae_train:.2f} min | RMSE: {rmse_train:.2f} | R²: {r2_train:.4f}")
    print(f"   TEST  - MAE: {mae_test:.2f} min | RMSE: {rmse_test:.2f} | R²: {r2_test:.4f}")
    
    # Guardar modelo
    joblib.dump(model, f'models/bodega_{linea}_model.pkl')
    
    # Guardar metadata actualizada
    metadata = {
        'linea': linea,
        'fecha_entrenamiento': datetime.now().isoformat(),
        'n_muestras': len(X),
        'n_muestras_entrenamiento': len(X_train),
        'n_muestras_prueba': len(X_test),
        'features': list(X.columns),
        'metricas': {
            'mae_train': float(mae_train),
            'rmse_train': float(rmse_train),
            'r2_train': float(r2_train),
            'mae_test': float(mae_test),
            'rmse_test': float(rmse_test),
            'r2_test': float(r2_test)
        }
    }
    
    with open(f'models/bodega_{linea}_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Modelo guardado: models/bodega_{linea}_model.pkl")
    print(f"✅ Métricas actualizadas: models/bodega_{linea}_metadata.json")
    
    client.close()
    return model

if __name__ == '__main__':
    print("="*60)
    print("🔄 REENTRENAMIENTO DE MODELOS CON DATOS RECIENTES")
    print("="*60)
    
    for linea in ['plastico', 'vidrio', 'metal']:
        train_model_for_linea(linea)
    
    print("\n" + "="*60)
    print("✅ REENTRENAMIENTO COMPLETADO")
    print("="*60)
    
    # Mostrar resumen de nuevas métricas
    print("\n📊 NUEVAS MÉTRICAS DE LOS MODELOS:")
    print("-"*60)
    for linea in ['plastico', 'vidrio', 'metal']:
        meta_path = f'models/bodega_{linea}_metadata.json'
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
                m = meta.get('metricas', {})
                print(f"{linea.upper()}: MAE={m.get('mae_test', 'N/A'):.2f} min | R²={m.get('r2_test', 'N/A'):.4f}")
    print("="*60)
