import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false, onlineCount: 0 });

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const newSocket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Request missed events
      const lastSeen = sessionStorage.getItem('lastSeenAt');
      if (lastSeen) {
        newSocket.emit('getMissedEvents', { lastSeenAt: lastSeen });
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('onlineUsers', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    setSocket(newSocket);

    return () => {
      sessionStorage.setItem('lastSeenAt', new Date().toISOString());
      newSocket.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineCount }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
