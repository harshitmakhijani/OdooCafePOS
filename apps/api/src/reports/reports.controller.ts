import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportExportDto } from './dto/report-export.dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Report summary metrics' })
  summary(@Query() query: ReportFilterDto) {
    return this.reportsService.summary(query);
  }

  @Get('sales-trend')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sales trend time series' })
  salesTrend(@Query() query: ReportFilterDto) {
    return this.reportsService.salesTrend(query);
  }

  @Get('top-categories')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Top categories' })
  topCategories(@Query() query: ReportFilterDto) {
    return this.reportsService.topCategories(query);
  }

  @Get('top-products')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Top products' })
  topProducts(@Query() query: ReportFilterDto) {
    return this.reportsService.topProducts(query);
  }

  @Get('top-orders')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Top orders' })
  topOrders(@Query() query: ReportFilterDto) {
    return this.reportsService.topOrders(query);
  }

  @Get('export')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Export report as pdf or xls' })
  async exportReport(
    @Query() query: ReportExportDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const format = query.format ?? 'pdf';
    const buffer = await this.reportsService.exportReport(query);

    if (format === 'xls') {
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="report.xlsx"',
      });
    } else {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
      });
    }

    return new StreamableFile(buffer);
  }
}
