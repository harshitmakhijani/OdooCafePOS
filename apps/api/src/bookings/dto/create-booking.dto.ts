import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { BookingStatus } from '@cafe-pos/types';

export class CreateBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  // A booking is for an existing customer OR a guest (name required) — PRD §8.8.
  @ApiPropertyOptional()
  @ValidateIf((o) => !o.customerId)
  @IsString()
  @IsNotEmpty()
  guestName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty()
  @IsDateString()
  reservedAt!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  partySize!: number;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
