#!/bin/bash
echo "=========================================="
echo "🚀 EcoSort - Predicción de Bodegas"
echo "=========================================="
cd "$(dirname "$0")"
source venv/bin/activate

# Iniciar generador de datos en background
python simulate.py > /tmp/generator.log 2>&1 &
echo "📡 Generador de datos activo"

# Iniciar servicio de predicción
echo "🔮 Iniciando predicciones (cada 5s)..."
python prediction_service.py

# Al salir, matar el generador
pkill -f "simulate.py" 2>/dev/null
echo "✅ Sistema detenido"
