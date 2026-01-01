import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  sessionId: string | null;
  partnerId: string | null;
  setSession: (sessionId: string, partnerId: string) => void;
  clearSession: () => void;
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  sessionId: null,
  partnerId: null,
  setSession: () => {},
  clearSession: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token ?? null;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const setSession = (sid: string, pid: string) => {
    setSessionId(sid);
    setPartnerId(pid);
  };

  const clearSession = () => {
    setSessionId(null);
    setPartnerId(null);
  };

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

    // When backend sends match
    newSocket.on('matchFound', ({ sessionId: sid, partnerId: pid }) => {
      setSession(sid, pid);
      toast.success('New partner found!');
    });

    newSocket.on('rejoinQueue', () => {
      clearSession();
      newSocket.emit('joinQueue', { targetSchool: 'any' });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, sessionId, partnerId, setSession, clearSession }}>
      {children}
    </SocketContext.Provider>
  );
};
