import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import type { Socket } from 'socket.io-client';

export const useSocket = (): Socket | null => {
  const { socket } = useContext(SocketContext);
  return socket;
};
