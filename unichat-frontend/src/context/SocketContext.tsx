// src/context/SocketContext.tsx

import { createContext, useContext, useEffect, useState} from 'react';
import type { ReactNode } from 'react'
import io, { Socket } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface SocketContextType {
  socket: Socket | null;
}

export const SocketContext = createContext<SocketContextType>({ socket: null });

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token ?? null;
  const logout = auth?.logout ?? (() => {});
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Create new socket connection
    const newSocket: Socket = io('https://unichat-5ss8.onrender.com/', {
      auth: {
        token, // ← Clean: no extra space or object nesting
      },
      transports: ['websocket'], // Recommended for better reliability
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);

      if (err.message === 'BANNED') {
        toast.error('You are banned from Unichat.');
        logout();
        navigate('/login');
      } else if (err.message.includes('Invalid token') || err.message.includes('Unauthorized')) {
        toast.error('Session expired. Please log in again.');
        logout();
        navigate('/login');
      }
    });

    newSocket.on('banned', ({ reason }: { reason: string }) => {
      toast.error(`You have been banned: ${reason}`);
      logout();
      navigate('/login');
    });

    setSocket(newSocket);

    // Cleanup: disconnect when token changes or component unmounts
    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token, logout, navigate]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};