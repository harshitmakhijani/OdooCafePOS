import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto } from './dto/open-session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /sessions/current — return the caller's open session + last-session info
   * for the POS landing screen (PRD §7.3, §9.2).
   */
  async getCurrent(userId: string, registerId?: string) {
    // Find open session for this employee (optionally scoped to register)
    const openSession = await this.prisma.session.findFirst({
      where: {
        employeeId: userId,
        status: 'OPEN',
        ...(registerId ? { registerId } : {}),
      },
      include: { register: true },
    });

    // Last closed session for landing screen info
    const lastSession = await this.prisma.session.findFirst({
      where: {
        employeeId: userId,
        status: 'CLOSED',
      },
      orderBy: { closedAt: 'desc' },
      select: {
        id: true,
        closedAt: true,
        closingAmount: true,
      },
    });

    return {
      currentSession: openSession,
      lastSessionDate: lastSession?.closedAt ?? null,
      lastClosingSale: lastSession?.closingAmount ?? null,
    };
  }

  /**
   * POST /sessions/open — open a session on a register.
   * One open session per (employee + register) at a time (PRD §7.3).
   */
  async open(dto: OpenSessionDto, userId: string) {
    // Verify register exists
    const register = await this.prisma.register.findUnique({
      where: { id: dto.registerId },
    });
    if (!register) {
      throw new NotFoundException('Register not found');
    }

    // Check for existing open session for this employee+register
    const existing = await this.prisma.session.findFirst({
      where: {
        employeeId: userId,
        registerId: dto.registerId,
        status: 'OPEN',
      },
    });
    if (existing) {
      throw new ConflictException(
        'You already have an open session on this register',
      );
    }

    return this.prisma.session.create({
      data: {
        employeeId: userId,
        registerId: dto.registerId,
      },
      include: { register: true },
    });
  }

  /**
   * POST /sessions/:id/close — close a session with closing summary.
   * Rejects if DRAFT orders exist (422). Computes order count + total of PAID orders.
   */
  async close(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        orders: {
          select: { status: true, total: true },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status === 'CLOSED') {
      throw new UnprocessableEntityException('Session is already closed');
    }

    // Check for open DRAFT orders (PRD §7.3)
    const draftOrders = session.orders.filter((o) => o.status === 'DRAFT');
    if (draftOrders.length > 0) {
      throw new UnprocessableEntityException(
        `Cannot close: ${draftOrders.length} draft order(s) are still open`,
      );
    }

    // Compute closing summary: count + total of PAID orders
    const paidOrders = session.orders.filter((o) => o.status === 'PAID');
    const orderCount = paidOrders.length;
    const closingAmount = paidOrders.reduce(
      (sum, o) => sum.add(o.total),
      new Prisma.Decimal(0),
    );

    const closedSession = await this.prisma.session.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingAmount,
      },
      include: { register: true },
    });

    return {
      session: closedSession,
      summary: {
        orderCount,
        totalSales: closingAmount,
      },
    };
  }
}
