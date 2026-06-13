import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}
