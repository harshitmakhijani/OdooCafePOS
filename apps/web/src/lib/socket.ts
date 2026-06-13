import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '@cafe-pos/types';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket<ServerToClientEvents> | null = null;

/**
 * Lazily create the Socket.IO client. Authenticates the handshake with the
 * access token; the server joins the client into `kitchen` / `floor` rooms by
 * role (PRD §14). Clients only listen — they never mutate over the socket.
 */
export function getSocket(): Socket<ServerToClientEvents> {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      auth: { token: token ? `Bearer ${token}` : undefined },
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
