import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportExportDto } from './dto/report-export.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(_query: ReportFilterDto) {
    // TODO(PRD §13.15 / §11): compute summary metrics
    throw new NotImplementedException('reports.summary not implemented');
  }

  async salesTrend(_query: ReportFilterDto) {
    // TODO(PRD §13.15 / §11): compute sales trend time series
    throw new NotImplementedException('reports.salesTrend not implemented');
  }

  async topCategories(_query: ReportFilterDto) {
    // TODO(PRD §13.15 / §11): compute top categories
    throw new NotImplementedException('reports.topCategories not implemented');
  }

  async topProducts(_query: ReportFilterDto) {
    // TODO(PRD §13.15 / §11): compute top products
    throw new NotImplementedException('reports.topProducts not implemented');
  }

  async topOrders(_query: ReportFilterDto) {
    // TODO(PRD §13.15 / §11): compute top orders
    throw new NotImplementedException('reports.topOrders not implemented');
  }

  async exportReport(_query: ReportExportDto) {
    // TODO(PRD §13.15 / §11 / §15.3): export report as pdf|xls
    throw new NotImplementedException('reports.exportReport not implemented');
  }
}
