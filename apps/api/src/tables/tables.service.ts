import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(_dto: CreateTableDto) {
    // TODO(PRD §13.7 / §8.6): create a table.
    throw new NotImplementedException('tables.create not implemented');
  }

  async update(_id: string, _dto: UpdateTableDto) {
    // TODO(PRD §13.7 / §8.6): update a table.
    throw new NotImplementedException('tables.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.7): remove a table.
    throw new NotImplementedException('tables.remove not implemented');
  }
}
