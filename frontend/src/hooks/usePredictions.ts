import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

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
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const socketUrl = API_URL.replace('/api', '');
    
    const token = localStorage.getItem('token');
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('prediction_update', (data: Prediction) => {
      setPredictions(prev => {
        // Mantener solo últimas 50 predicciones
        const newList = [data, ...prev.filter(p => p.linea !== data.linea)];
        return newList.slice(0, 50);
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const getPredictionForLinea = (linea: string) => {
    return predictions.find(p => p.linea === linea);
  };

  return { predictions, getPredictionForLinea };
};