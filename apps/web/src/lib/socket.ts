import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '@cafe-pos/types';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket<ServerToClientEvents> | null = null;

/** Current access token formatted for the handshake (empty when logged out). */
function currentAuthToken(): string {
  const token = useAuthStore.getState().accessToken;
  return token ? `Bearer ${token}` : '';
}

/**
 * Lazily create the Socket.IO client. The handshake token is supplied via the
 * CALLBACK form of `auth`, which Socket.IO re-invokes on every (re)connect — so
 * a token that rotated since the socket was created (15-min access TTL, or a
 * socket created before login) is always re-read fresh instead of using a stale
 * snapshot. The server joins the client into `kitchen` / `floor` rooms by role
 * (PRD §14). Clients only listen — they never mutate over the socket.
 */
export function getSocket(): Socket<ServerToClientEvents> {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      auth: (cb) => cb({ token: currentAuthToken() }),
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

/**
 * When the access token rotates (refresh-on-401), an already-open handshake was
 * authenticated with the now-stale token. Force a reconnect so the auth callback
 * re-runs with the fresh token and the gateway re-authenticates the connection.
 * A token going null (logout) is handled by AuthContext via disconnectSocket().
 */
useAuthStore.subscribe((state, prev) => {
  if (socket && state.accessToken && state.accessToken !== prev.accessToken) {
    socket.disconnect();
    socket.connect();
  }
});
