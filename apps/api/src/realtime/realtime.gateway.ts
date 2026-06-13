import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  Role,
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  type JwtAccessPayload,
  type KdsTicket,
  type KdsTicketRemovedEvent,
  type OrderUpdatedEvent,
  type TableStatusEvent,
} from '@cafe-pos/types';

/**
 * Resolve the allowed CORS origins from env at call time. ConfigModule loads the
 * .env into process.env during bootstrap (before any socket connects), so the
 * allowlist is available here without the decorator needing DI.
 */
function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Socket.IO gateway (PRD §14). Authenticates the handshake with the access
 * token, joins clients into `kitchen` / `floor` rooms by role, and exposes
 * typed `emit*` helpers that domain services call after a successful REST
 * mutation. Clients are broadcast targets only — they never mutate over the
 * socket. CORS is restricted to the configured app origin(s) (PRD §16.1).
 */
@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow non-browser clients (no Origin header) and allowlisted origins only.
      if (!origin || allowedOrigins().includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Missing access token');
      }
      const payload = this.jwt.verify<JwtAccessPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      client.data.user = payload;

      // Join rooms by role (PRD §14). Admin can observe both surfaces.
      if (payload.role === Role.KITCHEN || payload.role === Role.ADMIN) {
        await client.join(SOCKET_ROOMS.KITCHEN);
      }
      if (payload.role === Role.CASHIER || payload.role === Role.ADMIN) {
        await client.join(SOCKET_ROOMS.FLOOR);
      }
      this.logger.debug(`Socket ${client.id} connected as ${payload.username} (${payload.role})`);
    } catch (err) {
      this.logger.warn(`Rejected socket ${client.id}: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token as string | undefined;
    if (auth) {
      return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    }
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }

  /* ───────────── Typed emit helpers (server → client, PRD §14) ───────────── */

  emitKdsTicketNew(ticket: KdsTicket): void {
    this.server.to(SOCKET_ROOMS.KITCHEN).emit(SOCKET_EVENTS.KDS_TICKET_NEW, ticket);
  }

  emitKdsTicketUpdated(ticket: KdsTicket): void {
    this.server.to(SOCKET_ROOMS.KITCHEN).emit(SOCKET_EVENTS.KDS_TICKET_UPDATED, ticket);
  }

  emitKdsTicketRemoved(payload: KdsTicketRemovedEvent): void {
    this.server.to(SOCKET_ROOMS.KITCHEN).emit(SOCKET_EVENTS.KDS_TICKET_REMOVED, payload);
  }

  emitTableStatus(payload: TableStatusEvent): void {
    this.server.to(SOCKET_ROOMS.FLOOR).emit(SOCKET_EVENTS.TABLE_STATUS, payload);
  }

  emitOrderUpdated(payload: OrderUpdatedEvent): void {
    this.server.to(SOCKET_ROOMS.FLOOR).emit(SOCKET_EVENTS.ORDER_UPDATED, payload);
  }
}
