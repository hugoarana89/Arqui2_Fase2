import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlantState } from '../types/plant.types';

// ──────────────────────────────────────────────
//  useSocket — conecta con Socket.io del backend
//  Usa socket.io-client (debe estar en package.json)
// ──────────────────────────────────────────────

const DEFAULT_STATE: PlantState = {
  parqueos_ocupados: 0,
  talanquera_abierta: false,
  alerta_parqueo_lleno: false,
  puerta_abierta: false,
  alerta_rfid: false,
  banda_principal: true,
  banda_plastico: true,
  banda_vidrio: true,
  banda_metal: true,
  codigo_material: 0,
  alerta_humo: false,
  umbral_humo: 0,
  modo_emergencia: false,
  iluminacion: true,
  almacen_plastico: 40,
  almacen_vidrio: 80,
  almacen_metal: 10,
  almacen_max: 10,
  last_updated: new Date().toISOString(),
};

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSocketReturn {
  plantState: PlantState;
  socketStatus: SocketStatus;
  reconnect: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [plantState, setPlantState] = useState<PlantState>(DEFAULT_STATE);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

  const SERVER_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api')
    .replace('/api', '');

  const connect = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setSocketStatus('error'); return; }

    setSocketStatus('connecting');

    // Lazy-import socket.io-client
    const { io } = await import('socket.io-client');

    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('error'));
    socket.on('state_update', (data: PlantState) => setPlantState(data));
  }, [SERVER_URL]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    socketRef.current?.disconnect();
    connect();
  }, [connect]);

  return { plantState, socketStatus, reconnect };
};
