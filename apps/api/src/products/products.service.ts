import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const { page, pageSize, search, categoryId } = query;
    const where = {
      archived: false,
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: { category: { select: { id: true, name: true, color: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return new Paginated(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  async create(dto: CreateProductDto) {
    // Verify category exists
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.product.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        price: dto.price,
        unitOfMeasure: dto.unitOfMeasure,
        taxPercent: dto.taxPercent,
        description: dto.description,
        showOnKds: dto.showOnKds ?? true,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Category not found');
    }
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    // Check if referenced by non-draft order
    const referenced = await this.prisma.orderLine.findFirst({
      where: {
        productId: id,
        order: { status: { not: 'DRAFT' } },
      },
    });

    if (referenced) {
      return this.prisma.product.update({
        where: { id },
        data: { archived: true },
      });
    }

    return this.prisma.product.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
