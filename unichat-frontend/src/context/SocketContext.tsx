import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  // UPDATED: Removed unused sessionId/partnerId/setSession/clearSession (handled in routes/state)
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
});

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token ?? null;

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      socket?.disconnect();
      setSocket(null);
      return;
    }

    const newSocket = io('https://unichat-5ss8.onrender.com', { 
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => console.log('Socket connected:', newSocket.id));

    newSocket.on('connect_error', (err) => { // UPDATED: Error handling
      console.error('Socket error:', err);
      toast.error('Connection failed - retrying...');
    });

    newSocket.on('matchFound', () => {
  toast.success('New partner found!');
});


    newSocket.on('rejoinQueue', () => {
      newSocket.emit('joinQueue', { targetSchool: 'any' });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};