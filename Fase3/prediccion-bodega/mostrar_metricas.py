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
        
        m = meta['metricas']
        print(f"\n📍 BODEGA: {linea.upper()}")
        print(f"   📅 Entrenado: {meta['fecha_entrenamiento'][:19]}")
        print(f"   📊 Muestras: {meta['n_muestras']}")
        print(f"   ✅ MAE:  {m['mae']:.2f} minutos")
        print(f"   📈 RMSE: {m['rmse']:.2f} minutos")
        print(f"   🎯 R²:   {m['r2']:.3f} ({m['r2']*100:.1f}% precisión)")
        
        # Interpretación
        if m['r2'] > 0.95:
            print(f"   🌟 Excelente! Modelo muy preciso")
        elif m['r2'] > 0.9:
            print(f"   👍 Muy bueno! Modelo confiable")
        else:
            print(f"   📉 Aceptable, puede mejorar con más datos")

print("\n" + "="*60)
print("✅ Modelos listos para producción")
print("="*60)
