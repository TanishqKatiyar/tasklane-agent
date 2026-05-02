import type { RealtimeClientEvents, RealtimeServerEvents } from '@tasklane/shared';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

export const getSocketUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
};

// Singleton socket instance, un-connected by default
export const socket: Socket<RealtimeServerEvents, RealtimeClientEvents> = io(getSocketUrl(), {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});
