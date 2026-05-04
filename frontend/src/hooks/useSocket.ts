import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  PlantState,
  EppVerification,
  PlateDetection,
  RealtimeNotification,
} from '../types/plant.types';

// ──────────────────────────────────────────────
// useSocket — conecta con Socket.io del backend
// Notificaciones críticas Fase 3 según rúbrica:
// - Incumplimiento de EPP
// - Placa no autorizada
// - Bodega llena
// - Sensor crítico / paro de emergencia
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

  const previousStateRef = useRef<PlantState | null>(null);
  const notificationCooldownRef = useRef<Map<string, number>>(new Map());

  const SERVER_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api')
    .replace('/api', '');

  const addNotification = useCallback(
    (
      notification: Omit<RealtimeNotification, 'id' | 'createdAt'>,
      key?: string
    ) => {
      const notificationKey = key ?? `${notification.title}-${notification.message}`;
      const now = Date.now();
      const lastTime = notificationCooldownRef.current.get(notificationKey) ?? 0;

      // Evita duplicados muy seguidos por reconexión, doble render o pruebas repetidas.
      if (now - lastTime < 3500) return;

      notificationCooldownRef.current.set(notificationKey, now);

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

  const evaluatePlantStateNotifications = useCallback(
    (current: PlantState) => {
      const previous = previousStateRef.current;

      // Primera lectura: solo guarda el estado base para no generar alertas falsas al cargar.
      if (!previous) {
        previousStateRef.current = current;
        return;
      }

      // 1. Sensor crítico: humo
      if (current.alerta_humo && !previous.alerta_humo) {
        addNotification(
          {
            type: 'danger',
            title: 'Sensor crítico activado',
            message: `Se detectó humo en la planta. Umbral actual: ${current.umbral_humo} ppm.`,
          },
          'alerta_humo'
        );
      }

      // 2. Paro de emergencia
      if (current.modo_emergencia && !previous.modo_emergencia) {
        addNotification(
          {
            type: 'danger',
            title: 'Paro de emergencia activado',
            message: 'El sistema entró en modo emergencia. Las operaciones fueron suspendidas.',
          },
          'modo_emergencia'
        );
      }

      // 3. Bodega llena: plástico
      if (current.almacen_plastico >= 100 && previous.almacen_plastico < 100) {
        addNotification(
          {
            type: 'danger',
            title: 'Bodega llena',
            message: 'La bodega de plástico alcanzó su capacidad máxima.',
          },
          'bodega_plastico_llena'
        );
      }

      // 4. Bodega llena: vidrio
      if (current.almacen_vidrio >= 100 && previous.almacen_vidrio < 100) {
        addNotification(
          {
            type: 'danger',
            title: 'Bodega llena',
            message: 'La bodega de vidrio alcanzó su capacidad máxima.',
          },
          'bodega_vidrio_llena'
        );
      }

      // 5. Bodega llena: metal
      if (current.almacen_metal >= 100 && previous.almacen_metal < 100) {
        addNotification(
          {
            type: 'danger',
            title: 'Bodega llena',
            message: 'La bodega de metal alcanzó su capacidad máxima.',
          },
          'bodega_metal_llena'
        );
      }

      previousStateRef.current = current;
    },
    [addNotification]
  );

  const connect = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setSocketStatus('error');
      return;
    }

    setSocketStatus('connecting');

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
      evaluatePlantStateNotifications(data);
    });

    socket.on('epp_update', (data: EppVerification) => {
      setLatestEpp(data);

      // Notificación solicitada: incumplimiento de EPP.
      // No se notifica cuando el casco sí fue detectado porque eso es operación normal.
      if (!data.access_granted) {
        addNotification(
          {
            type: 'danger',
            title: 'Incumplimiento de EPP',
            message: 'No se detectó el casco requerido en el acceso peatonal.',
          },
          'epp_incumplido'
        );
      }
    });

    socket.on('plate_update', (data: PlateDetection) => {
      setLatestPlate(data);

      // Notificación solicitada: placa no autorizada.
      // No se notifica placa autorizada porque es operación normal.
      if (data.status === 'no_autorizada') {
        addNotification(
          {
            type: 'warning',
            title: 'Placa no autorizada',
            message: `La placa ${data.plate ?? 'desconocida'} no está autorizada.`,
          },
          `placa_no_autorizada_${data.plate ?? 'desconocida'}`
        );
      }
    });
  }, [SERVER_URL, addNotification, evaluatePlantStateNotifications]);

  useEffect(() => {
    connect();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    socketRef.current?.disconnect();
    previousStateRef.current = null;
    connect();
  }, [connect]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    notificationCooldownRef.current.clear();
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