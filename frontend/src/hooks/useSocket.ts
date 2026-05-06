import { useEffect, useState } from 'react';
import io from 'socket.io-client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info';
}

export const useSocket = () => {
  const [plantState, setPlantState] = useState<any>({});
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [latestEpp, setLatestEpp] = useState<any>(null);
  const [latestPlate, setLatestPlate] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://172.17.0.1:4000';
    const token = localStorage.getItem('token');
    
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Socket conectado');
      setSocketStatus('connected');
    });

    socket.on('connect_error', () => {
      setSocketStatus('error');
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('state_update', (state) => {
      setPlantState(state);
    });

    socket.on('epp_update', (data) => {
      setLatestEpp(data);
    });

    socket.on('plate_update', (data) => {
      setLatestPlate(data);
    });

    socket.on('notification', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const reconnect = () => {
    window.location.reload();
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    plantState,
    socketStatus,
    reconnect,
    latestEpp,
    latestPlate,
    notifications,
    clearNotifications
  };
};
