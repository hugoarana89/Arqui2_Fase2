import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const [plantState, setPlantState] = useState<any>({});
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [latestEpp, setLatestEpp] = useState(null);
  const [latestPlate, setLatestPlate] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://172.17.0.1:4000';
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('⚠️ No hay token para WebSocket');
      setSocketStatus('disconnected');
      return;
    }
    
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket']
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

    socket.on('notification', (notif) => {
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
