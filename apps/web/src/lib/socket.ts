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
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      // `auth` as a callback is re-invoked on every (re)connect, so the CURRENT
      // access token is always sent — even if the socket was created before login
      // or the token was rotated by a refresh since the last connect (PRD §14).
      auth: (cb: (data: { token?: string }) => void) => {
        const token = useAuthStore.getState().accessToken;
        cb({ token: token ? `Bearer ${token}` : undefined });
      },
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

// When the access token changes (login / refresh / logout), drop the existing
// socket so the next getSocket() reconnects with the fresh token.
let lastToken = useAuthStore.getState().accessToken;
useAuthStore.subscribe((state) => {
  if (state.accessToken !== lastToken) {
    lastToken = state.accessToken;
    disconnectSocket();
  }
});
