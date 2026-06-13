import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;
}
