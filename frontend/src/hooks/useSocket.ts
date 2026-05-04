import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  PlantState,
  EppVerification,
  PlateDetection,
  RealtimeNotification,
} from '../types/plant.types';

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
  latestEpp: EppVerification | null;
  latestPlate: PlateDetection | null;
  notifications: RealtimeNotification[];
  clearNotifications: () => void;
  reconnect: () => void;
}

const createNotificationId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useSocket = (): UseSocketReturn => {
  const [plantState, setPlantState] = useState<PlantState>(DEFAULT_STATE);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [latestEpp, setLatestEpp] = useState<EppVerification | null>(null);
  const [latestPlate, setLatestPlate] = useState<PlateDetection | null>(null);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

  const SERVER_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api')
    .replace('/api', '');

  const addNotification = useCallback(
    (notification: Omit<RealtimeNotification, 'id' | 'createdAt'>) => {
      setNotifications((prev) => [
        {
          ...notification,
          id: createNotificationId(),
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 8));
    },
    []
  );

  const connect = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSocketStatus('error');
      return;
    }

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

    socket.on('state_update', (data: PlantState) => {
      setPlantState(data);
    });

    socket.on('epp_update', (data: EppVerification) => {
      setLatestEpp(data);

      if (!data.access_granted) {
        addNotification({
          type: 'danger',
          title: 'Incumplimiento de EPP',
          message: 'No se detectó el casco requerido en el acceso peatonal.',
        });
      }
    });

    socket.on('plate_update', (data: PlateDetection) => {
      setLatestPlate(data);

      if (data.status === 'no_autorizada') {
        addNotification({
          type: 'warning',
          title: 'Placa no autorizada',
          message: `La placa ${data.plate ?? 'desconocida'} no está autorizada.`,
        });
      }

      if (data.status === 'no_detectada') {
        addNotification({
          type: 'warning',
          title: 'Placa no detectada',
          message: 'No se logró extraer correctamente el número de placa.',
        });
      }
    });
  }, [SERVER_URL, addNotification]);

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

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    plantState,
    socketStatus,
    latestEpp,
    latestPlate,
    notifications,
    clearNotifications,
    reconnect,
  };
};