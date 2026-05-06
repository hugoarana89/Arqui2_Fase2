import { useEffect, useState } from 'react';
import io from 'socket.io-client';

interface Prediction {
  linea: string;
  porcentaje_actual: number;
  minutos_restantes: number | null;
  estado: 'OPERANDO' | 'LLENA' | 'SIN_FLUJO';
  color_semaforo: string;
  timestamp: string;
}

export const usePredictions = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://172.17.0.1:4000';
    const token = localStorage.getItem('token');
    
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('prediction_update', (data: Prediction) => {
      console.log('📡 Predicción recibida:', data);
      setPredictions(prev => {
        const filtered = prev.filter(p => p.linea !== data.linea);
        return [data, ...filtered].slice(0, 50);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getPredictionForLinea = (linea: string) => {
    return predictions.find(p => p.linea === linea);
  };

  return { predictions, getPredictionForLinea };
};
