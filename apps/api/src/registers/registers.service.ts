import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateRegisterDto } from './dto/create-register.dto';

@Injectable()
export class RegistersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.9 / §7.3): list registers.
    throw new NotImplementedException('registers.findAll not implemented');
  }

  async create(_dto: CreateRegisterDto) {
    // TODO(PRD §13.9 / §7.3): create a register.
    throw new NotImplementedException('registers.create not implemented');
  }
}
