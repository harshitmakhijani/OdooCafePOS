import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailReceiptDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}
