'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, updateSocketAuthToken, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { playMessageAlertChime } from '@/lib/soundAlert';
import toast from 'react-hot-toast';

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinOrder: (orderId: string) => void;
  leaveOrder: (orderId: string) => void;
  joinProduct: (productId: string) => void;
  leaveProduct: (productId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  socket: null,
  isConnected: false,
  joinOrder: () => {},
  leaveOrder: () => {},
  joinProduct: () => {},
  leaveProduct: () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const activeSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    activeSocketRef.current = s;
    setSocket(s);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);

    if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
    };
  }, []);

  // Update socket auth token whenever user logs in or out
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      updateSocketAuthToken(token);
    }
  }, [isAuthenticated, user?.id]);

  // Join/Leave helpers
  const joinOrder = useCallback((orderId: string) => {
    if (activeSocketRef.current && orderId) {
      activeSocketRef.current.emit('join:order', orderId);
    }
  }, []);

  const leaveOrder = useCallback((orderId: string) => {
    if (activeSocketRef.current && orderId) {
      activeSocketRef.current.emit('leave:order', orderId);
    }
  }, []);

  const joinProduct = useCallback((productId: string) => {
    if (activeSocketRef.current && productId) {
      activeSocketRef.current.emit('join:product', productId);
    }
  }, []);

  const leaveProduct = useCallback((productId: string) => {
    if (activeSocketRef.current && productId) {
      activeSocketRef.current.emit('leave:product', productId);
    }
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        socket,
        isConnected,
        joinOrder,
        leaveOrder,
        joinProduct,
        leaveProduct,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
