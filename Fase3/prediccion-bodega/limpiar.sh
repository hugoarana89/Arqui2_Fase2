#!/bin/bash
echo "🧹 Limpiando archivos no necesarios..."

cd ~/Documentos/Arqui/Arqui2_Fase2/Fase3/prediccion-bodega

# Eliminar archivos temporales
rm -f evaluate_models.py
rm -f update_metrics.py
rm -f prediction_service_all.py
rm -f explore_data.py
rm -f test_listener.py
rm -f metrics.py

# Eliminar caché de Python
rm -rf __pycache__

# Verificar archivos restantes
echo ""
echo "📁 Archivos finales del proyecto:"
ls -la *.py models/

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "Archivos conservados:"
echo "  - prediction_service.py  (servicio principal)"
echo "  - simulate.py            (generador de datos)"
echo "  - listener.py            (cliente MQTT)"
echo "  - mostrar_metricas.py    (ver métricas)"
echo "  - requirements.txt       (dependencias)"
echo "  - models/                (modelos entrenados)"
