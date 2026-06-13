import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { TableStatus, BookingStatus, OrderStatus } from '@cafe-pos/types';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all floors with their tables and derived status (PRD §13.7 / §8.6).
   * Table status is computed — not stored — from active DRAFT orders and
   * current BOOKED bookings (PRD §6 "Table status is derived").
   */
  async findAll(query: PaginationQueryDto) {
    const { search, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FloorWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [floors, total] = await Promise.all([
      this.prisma.floor.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          tables: {
            orderBy: { tableNumber: 'asc' },
            include: {
              orders: {
                where: { status: OrderStatus.DRAFT },
                select: { id: true },
                take: 1,
              },
              bookings: {
                where: {
                  status: BookingStatus.BOOKED,
                  reservedAt: {
                    // Consider bookings within ±2 hours of now as "current window"
                    gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    lte: new Date(Date.now() + 2 * 60 * 60 * 1000),
                  },
                },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.floor.count({ where }),
    ]);

    // Map each table to include derived status
    const data = floors.map((floor) => ({
      ...floor,
      tables: floor.tables.map((table) => {
        const { orders, bookings, ...rest } = table;
        let status: TableStatus;
        if (orders.length > 0) {
          status = TableStatus.OCCUPIED;
        } else if (bookings.length > 0) {
          status = TableStatus.RESERVED;
        } else {
          status = TableStatus.AVAILABLE;
        }
        return { ...rest, status };
      }),
    }));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Create a new floor (PRD §13.7 / §8.6). */
  async create(dto: CreateFloorDto) {
    return this.prisma.floor.create({ data: dto });
  }

  /** Update a floor (PRD §13.7 / §8.6). */
  async update(id: string, dto: UpdateFloorDto) {
    await this.ensureExists(id);
    return this.prisma.floor.update({ where: { id }, data: dto });
  }

  /**
   * Remove a floor (PRD §13.7). Blocked if any of its tables have
   * non-cancelled orders — prevents referential integrity issues.
   */
  async remove(id: string) {
    const floor = await this.prisma.floor.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            orders: {
              where: { status: { not: OrderStatus.CANCELLED } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!floor) {
      throw new NotFoundException(`Floor ${id} not found`);
    }

    const hasActiveOrders = floor.tables.some((t) => t.orders.length > 0);
    if (hasActiveOrders) {
      throw new ConflictException(
        'Cannot delete floor: one or more tables have active orders. Archive or remove the tables first.',
      );
    }

    // Delete tables first, then the floor
    await this.prisma.$transaction([
      this.prisma.table.deleteMany({ where: { floorId: id } }),
      this.prisma.floor.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const floor = await this.prisma.floor.findUnique({ where: { id } });
    if (!floor) {
      throw new NotFoundException(`Floor ${id} not found`);
    }
    return floor;
  }
}
