import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto } from './dto/open-session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(_userId: string, _registerId?: string) {
    // TODO(PRD §13.9 / §7.3): current open session + last-session info.
    throw new NotImplementedException('sessions.getCurrent not implemented');
  }

  async open(_dto: OpenSessionDto, _userId: string) {
    // TODO(PRD §13.9 / §7.3): open a session on a register.
    throw new NotImplementedException('sessions.open not implemented');
  }

  async close(_id: string) {
    // TODO(PRD §13.9 / §7.3): close + return summary.
    throw new NotImplementedException('sessions.close not implemented');
  }
}
