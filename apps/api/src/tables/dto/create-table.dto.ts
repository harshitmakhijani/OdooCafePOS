import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  floorId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  tableNumber!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  seats!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
