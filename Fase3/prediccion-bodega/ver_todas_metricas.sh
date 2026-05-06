#!/bin/bash
echo "============================================================"
echo "📊 MÉTRICAS DE MODELOS DE PREDICCIÓN"
echo "============================================================"
printf "%-10s | %-10s | %-10s | %-8s\n" "Bodega" "MAE(min)" "RMSE(min)" "R²"
echo "------------------------------------------------------------"

for linea in plastico vidrio metal; do
    if [ -f "models/bodega_${linea}_metadata.json" ]; then
        MAE=$(cat models/bodega_${linea}_metadata.json | python -c "import sys,json; print(f\"{json.load(sys.stdin)['metricas']['mae']:.2f}\")")
        RMSE=$(cat models/bodega_${linea}_metadata.json | python -c "import sys,json; print(f\"{json.load(sys.stdin)['metricas']['rmse']:.2f}\")")
        R2=$(cat models/bodega_${linea}_metadata.json | python -c "import sys,json; print(f\"{json.load(sys.stdin)['metricas']['r2']:.3f}\")")
        printf "%-10s | %-10s | %-10s | %-8s\n" "${linea^^}" "$MAE" "$RMSE" "$R2"
    fi
done
echo "============================================================"
