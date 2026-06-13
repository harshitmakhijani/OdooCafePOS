import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'A valid refresh token' })
  @IsJWT()
  @IsNotEmpty()
  refreshToken!: string;
}
