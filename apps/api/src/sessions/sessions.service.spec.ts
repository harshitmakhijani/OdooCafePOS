import { Prisma } from '@prisma/client';
import { UnprocessableEntityException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Locks the response SHAPES the POS SessionLanding screen depends on (PRD §7.3,
 * §9.2). `getCurrent` → { currentSession, lastSessionDate, lastClosingSale };
 * `close` → { session, summary: { orderCount, totalSales } }. These are read at
 * `res.data.data.*` on the client (the F3/F6 envelope fixes).
 */
describe('SessionsService', () => {
  let prisma: {
    session: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let service: SessionsService;

  beforeEach(() => {
    prisma = {
      session: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new SessionsService(prisma as unknown as PrismaService);
  });

  describe('getCurrent', () => {
    it('returns the open session plus last-session info', async () => {
      const open = { id: 'sess-1', status: 'OPEN', register: { id: 'r1', name: 'R1' } };
      prisma.session.findFirst
        .mockResolvedValueOnce(open) // open session lookup
        .mockResolvedValueOnce({ id: 'sess-0', closedAt: new Date('2026-06-12'), closingAmount: new Prisma.Decimal('500.00') });

      const result = await service.getCurrent('user-1');

      expect(result).toHaveProperty('currentSession', open);
      expect(result).toHaveProperty('lastSessionDate');
      expect(result).toHaveProperty('lastClosingSale');
    });

    it('returns currentSession: null when no session is open', async () => {
      prisma.session.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const result = await service.getCurrent('user-1');
      expect(result.currentSession).toBeNull();
    });
  });

  describe('close', () => {
    it('returns a summary with orderCount and totalSales over PAID orders', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        status: 'OPEN',
        orders: [
          { status: 'PAID', total: new Prisma.Decimal('100.00') },
          { status: 'PAID', total: new Prisma.Decimal('203.20') },
          { status: 'CANCELLED', total: new Prisma.Decimal('50.00') },
        ],
      });
      prisma.session.update.mockResolvedValue({ id: 'sess-1', status: 'CLOSED' });

      const result = await service.close('sess-1');

      expect(result).toHaveProperty('session');
      expect(result.summary.orderCount).toBe(2);
      expect(result.summary.totalSales.toString()).toBe('303.2');
    });

    it('refuses to close while DRAFT orders are open (422)', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        status: 'OPEN',
        orders: [{ status: 'DRAFT', total: new Prisma.Decimal('10.00') }],
      });
      await expect(service.close('sess-1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });
});
