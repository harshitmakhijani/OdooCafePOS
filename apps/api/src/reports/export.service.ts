import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import puppeteer, { Browser } from 'puppeteer';

/**
 * Shape of the full report dataset passed to both PDF and Excel exporters.
 */
export interface ReportDataset {
  summary: {
    totalOrders: number;
    revenue: string;
    averageOrderValue: string;
  };
  salesTrend: Array<{
    bucket: Date | string;
    orders: number;
    revenue: string;
  }>;
  topCategories: Array<{
    categoryId: string;
    name: string;
    color: string;
    revenue: string;
    quantity: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    revenue: string;
    quantitySold: number;
  }>;
  topOrders: Array<{
    orderId: string;
    orderNumber: number;
    total: string;
    createdAt: Date | string;
    employee: { id: string; name: string } | null;
    table: { id: string; tableNumber: number } | null;
    lineCount: number;
  }>;
  filters: Record<string, unknown>;
}

@Injectable()
export class ExportService implements OnModuleInit, OnModuleDestroy {
  private browser!: Browser;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  // ── Excel (XLS) export via ExcelJS ─────────────────────────────────
  async toExcel(data: ReportDataset): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Cafe POS';
    workbook.created = new Date();

    // ─ Summary sheet ─
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    summarySheet.addRow({
      metric: 'Total Orders',
      value: data.summary.totalOrders,
    });
    summarySheet.addRow({ metric: 'Revenue', value: data.summary.revenue });
    summarySheet.addRow({
      metric: 'Average Order Value',
      value: data.summary.averageOrderValue,
    });
    this.styleHeader(summarySheet);

    // ─ Sales Trend sheet ─
    const trendSheet = workbook.addWorksheet('Sales Trend');
    trendSheet.columns = [
      { header: 'Period', key: 'bucket', width: 25 },
      { header: 'Orders', key: 'orders', width: 15 },
      { header: 'Revenue (₹)', key: 'revenue', width: 20 },
    ];
    for (const row of data.salesTrend) {
      trendSheet.addRow({
        bucket:
          row.bucket instanceof Date
            ? row.bucket.toISOString()
            : String(row.bucket),
        orders: row.orders,
        revenue: row.revenue,
      });
    }
    this.styleHeader(trendSheet);

    // ─ Top Categories sheet ─
    const catSheet = workbook.addWorksheet('Top Categories');
    catSheet.columns = [
      { header: 'Category', key: 'name', width: 25 },
      { header: 'Revenue (₹)', key: 'revenue', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 15 },
    ];
    for (const row of data.topCategories) {
      catSheet.addRow({
        name: row.name,
        revenue: row.revenue,
        quantity: row.quantity,
      });
    }
    this.styleHeader(catSheet);

    // ─ Top Products sheet ─
    const prodSheet = workbook.addWorksheet('Top Products');
    prodSheet.columns = [
      { header: 'Product', key: 'name', width: 30 },
      { header: 'Revenue (₹)', key: 'revenue', width: 20 },
      { header: 'Qty Sold', key: 'quantitySold', width: 15 },
    ];
    for (const row of data.topProducts) {
      prodSheet.addRow({
        name: row.name,
        revenue: row.revenue,
        quantitySold: row.quantitySold,
      });
    }
    this.styleHeader(prodSheet);

    // ─ Top Orders sheet ─
    const ordSheet = workbook.addWorksheet('Top Orders');
    ordSheet.columns = [
      { header: 'Order #', key: 'orderNumber', width: 12 },
      { header: 'Total (₹)', key: 'total', width: 15 },
      { header: 'Date', key: 'createdAt', width: 22 },
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Table', key: 'table', width: 10 },
      { header: 'Items', key: 'lineCount', width: 10 },
    ];
    for (const row of data.topOrders) {
      ordSheet.addRow({
        orderNumber: row.orderNumber,
        total: row.total,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
        employee: row.employee?.name ?? '—',
        table: row.table?.tableNumber ?? '—',
        lineCount: row.lineCount,
      });
    }
    this.styleHeader(ordSheet);

    // Write to Buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── PDF export via Puppeteer ───────────────────────────────────────
  async toPdf(data: ReportDataset): Promise<Buffer> {
    const html = this.buildReportHtml(data);
    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  // ── Private helpers ────────────────────────────────────────────────

  /** Style the first row of a worksheet as a bold header with fill. */
  private styleHeader(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 24;
  }

  /** Build an HTML string for the full report (used by PDF export). */
  private buildReportHtml(data: ReportDataset): string {
    const fmtDate = (d: Date | string) =>
      d instanceof Date ? d.toLocaleDateString('en-IN') : String(d);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 0; margin: 0; color: #1f2937; }
    .page { padding: 24px 32px; }
    h1 { font-size: 22px; color: #2563eb; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #374151; margin-top: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
    .kpi-row { display: flex; gap: 16px; margin-bottom: 12px; }
    .kpi { flex: 1; background: #f0f7ff; border-radius: 8px; padding: 14px 18px; text-align: center; }
    .kpi .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi .value { font-size: 22px; font-weight: 700; color: #2563eb; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th { background: #2563eb; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  </style>
</head>
<body>
<div class="page">
  <h1>Cafe POS — Sales Report</h1>
  <div class="meta">Generated: ${new Date().toLocaleString('en-IN')} | Filters: ${JSON.stringify(data.filters)}</div>

  <div class="kpi-row">
    <div class="kpi"><div class="label">Total Orders</div><div class="value">${data.summary.totalOrders}</div></div>
    <div class="kpi"><div class="label">Revenue</div><div class="value">₹${data.summary.revenue}</div></div>
    <div class="kpi"><div class="label">Avg. Order Value</div><div class="value">₹${data.summary.averageOrderValue}</div></div>
  </div>

  <h2>Sales Trend</h2>
  <table>
    <tr><th>Period</th><th>Orders</th><th>Revenue (₹)</th></tr>
    ${data.salesTrend.map((r) => `<tr><td>${fmtDate(r.bucket)}</td><td>${r.orders}</td><td>${r.revenue}</td></tr>`).join('')}
  </table>

  <h2>Top Categories</h2>
  <table>
    <tr><th>Category</th><th>Revenue (₹)</th><th>Quantity</th></tr>
    ${data.topCategories.map((r) => `<tr><td>${r.name}</td><td>${r.revenue}</td><td>${r.quantity}</td></tr>`).join('')}
  </table>

  <h2>Top Products</h2>
  <table>
    <tr><th>Product</th><th>Revenue (₹)</th><th>Qty Sold</th></tr>
    ${data.topProducts.map((r) => `<tr><td>${r.name}</td><td>${r.revenue}</td><td>${r.quantitySold}</td></tr>`).join('')}
  </table>

  <h2>Top Orders</h2>
  <table>
    <tr><th>Order #</th><th>Total (₹)</th><th>Date</th><th>Employee</th><th>Table</th><th>Items</th></tr>
    ${data.topOrders.map((r) => `<tr><td>${r.orderNumber}</td><td>${r.total}</td><td>${fmtDate(r.createdAt)}</td><td>${r.employee?.name ?? '—'}</td><td>${r.table?.tableNumber ?? '—'}</td><td>${r.lineCount}</td></tr>`).join('')}
  </table>

  <div class="footer">Cafe POS Report — Confidential</div>
</div>
</body>
</html>`;
  }
}
