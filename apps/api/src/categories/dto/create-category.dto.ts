import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Hot Drinks' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '#F59E0B', description: 'Hex color used everywhere this category renders' })
  @IsHexColor()
  color!: string;
}
