import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.3 / §8.3): list categories (paginated, searchable).
    throw new NotImplementedException('categories.findAll not implemented');
  }

  async create(_dto: CreateCategoryDto) {
    // TODO(PRD §13.3 / §8.3): create a category (name, color).
    throw new NotImplementedException('categories.create not implemented');
  }

  async update(_id: string, _dto: UpdateCategoryDto) {
    // TODO(PRD §13.3 / §8.3): update a category; color edits propagate by reference.
    throw new NotImplementedException('categories.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.3 / §6): delete, or archive instead if referenced by orders.
    throw new NotImplementedException('categories.remove not implemented');
  }
}
