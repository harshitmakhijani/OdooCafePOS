import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateRegisterDto } from './dto/create-register.dto';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class RegistersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where = {
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.register.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.register.count({ where }),
    ]);

    return new Paginated(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  async create(dto: CreateRegisterDto) {
    const existing = await this.prisma.register.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Register "${dto.name}" already exists`);
    }
    return this.prisma.register.create({ data: { name: dto.name } });
  }
}
