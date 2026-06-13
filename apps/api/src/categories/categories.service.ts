import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where = {
      archived: false,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.category.count({ where }),
    ]);

    return new Paginated(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    // Check if any product in this category is referenced by ANY order line
    // (any order status). Order lines have no cascade, so a hard delete here
    // would raise P2003 → 500.
    const referenced = await this.prisma.orderLine.findFirst({
      where: {
        product: { categoryId: id },
      },
    });

    if (referenced) {
      // Archive instead of delete (PRD §6 soft delete)
      return this.prisma.category.update({
        where: { id },
        data: { archived: true },
      });
    }

    return this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
