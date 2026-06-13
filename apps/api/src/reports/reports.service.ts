import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportExportDto } from './dto/report-export.dto';
import { ExportService } from './export.service';

// ── helper: build Prisma `where` clause from shared filter set ───────
function buildOrderWhere(query: ReportFilterDto): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { status: 'PAID' };

  // — Date range (period shortcuts or custom from/to) —
  const now = new Date();
  let from: Date | undefined;
  let to: Date | undefined;

  if (query.period) {
    switch (query.period) {
      case 'today': {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(from.getTime() + 86_400_000);
        break;
      }
      case 'week': {
        const day = now.getDay(); // 0=Sun
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        to = new Date(from.getTime() + 7 * 86_400_000);
        break;
      }
      case 'month': {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      }
      // custom — fall through to from/to below
    }
  }

  // Explicit from/to override period shortcuts when provided
  if (query.from) from = new Date(query.from);
  if (query.to) to = new Date(query.to);

  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
    if (to) (where.createdAt as Prisma.DateTimeFilter).lt = to;
  }

  // — Employee filter (via session.employeeId) —
  if (query.employeeId) {
    where.session = { employeeId: query.employeeId };
  }

  // — Session filter —
  if (query.sessionId) {
    where.sessionId = query.sessionId;
  }

  // — Product filter (at least one line must match) —
  if (query.productId) {
    where.lines = { some: { productId: query.productId } };
  }

  return where;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
  ) {}

  // ── GET /reports/summary ───────────────────────────────────────────
  // Returns: totalOrders, revenue (Σ total), averageOrderValue
  async summary(query: ReportFilterDto) {
    const where = buildOrderWhere(query);

    const agg = await this.prisma.order.aggregate({
      where,
      _count: { id: true },
      _sum: { total: true },
      _avg: { total: true },
    });

    return {
      data: {
        totalOrders: agg._count.id,
        revenue: agg._sum.total?.toFixed(2) ?? '0.00',
        averageOrderValue: agg._avg.total?.toFixed(2) ?? '0.00',
      },
    };
  }

  // ── GET /reports/sales-trend ───────────────────────────────────────
  // Buckets: by day (default) or by hour when period=today / single-day range.
  async salesTrend(query: ReportFilterDto) {
    const where = buildOrderWhere(query);

    // Determine bucket granularity
    const isSingleDay =
      query.period === 'today' ||
      (query.from &&
        query.to &&
        new Date(query.to).getTime() - new Date(query.from).getTime() <=
          86_400_000);

    const truncFn = isSingleDay ? 'hour' : 'day';

    // Use raw SQL for date_trunc grouping
    // Build the SQL where clause pieces for injection
    const conditions: string[] = [`"status" = 'PAID'`];
    const params: unknown[] = [];
    let idx = 1;

    if (where.createdAt) {
      const ct = where.createdAt as Prisma.DateTimeFilter;
      if (ct.gte) {
        conditions.push(`"createdAt" >= $${idx++}`);
        params.push(ct.gte);
      }
      if (ct.lt) {
        conditions.push(`"createdAt" < $${idx++}`);
        params.push(ct.lt);
      }
    }
    if (query.employeeId) {
      conditions.push(
        `"sessionId" IN (SELECT id FROM "Session" WHERE "employeeId" = $${idx++})`,
      );
      params.push(query.employeeId);
    }
    if (query.sessionId) {
      conditions.push(`"sessionId" = $${idx++}`);
      params.push(query.sessionId);
    }
    if (query.productId) {
      conditions.push(
        `id IN (SELECT "orderId" FROM "OrderLine" WHERE "productId" = $${idx++})`,
      );
      params.push(query.productId);
    }

    const whereClause = conditions.join(' AND ');

    const rows: Array<{ bucket: Date; orders: bigint; revenue: string }> =
      await this.prisma.$queryRawUnsafe(
        `SELECT date_trunc('${truncFn}', "createdAt") AS bucket,
                COUNT(*)::bigint AS orders,
                COALESCE(SUM("total"), 0)::text AS revenue
         FROM "Order"
         WHERE ${whereClause}
         GROUP BY bucket
         ORDER BY bucket`,
        ...params,
      );

    return {
      data: rows.map((r) => ({
        bucket: r.bucket,
        orders: Number(r.orders),
        revenue: parseFloat(r.revenue).toFixed(2),
      })),
    };
  }

  // ── GET /reports/top-categories ────────────────────────────────────
  // Revenue distribution by category (via order lines → product → category)
  async topCategories(query: ReportFilterDto) {
    const where = buildOrderWhere(query);

    // Fetch all PAID order IDs matching the filter
    const orders = await this.prisma.order.findMany({
      where,
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length === 0) {
      return { data: [] };
    }

    // Group order lines by category
    const lines = await this.prisma.orderLine.findMany({
      where: { orderId: { in: orderIds } },
      select: {
        lineTotal: true,
        quantity: true,
        product: {
          select: {
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    const map = new Map<
      string,
      { name: string; color: string; revenue: number; quantity: number }
    >();

    for (const line of lines) {
      const cat = line.product.category;
      const entry = map.get(cat.id) ?? {
        name: cat.name,
        color: cat.color,
        revenue: 0,
        quantity: 0,
      };
      entry.revenue += Number(line.lineTotal);
      entry.quantity += Number(line.quantity);
      map.set(cat.id, entry);
    }

    const data = Array.from(map.entries())
      .map(([id, e]) => ({
        categoryId: id,
        name: e.name,
        color: e.color,
        revenue: e.revenue.toFixed(2),
        quantity: e.quantity,
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));

    return { data };
  }

  // ── GET /reports/top-products ──────────────────────────────────────
  // Product name, quantity sold, revenue
  async topProducts(query: ReportFilterDto) {
    const where = buildOrderWhere(query);

    const orders = await this.prisma.order.findMany({
      where,
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length === 0) {
      return { data: [] };
    }

    const lines = await this.prisma.orderLine.findMany({
      where: { orderId: { in: orderIds } },
      select: {
        productId: true,
        productName: true,
        lineTotal: true,
        quantity: true,
      },
    });

    const map = new Map<
      string,
      { name: string; revenue: number; quantity: number }
    >();

    for (const line of lines) {
      const entry = map.get(line.productId) ?? {
        name: line.productName,
        revenue: 0,
        quantity: 0,
      };
      entry.revenue += Number(line.lineTotal);
      entry.quantity += Number(line.quantity);
      map.set(line.productId, entry);
    }

    const data = Array.from(map.entries())
      .map(([id, e]) => ({
        productId: id,
        name: e.name,
        revenue: e.revenue.toFixed(2),
        quantitySold: e.quantity,
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));

    return { data };
  }

  // ── GET /reports/top-orders ────────────────────────────────────────
  // Highest-value orders
  async topOrders(query: ReportFilterDto) {
    const where = buildOrderWhere(query);

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { total: 'desc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        createdAt: true,
        session: {
          select: {
            employee: { select: { id: true, name: true } },
          },
        },
        table: { select: { id: true, tableNumber: true } },
        _count: { select: { lines: true } },
      },
    });

    return {
      data: orders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        total: o.total.toFixed(2),
        createdAt: o.createdAt,
        employee: o.session.employee,
        table: o.table
          ? { id: o.table.id, tableNumber: o.table.tableNumber }
          : null,
        lineCount: o._count.lines,
      })),
    };
  }

  // ── GET /reports/export?format=pdf|xls ─────────────────────────────
  // Generates the full report view as PDF or Excel workbook.
  async exportReport(query: ReportExportDto): Promise<Buffer> {
    // Gather all report data using the same filters
    const [summaryResult, trendResult, categoriesResult, productsResult, topOrdersResult] =
      await Promise.all([
        this.summary(query),
        this.salesTrend(query),
        this.topCategories(query),
        this.topProducts(query),
        this.topOrders(query),
      ]);

    const reportData = {
      summary: summaryResult.data,
      salesTrend: trendResult.data,
      topCategories: categoriesResult.data,
      topProducts: productsResult.data,
      topOrders: topOrdersResult.data,
      filters: { ...query },
    };

    const format = query.format ?? 'pdf';

    if (format === 'xls') {
      return this.exportService.toExcel(reportData);
    }

    return this.exportService.toPdf(reportData);
  }
}
