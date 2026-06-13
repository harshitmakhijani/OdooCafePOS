import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role, UserStatus } from '@cafe-pos/types';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { search, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new Paginated(
      users.map((u) => this.sanitizeUser(u)),
      {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    );
  }

  async create(dto: CreateUserDto) {
    const { password, ...userData } = dto;

    // Check unique email and username
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username },
        ],
      },
    });

    if (existing) {
      if (existing.email === userData.email) {
        throw new ConflictException(`Email ${userData.email} is already in use`);
      }
      throw new ConflictException(`Username ${userData.username} is already in use`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
    });

    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.ensureExists(id);

    // Guard against demoting the last active admin (PRD §13.6).
    if (dto.role !== undefined && dto.role !== Role.ADMIN) {
      await this.assertNotLastActiveAdmin(user);
    }

    // If changing email/username, check uniqueness
    if (dto.email || dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                dto.email ? { email: dto.email } : {},
                dto.username ? { username: dto.username } : {},
              ].filter((o) => Object.keys(o).length > 0),
            },
          ],
        },
      });

      if (existing) {
        if (dto.email && existing.email === dto.email) {
          throw new ConflictException(`Email ${dto.email} is already in use`);
        }
        throw new ConflictException(`Username ${dto.username} is already in use`);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    return this.sanitizeUser(updated);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.ensureExists(id);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { success: true };
  }

  async archive(id: string) {
    const user = await this.ensureExists(id);

    // Cannot archive the last active admin (PRD §13.6).
    await this.assertNotLastActiveAdmin(user);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ARCHIVED },
    });

    return this.sanitizeUser(updated);
  }

  async remove(id: string) {
    const user = await this.ensureExists(id);

    // Cannot delete the last active admin (PRD §13.6).
    await this.assertNotLastActiveAdmin(user);

    // Check if user is referenced by any sessions
    const sessionCount = await this.prisma.session.count({
      where: { employeeId: id },
    });

    if (sessionCount > 0) {
      // Soft delete/archive
      await this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.ARCHIVED },
      });
      return { archived: true };
    }

    await this.prisma.user.delete({
      where: { id },
    });
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /**
   * Throws if removing/deactivating/demoting the given user would leave zero
   * active admins. No-op when the user is not currently an active admin.
   */
  private async assertNotLastActiveAdmin(user: { role: string; status: string }) {
    if (user.role !== Role.ADMIN || user.status !== UserStatus.ACTIVE) {
      return;
    }

    const activeAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, status: UserStatus.ACTIVE },
    });

    if (activeAdmins <= 1) {
      throw new ConflictException('Cannot remove or deactivate the last active admin');
    }
  }

  private sanitizeUser(user: Record<string, unknown>) {
    if (!user) return user;
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}

