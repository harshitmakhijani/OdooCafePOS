/**
 * @cafe-pos/types — the single source of truth for cross-app contracts.
 *
 * Both `@cafe-pos/api` and `@cafe-pos/web` import from here. Do NOT redefine
 * these enums/types inside either app (PRD §7). Enum string values mirror the
 * Prisma schema (PRD §6) exactly so the wire format is stable.
 */

/* ───────────────────────── Domain enums (PRD §6) ───────────────────────── */

export enum Role {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum PaymentType {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PromotionType {
  COUPON = 'COUPON',
  AUTOMATED = 'AUTOMATED',
}

export enum PromotionScope {
  ORDER = 'ORDER',
  PRODUCT = 'PRODUCT',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum KdsStage {
  NONE = 'NONE',
  TO_COOK = 'TO_COOK',
  PREPARING = 'PREPARING',
  COMPLETED = 'COMPLETED',
}

export enum BookingStatus {
  BOOKED = 'BOOKED',
  SEATED = 'SEATED',
  CANCELLED = 'CANCELLED',
}

/**
 * Derived (not stored) table status — computed from a table's draft orders and
 * bookings (PRD §6 "Table status is derived"). Broadcast over the `floor` room.
 */
export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

/* ─────────────────────── Response envelopes (PRD §16.4) ─────────────────── */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Standard success envelope: `{ data, meta? }`. */
export interface SuccessEnvelope<T = unknown> {
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export interface ApiError {
  /** Machine-readable code, e.g. `VALIDATION_ERROR`, `CONFLICT`. */
  code: string;
  message: string;
  details?: unknown;
}

/** Standard error envelope: `{ error: { code, message, details? } }`. */
export interface ErrorEnvelope {
  error: ApiError;
}

/* ───────────────────── Socket.IO event payloads (PRD §14) ───────────────── */

/** Room names clients join on connect, gated by role. */
export const SOCKET_ROOMS = {
  KITCHEN: 'kitchen',
  FLOOR: 'floor',
} as const;
export type SocketRoom = (typeof SOCKET_ROOMS)[keyof typeof SOCKET_ROOMS];

export interface KdsTicketLine {
  orderLineId: string;
  name: string;
  quantity: number;
  completed: boolean;
}

export interface KdsTicket {
  orderId: string;
  orderNumber: number;
  stage: KdsStage;
  lines: KdsTicketLine[];
}

export interface TableStatusEvent {
  tableId: string;
  status: TableStatus;
}

export interface OrderUpdatedEvent {
  orderId: string;
  tableId: string | null;
  status: OrderStatus;
  total: string; // Decimal serialized as string to preserve precision
}

export interface KdsTicketRemovedEvent {
  orderId: string;
}

/** Server → client event names + their payload types. */
export const SOCKET_EVENTS = {
  KDS_TICKET_NEW: 'kds:ticket:new',
  KDS_TICKET_UPDATED: 'kds:ticket:updated',
  KDS_TICKET_REMOVED: 'kds:ticket:removed',
  TABLE_STATUS: 'table:status',
  ORDER_UPDATED: 'order:updated',
} as const;
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Typed map of every server→client event to its payload (PRD §14). */
export interface ServerToClientEvents {
  'kds:ticket:new': (ticket: KdsTicket) => void;
  'kds:ticket:updated': (ticket: KdsTicket) => void;
  'kds:ticket:removed': (payload: KdsTicketRemovedEvent) => void;
  'table:status': (payload: TableStatusEvent) => void;
  'order:updated': (payload: OrderUpdatedEvent) => void;
}

/* ───────────────────────── Auth contract (PRD §13.1) ────────────────────── */

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

/** JWT access-token payload shape. */
export interface JwtAccessPayload {
  sub: string; // user id
  username: string;
  role: Role;
}
