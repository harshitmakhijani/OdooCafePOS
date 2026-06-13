import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.2 / §8.7): list users.
    throw new NotImplementedException('users.findAll not implemented');
  }

  async create(_dto: CreateUserDto) {
    // TODO(PRD §13.2 / §8.7): create a user.
    throw new NotImplementedException('users.create not implemented');
  }

  async update(_id: string, _dto: UpdateUserDto) {
    // TODO(PRD §13.2 / §8.7): update a user.
    throw new NotImplementedException('users.update not implemented');
  }

  async changePassword(_id: string, _dto: ChangePasswordDto) {
    // TODO(PRD §13.2 / §8.7): change a user's password.
    throw new NotImplementedException('users.changePassword not implemented');
  }

  async archive(_id: string) {
    // TODO(PRD §13.2 / §8.7): archive a user.
    throw new NotImplementedException('users.archive not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.2 / §8.7): remove a user.
    throw new NotImplementedException('users.remove not implemented');
  }
}
