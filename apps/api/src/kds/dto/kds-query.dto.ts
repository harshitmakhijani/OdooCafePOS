import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KdsStage } from '@cafe-pos/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class KdsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: KdsStage })
  @IsOptional()
  @IsEnum(KdsStage)
  stage?: KdsStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}
