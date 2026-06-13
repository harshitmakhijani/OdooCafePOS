import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: BookingQueryDto) {
    // TODO(PRD §13.14 / §8.8): list bookings (filter by date/table/status)
    throw new NotImplementedException('bookings.findAll not implemented');
  }

  async create(_dto: CreateBookingDto) {
    // TODO(PRD §13.14 / §8.8): create a booking
    throw new NotImplementedException('bookings.create not implemented');
  }

  async update(_id: string, _dto: UpdateBookingDto) {
    // TODO(PRD §13.14 / §8.8): update booking / change status
    throw new NotImplementedException('bookings.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.14): cancel a booking
    throw new NotImplementedException('bookings.remove not implemented');
  }
}
