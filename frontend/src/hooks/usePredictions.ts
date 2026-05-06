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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://172.17.0.1:4000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('⚠️ No hay token de autenticación. Inicia sesión primero.');
      return;
    }
    
    console.log('🔌 Conectando WebSocket a:', WS_URL);
    
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setIsConnected(true);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket error:', err.message);
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setIsConnected(false);
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

  return { predictions, getPredictionForLinea, isConnected };
};
