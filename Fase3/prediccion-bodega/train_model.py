#!/usr/bin/env python3
"""
Entrenamiento del modelo de predicción V3 - Gradient Boosting
Mayor precisión y mejor generalización
"""

import pymongo
import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

def build_features_advanced(df):
    """Construye características avanzadas para predicción"""
    
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    # Características
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
    
    # 6. Velocidad de llenado (diferencias)
    velocidad = [0]
    for i in range(1, len(df)):
        delta_p = df.iloc[i]['porcentaje_almacen_tras_evento'] - df.iloc[i-1]['porcentaje_almacen_tras_evento']
        delta_t = (df.iloc[i]['timestamp'] - df.iloc[i-1]['timestamp']).total_seconds() / 60
        vel = delta_p / delta_t if delta_t > 0 else 0
        velocidad.append(max(0, vel))
    X['velocidad_llenado'] = velocidad
    
    # 7. Aceleración (cambio en velocidad)
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
    
    # 12. Tiempo desde último reinicio (simular)
    X['tiempo_desde_inicio'] = (pd.to_datetime(df['timestamp']) - df['timestamp'].min()).dt.total_seconds() / 60
    
    # Variable objetivo: minutos hasta llenado (más precisa)
    y = []
    for idx, row in df.iterrows():
        porcentaje_actual = row['porcentaje_almacen_tras_evento']
        
        if porcentaje_actual >= 99.5:
            y.append(0)
            continue
        
        # Buscar eventos futuros
        eventos_futuros = df.iloc[idx+1:].copy()
        
        if len(eventos_futuros) == 0:
            # Estimación por velocidad
            vel = velocidad[idx] if idx < len(velocidad) else 0
            if vel > 0:
                tiempo_estimado = (100 - porcentaje_actual) / vel
                y.append(min(tiempo_estimado, 60))
            else:
                y.append(30)
            continue
        
        # Encontrar cuándo llegará a 100%
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

def main():
    print("="*60)
    print("🤖 ENTRENAMIENTO DEL MODELO V3 (GRADIENT BOOSTING)")
    print("="*60)
    
    LINEA = 'plastico'
    print(f"\n📍 Bodega seleccionada: {LINEA.upper()}")
    
    # Conectar a MongoDB
    print("\n🔌 Conectando a MongoDB...")
    uri = os.getenv('MONGO_URI')
    client = pymongo.MongoClient(uri)
    db_name = os.getenv('DB_NAME', 'ecosort_db')
    db = client[db_name]
    collection = db['classification_results']
    
    # Extraer datos
    print(f"\n📥 Extrayendo datos históricos...")
    cursor = collection.find({
        'linea': LINEA,
        'porcentaje_almacen_tras_evento': {'$exists': True, '$ne': None}
    }).sort('timestamp', 1)
    
    df = pd.DataFrame(list(cursor))
    print(f"✅ Encontrados {len(df)} registros")
    print(f"   Rango: {df['timestamp'].min()} a {df['timestamp'].max()}")
    
    # Construir features avanzadas
    print("\n🔧 Construyendo features avanzadas...")
    X, y = build_features_advanced(df)
    
    # Limpiar
    mask = ~(pd.isna(y) | X.isna().any(axis=1) | (y <= 0) | (y > 60))
    X = X[mask]
    y = y[mask]
    
    print(f"✅ Features: {list(X.columns)}")
    print(f"📊 Muestras válidas: {len(X)}")
    print(f"   Rango de minutos restantes: {y.min():.1f} - {y.max():.1f}")
    
    if len(X) < 50:
        print("❌ No hay suficientes datos")
        return
    
    # Dividir
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Entrenar Gradient Boosting (más preciso que Random Forest)
    print("\n🤖 Entrenando Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        min_samples_split=3,
        min_samples_leaf=2,
        subsample=0.8,
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
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
    
    print("\n" + "="*50)
    print("📊 MÉTRICAS DEL MODELO V3")
    print("="*50)
    print(f"TRAIN - MAE: {mae_train:.2f} min | RMSE: {rmse_train:.2f} | R²: {r2_train:.3f}")
    print(f"TEST  - MAE: {mae_test:.2f} min | RMSE: {rmse_test:.2f} | R²: {r2_test:.3f}")
    print(f"CV (5-fold) R²: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    print("="*50)
    
    # Importancia
    print("\n📌 Importancia de características:")
    for name, imp in sorted(zip(X.columns, model.feature_importances_), key=lambda x: x[1], reverse=True):
        print(f"   {name}: {imp:.3f}")
    
    # Guardar
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, f'models/bodega_{LINEA}_model_v3.pkl')
    
    metadata = {
        'linea': LINEA,
        'version': 3,
        'modelo': 'GradientBoostingRegressor',
        'fecha_entrenamiento': datetime.now().isoformat(),
        'n_muestras': len(X),
        'features': list(X.columns),
        'metricas': {
            'mae_test': float(mae_test),
            'rmse_test': float(rmse_test),
            'r2_test': float(r2_test),
            'cv_r2_mean': float(cv_scores.mean()),
            'cv_r2_std': float(cv_scores.std())
        }
    }
    
    with open(f'models/bodega_{LINEA}_metadata_v3.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Modelo V3 guardado en: models/bodega_{LINEA}_model_v3.pkl")
    print(f"   MAE: {mae_test:.2f} minutos (error promedio)")
    
    client.close()

if __name__ == '__main__':
    main()
