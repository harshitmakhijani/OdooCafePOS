import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTableDto) {
    // Check if floor exists
    const floor = await this.prisma.floor.findUnique({
      where: { id: dto.floorId },
    });
    if (!floor) {
      throw new NotFoundException(`Floor ${dto.floorId} not found`);
    }

    // Check unique table number on this floor
    const existing = await this.prisma.table.findUnique({
      where: {
        floorId_tableNumber: {
          floorId: dto.floorId,
          tableNumber: dto.tableNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Table number ${dto.tableNumber} already exists on floor ${dto.floorId}`,
      );
    }

    return this.prisma.table.create({ data: dto });
  }

  async update(id: string, dto: UpdateTableDto) {
    const table = await this.ensureExists(id);

    // If floorId is changing, verify the new floor exists
    if (dto.floorId && dto.floorId !== table.floorId) {
      const floor = await this.prisma.floor.findUnique({
        where: { id: dto.floorId },
      });
      if (!floor) {
        throw new NotFoundException(`Floor ${dto.floorId} not found`);
      }
    }

    // If floorId or tableNumber is changing, check uniqueness
    const newFloorId = dto.floorId ?? table.floorId;
    const newTableNumber = dto.tableNumber ?? table.tableNumber;
    if (newFloorId !== table.floorId || newTableNumber !== table.tableNumber) {
      const existing = await this.prisma.table.findUnique({
        where: {
          floorId_tableNumber: {
            floorId: newFloorId,
            tableNumber: newTableNumber,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Table number ${newTableNumber} already exists on floor ${newFloorId}`,
        );
      }
    }

    return this.prisma.table.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    // Check if referenced by any orders
    const orderCount = await this.prisma.order.count({
      where: { tableId: id },
    });

    if (orderCount > 0) {
      // Archive (deactivate) if referenced by orders
      await this.prisma.table.update({
        where: { id },
        data: { active: false },
      });
      return { archived: true };
    }

    // Otherwise delete it
    await this.prisma.table.delete({
      where: { id },
    });
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });
    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }
    return table;
  }
}

