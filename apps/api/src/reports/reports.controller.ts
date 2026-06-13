import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  exportReport(@Query() query: ReportExportDto) {
    return this.reportsService.exportReport(query);
  }
}
