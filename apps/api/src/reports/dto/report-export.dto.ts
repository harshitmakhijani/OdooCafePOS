import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ReportFilterDto } from './report-filter.dto';

export class ReportExportDto extends ReportFilterDto {
  @ApiPropertyOptional({ enum: ['pdf', 'xls'] })
  @IsOptional()
  @IsIn(['pdf', 'xls'])
  format?: 'pdf' | 'xls';
}
