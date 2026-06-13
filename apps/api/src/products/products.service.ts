import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: ProductQueryDto) {
    // TODO(PRD §13.4 / §8.2): list products (paginated, searchable, filter by categoryId).
    throw new NotImplementedException('products.findAll not implemented');
  }

  async create(_dto: CreateProductDto) {
    // TODO(PRD §13.4 / §8.2): create a product.
    throw new NotImplementedException('products.create not implemented');
  }

  async update(_id: string, _dto: UpdateProductDto) {
    // TODO(PRD §13.4 / §8.2): update a product.
    throw new NotImplementedException('products.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.4 / §6): delete product or archive if referenced.
    throw new NotImplementedException('products.remove not implemented');
  }
}
