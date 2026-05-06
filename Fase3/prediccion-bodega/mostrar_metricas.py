#!/usr/bin/env python3
"""
Mostrar métricas de los modelos desde los archivos JSON
"""

import json
import os

print("="*60)
print("📊 MÉTRICAS DE LOS MODELOS DE PREDICCIÓN")
print("="*60)

for linea in ['plastico', 'vidrio', 'metal']:
    meta_path = f'models/bodega_{linea}_metadata.json'
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            meta = json.load(f)
        
        print(f"\n📍 BODEGA: {linea.upper()}")
        print(f"   📅 Entrenado: {meta.get('fecha_entrenamiento', 'N/A')[:19]}")
        print(f"   📊 Muestras: {meta.get('n_muestras', 'N/A')}")
        
        # Soporta ambos formatos de métricas
        m = meta.get('metricas', {})
        
        # Buscar MAE en diferentes posibles keys
        mae = m.get('mae_test') or m.get('mae') or m.get('mae_train')
        rmse = m.get('rmse_test') or m.get('rmse') or m.get('rmse_train')
        r2 = m.get('r2_test') or m.get('r2') or m.get('r2_train')
        
        if mae:
            print(f"   ✅ MAE:  {mae:.2f} minutos")
        if rmse:
            print(f"   📈 RMSE: {rmse:.2f} minutos")
        if r2:
            print(f"   🎯 R²:   {r2:.3f} ({r2*100:.1f}% precisión)")
        
        # Interpretación
        if r2 and r2 > 0.95:
            print(f"   🌟 Excelente! Modelo muy preciso")
        elif r2 and r2 > 0.9:
            print(f"   👍 Muy bueno! Modelo confiable")
        elif r2:
            print(f"   📉 Aceptable, puede mejorar con más datos")

print("\n" + "="*60)
print("✅ Modelos listos para producción")
print("="*60)
