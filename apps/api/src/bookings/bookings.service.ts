import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus, TableStatus } from '@cafe-pos/types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(query: BookingQueryDto) {
    const { search, page, pageSize, status, tableId, date } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (tableId) {
      where.tableId = tableId;
    }

    if (date) {
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);
      where.reservedAt = {
        gte: start,
        lte: end,
      };
    }

    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestPhone: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: true,
          table: {
            include: {
              floor: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { reservedAt: 'asc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return new Paginated(bookings, {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  async create(dto: CreateBookingDto) {
    // Verify table exists
    const table = await this.prisma.table.findUnique({
      where: { id: dto.tableId },
    });
    if (!table) {
      throw new NotFoundException(`Table ${dto.tableId} not found`);
    }

    // Verify customer exists if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(`Customer ${dto.customerId} not found`);
      }
    }

    const booking = await this.prisma.booking.create({
      data: {
        customerId: dto.customerId,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        tableId: dto.tableId,
        reservedAt: new Date(dto.reservedAt),
        partySize: dto.partySize,
        status: dto.status ?? BookingStatus.BOOKED,
        notes: dto.notes,
      },
    });

    await this.emitTableStatusIfChanged(booking.tableId);

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto) {
    const existing = await this.ensureExists(id);

    if (dto.tableId && dto.tableId !== existing.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: dto.tableId },
      });
      if (!table) {
        throw new NotFoundException(`Table ${dto.tableId} not found`);
      }
    }

    if (dto.customerId && dto.customerId !== existing.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(`Customer ${dto.customerId} not found`);
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        tableId: dto.tableId,
        reservedAt: dto.reservedAt !== undefined ? new Date(dto.reservedAt) : undefined,
        partySize: dto.partySize,
        status: dto.status,
        notes: dto.notes,
      },
    });

    // If tableId changed, update status for both old and new tables
    if (dto.tableId && dto.tableId !== existing.tableId) {
      await this.emitTableStatusIfChanged(existing.tableId);
    }
    await this.emitTableStatusIfChanged(updated.tableId);

    return updated;
  }

  async remove(id: string) {
    const _existing = await this.ensureExists(id);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    await this.emitTableStatusIfChanged(updated.tableId);

    return updated;
  }

  private async ensureExists(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  private async emitTableStatusIfChanged(tableId: string) {
    const activeOrder = await this.prisma.order.findFirst({
      where: { tableId, status: 'DRAFT' },
    });

    let status = TableStatus.AVAILABLE;
    if (activeOrder) {
      status = TableStatus.OCCUPIED;
    } else {
      const currentBooking = await this.prisma.booking.findFirst({
        where: {
          tableId,
          status: BookingStatus.BOOKED,
          reservedAt: {
            // bookings within ±2 hours of now
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
            lte: new Date(Date.now() + 2 * 60 * 60 * 1000),
          },
        },
      });
      if (currentBooking) {
        status = TableStatus.RESERVED;
      }
    }

    this.realtimeGateway.emitTableStatus({ tableId, status });
  }
}

