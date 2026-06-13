import { KdsService } from './kds.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import type { KdsQueryDto } from './dto/kds-query.dto';

/**
 * Locks the KDS ticket contract: every ticket carries `sentToKitchenAt` (the
 * field the KDS prep timer reads — F1). The backend tracks it on the order but
 * previously never surfaced it on the ticket payload.
 */
describe('KdsService', () => {
  let prisma: {
    order: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let realtime: { emitKdsTicketUpdated: jest.Mock; emitKdsTicketRemoved: jest.Mock };
  let service: KdsService;

  const sampleOrder = (overrides: Record<string, unknown> = {}) => ({
    id: 'order-1',
    orderNumber: 42,
    kdsStage: 'TO_COOK',
    sentToKitchenAt: new Date('2026-06-13T10:00:00.000Z'),
    lines: [{ id: 'l1', productName: 'Latte', quantity: 2, itemCompleted: false }],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      order: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    realtime = { emitKdsTicketUpdated: jest.fn(), emitKdsTicketRemoved: jest.fn() };
    service = new KdsService(
      prisma as unknown as PrismaService,
      realtime as unknown as RealtimeGateway,
    );
  });

  it('findTickets includes sentToKitchenAt as an ISO string', async () => {
    prisma.order.findMany.mockResolvedValue([sampleOrder()]);
    prisma.order.count.mockResolvedValue(1);

    const result = await service.findTickets({ page: 1, pageSize: 20 } as KdsQueryDto);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].sentToKitchenAt).toBe('2026-06-13T10:00:00.000Z');
    expect(result.data[0]).toMatchObject({ orderId: 'order-1', orderNumber: 42 });
  });

  it('findTickets returns sentToKitchenAt: null when the order has none', async () => {
    prisma.order.findMany.mockResolvedValue([sampleOrder({ sentToKitchenAt: null })]);
    prisma.order.count.mockResolvedValue(1);

    const result = await service.findTickets({ page: 1, pageSize: 20 } as KdsQueryDto);
    expect(result.data[0].sentToKitchenAt).toBeNull();
  });

  it('advance carries sentToKitchenAt onto the emitted ticket', async () => {
    prisma.order.findUnique.mockResolvedValue(sampleOrder());
    prisma.order.update.mockResolvedValue(sampleOrder({ kdsStage: 'PREPARING' }));

    const ticket = await service.advance('order-1');

    expect(ticket.sentToKitchenAt).toBe('2026-06-13T10:00:00.000Z');
    expect(realtime.emitKdsTicketUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ sentToKitchenAt: '2026-06-13T10:00:00.000Z' }),
    );
  });
});
