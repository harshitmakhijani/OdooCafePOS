import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.7 / §8.6): list floors with tables + derived status.
    throw new NotImplementedException('floors.findAll not implemented');
  }

  async create(_dto: CreateFloorDto) {
    // TODO(PRD §13.7 / §8.6): create a floor.
    throw new NotImplementedException('floors.create not implemented');
  }

  async update(_id: string, _dto: UpdateFloorDto) {
    // TODO(PRD §13.7 / §8.6): update a floor.
    throw new NotImplementedException('floors.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.7): remove a floor.
    throw new NotImplementedException('floors.remove not implemented');
  }
}
