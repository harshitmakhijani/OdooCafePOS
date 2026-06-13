import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registerId!: string;
}
