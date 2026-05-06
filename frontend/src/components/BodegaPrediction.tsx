import React from 'react';

interface BodegaPredictionProps {
  linea: string;
  porcentaje: number;
  minutosRestantes: number | null;
  estado: 'OPERANDO' | 'LLENA' | 'SIN_FLUJO';
  colorSemaforo: string;
}

const colorMap = {
  VERDE: 'bg-green-500',
  AMARILLO: 'bg-yellow-500',
  ROJO: 'bg-red-500',
  APAGADO: 'bg-gray-500'
};

export const BodegaPrediction: React.FC<BodegaPredictionProps> = ({
  linea,
  porcentaje,
  minutosRestantes,
  estado,
  colorSemaforo
}) => {
  const getEstadoTexto = () => {
    switch (estado) {
      case 'LLENA': return '🟢 BODEGA LLENA';
      case 'SIN_FLUJO': return '⏸️ SIN FLUJO DE MATERIALES';
      default: return `🔄 OPERANDO - ${minutosRestantes} min restantes`;
    }
  };

  const getColorBarra = () => {
    if (porcentaje >= 90) return 'bg-red-500';
    if (porcentaje >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-bold capitalize">{linea}</h3>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${colorMap[colorSemaforo as keyof typeof colorMap] || 'bg-gray-500'}`} />
          <span className="text-sm font-semibold">{colorSemaforo}</span>
        </div>
      </div>
      
      {/* Barra de porcentaje */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>Almacenamiento</span>
          <span>{porcentaje.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getColorBarra()}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
      
      {/* Estado */}
      <div className="text-sm text-gray-600">
        {getEstadoTexto()}
      </div>
      
      {/* Timestamp */}
      <div className="text-xs text-gray-400 mt-2">
        Última actualización: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};