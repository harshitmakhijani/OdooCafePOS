import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import puppeteer, { Browser } from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { RazorpayVerifyDto } from './dto/razorpay-verify.dto';
import { EmailReceiptDto } from './dto/email-receipt.dto';
import { PaymentStatus, PaymentType, OrderStatus } from '@cafe-pos/types';

/**
 * Constant-time comparison of two hex signatures. Returns false on length
 * mismatch instead of throwing (PRD §16.1 — webhook/signature verification).
 */
function safeSignatureEqual(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'utf-8');
  const actual = Buffer.from(actualHex, 'utf-8');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private browser!: Browser;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (err) {
      // If launch fails (e.g. during test environments without chromium), we'll log and lazy-load later
      console.warn('Failed to launch Puppeteer browser during init, will retry when PDF is requested:', err);
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async razorpayCreate(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new ConflictException('Order is not in DRAFT status');
    }

    const amountInPaise = Math.round(Number(order.total) * 100);
    const keyId = this.config.get<string>('razorpay.keyId');
    const keySecret = this.config.get<string>('razorpay.keySecret');

    let razorpayOrderId = `order_mock_${Math.random().toString(36).substring(2, 10)}`;

    if (keyId && keySecret) {
      try {
        const authHeader =
          'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: id,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Razorpay API error: ${errText}`);
        }

        const rpOrder = (await response.json()) as { id: string };
        razorpayOrderId = rpOrder.id;
      } catch (err) {
        throw new BadGatewayException(
          `Razorpay order creation failed: ${(err as Error).message}`,
        );
      }
    }

    const payment = await this.prisma.payment.upsert({
      where: { orderId: id },
      update: {
        type: PaymentType.CARD,
        status: PaymentStatus.PENDING,
        amount: order.total,
        razorpayOrderId,
      },
      create: {
        orderId: id,
        type: PaymentType.CARD,
        status: PaymentStatus.PENDING,
        amount: order.total,
        razorpayOrderId,
      },
    });

    return {
      razorpayOrderId: payment.razorpayOrderId,
      keyId: keyId || 'rzp_test_mockkey',
      amount: amountInPaise,
      currency: 'INR',
    };
  }

  async razorpayVerify(id: string, dto: RazorpayVerifyDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Idempotent check
    if (order.status === OrderStatus.PAID) {
      const fullOrder = await this.prisma.order.findUnique({
        where: { id },
        include: { lines: true, payment: true, customer: true },
      });
      return { order: fullOrder, payment: order.payment };
    }

    // The Razorpay order id is established SERVER-SIDE by razorpayCreate and stored
    // on the payment record. Never trust the client to tell us whether a payment is
    // a mock — derive it from the stored value, and require the submitted order id
    // to match it (prevents the "order_mock_" / cross-order bypass — PRD §15.1/§16.1).
    const storedRzpOrderId = order.payment?.razorpayOrderId ?? null;
    if (!storedRzpOrderId) {
      throw new BadRequestException('No Razorpay order has been created for this order');
    }
    if (storedRzpOrderId !== dto.razorpay_order_id) {
      throw new BadRequestException('Razorpay order id does not match this order');
    }

    const keySecret = this.config.get<string>('razorpay.keySecret');
    // A mock order only exists when Razorpay is NOT configured (see razorpayCreate).
    const isMockOrder = storedRzpOrderId.startsWith('order_mock_');

    if (!isMockOrder) {
      // Real payment → signature verification is MANDATORY (no skip path).
      if (!keySecret) {
        throw new ServiceUnavailableException(
          'Razorpay is not configured (missing key secret); cannot verify payment',
        );
      }
      const text = `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`;
      const expectedSignature = crypto.createHmac('sha256', keySecret).update(text).digest('hex');
      if (!safeSignatureEqual(expectedSignature, dto.razorpay_signature)) {
        throw new BadRequestException('Invalid Razorpay signature');
      }
    }

    // Record the actual instrument (UPI vs CARD) reported by Checkout (PRD §9.6).
    const paymentType = dto.method === 'upi' ? PaymentType.UPI : PaymentType.CARD;

    const payment = await this.prisma.payment.update({
      where: { orderId: id },
      data: {
        type: paymentType,
        status: PaymentStatus.SUCCESS,
        reference: dto.razorpay_payment_id,
        razorpaySignature: dto.razorpay_signature,
      },
    });

    const updatedOrder = await this.ordersService.markPaid(id);

    return {
      order: updatedOrder,
      payment,
    };
  }

  async webhook(rawBody: Buffer | string | undefined, signature: string) {
    const webhookSecret = this.config.get<string>('razorpay.webhookSecret');

    if (!rawBody) {
      throw new BadRequestException('Missing webhook request body');
    }

    // Signature verification is MANDATORY. If the webhook secret is not configured,
    // refuse to mutate any payment state from an unverifiable request (PRD §15.1/§16.1)
    // rather than trusting an unsigned body. Ack so Razorpay does not retry forever.
    if (!webhookSecret) {
      // eslint-disable-next-line no-console
      console.warn('[razorpay webhook] RAZORPAY_WEBHOOK_SECRET not configured; ignoring webhook');
      return { received: true, processed: false };
    }
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyBuffer)
      .digest('hex');
    if (!safeSignatureEqual(expectedSignature, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;
    try {
      payload = JSON.parse(bodyBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Malformed webhook body');
    }

    // Defensive: only act on a well-formed payment.captured event (PRD §16.4).
    const entity = payload?.payload?.payment?.entity;
    if (payload?.event === 'payment.captured' && entity?.order_id) {
      const rpOrderId: string = entity.order_id;
      const rpPaymentId: string | undefined = entity.id;

      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: rpOrderId },
      });

      if (payment) {
        const order = await this.prisma.order.findUnique({
          where: { id: payment.orderId },
        });

        // Idempotent: skip if already PAID (a payment may be confirmed by both
        // the verify call and this webhook — PRD §15.1).
        if (order && order.status !== OrderStatus.PAID) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              reference: rpPaymentId ?? payment.reference,
            },
          });
          await this.ordersService.markPaid(payment.orderId);
        }
      }
    }

    return { received: true };
  }

  async receiptPdf(id: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        lines: true,
        customer: true,
        table: {
          include: { floor: true },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = this.generateReceiptHtml(order as any);

    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        width: '400px',
        printBackground: true,
        margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  async emailReceipt(id: string, dto: EmailReceiptDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.receiptPdf(id);
    } catch (err) {
      throw new BadGatewayException(`Failed to generate receipt PDF: ${(err as Error).message}`);
    }

    const host = this.config.get<string>('mail.host');
    const port = this.config.get<number>('mail.port');
    const user = this.config.get<string>('mail.user');
    const pass = this.config.get<string>('mail.pass');
    const from = this.config.get<string>('mail.from');

    const isMockSmtp = !host || host === 'smtp.example.com' || pass === 'change-me';

    if (isMockSmtp) {
      // eslint-disable-next-line no-console
      console.log(`[SMTP MOCK] SMTP configuration is placeholder/missing. Simulating email success:`);
      // eslint-disable-next-line no-console
      console.log(`To: ${dto.email}`);
      // eslint-disable-next-line no-console
      console.log(`From: ${from}`);
      // eslint-disable-next-line no-console
      console.log(`Subject: Receipt for Order #${order.orderNumber}`);
      // eslint-disable-next-line no-console
      console.log(`Attachment: receipt-${order.orderNumber}.pdf (${pdfBuffer.length} bytes)`);

      // Try sending a real test email via ethereal.email so the developer gets a real preview URL
      try {
        const testAccount = await nodemailer.createTestAccount();
        const etherealTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        const info = await etherealTransporter.sendMail({
          from: from || '"Cafe POS" <noreply@example.com>',
          to: dto.email,
          subject: `Receipt for Order #${order.orderNumber}`,
          text: `Please find attached your receipt for Order #${order.orderNumber}.`,
          attachments: [
            {
              filename: `receipt-${order.orderNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
        const previewUrl = nodemailer.getTestMessageUrl(info);
        // eslint-disable-next-line no-console
        console.log(`[SMTP MOCK] Ethereal test email sent successfully!`);
        // eslint-disable-next-line no-console
        console.log(`[SMTP MOCK] View Ethereal Inbox Preview URL: ${previewUrl}`);
      } catch (etherealErr) {
        // eslint-disable-next-line no-console
        console.warn(`[SMTP MOCK] Ethereal email fallback failed: ${(etherealErr as Error).message}`);
      }

      const updatedPayment = await this.prisma.payment.upsert({
        where: { orderId: id },
        update: {
          emailedTo: dto.email,
          emailedAt: new Date(),
        },
        create: {
          orderId: id,
          type: order.payment?.type ?? 'CASH',
          status: order.payment?.status ?? 'SUCCESS',
          amount: order.total,
          emailedTo: dto.email,
          emailedAt: new Date(),
        },
      });
      return updatedPayment;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: dto.email,
        subject: `Receipt for Order #${order.orderNumber}`,
        text: `Please find attached your receipt for Order #${order.orderNumber}.`,
        attachments: [
          {
            filename: `receipt-${order.orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[SMTP WARN] SMTP send failed with error: ${(err as Error).message}. Falling back to mock success in development.`);
      } else {
        throw new BadGatewayException(`SMTP email delivery failed: ${(err as Error).message}`);
      }
    }

    const updatedPayment = await this.prisma.payment.upsert({
      where: { orderId: id },
      update: {
        emailedTo: dto.email,
        emailedAt: new Date(),
      },
      create: {
        orderId: id,
        type: order.payment?.type ?? 'CASH',
        status: order.payment?.status ?? 'SUCCESS',
        amount: order.total,
        emailedTo: dto.email,
        emailedAt: new Date(),
      },
    });

    return updatedPayment;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generateReceiptHtml(order: any): string {
    const dateStr = new Date(order.createdAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    });
    const payment = order.payment;
    const paymentMethodStr = payment ? payment.type : 'N/A';

    const linesHtml = order.lines
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (line: any) => `
      <tr>
        <td style="padding: 6px 0;">${line.productName} x ${Number(line.quantity)}</td>
        <td style="text-align: right; padding: 6px 0;">₹${Number(line.unitPrice).toFixed(2)}</td>
        <td style="text-align: right; padding: 6px 0;">₹${Number(line.lineTotal).toFixed(2)}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 20px; line-height: 1.4; }
          .receipt-box { max-width: 400px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 24px; color: #111; }
          .header p { margin: 5px 0 0 0; font-size: 14px; color: #666; }
          .details { margin-bottom: 20px; font-size: 14px; border-bottom: 1px dashed #ddd; padding-bottom: 10px; }
          .details p { margin: 4px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          .items-table th { border-bottom: 1px solid #eee; padding: 8px 0; text-align: left; }
          .totals { font-size: 14px; border-top: 1px dashed #ddd; padding-top: 10px; }
          .totals table { width: 100%; }
          .totals td { padding: 4px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <h2>Odoo Cafe & POS</h2>
            <p>Tasty Coffee & Delicious Food</p>
          </div>
          <div class="details">
            <p><strong>Order #:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Table:</strong> ${
              order.table
                ? `Table ${order.table.tableNumber} (Floor: ${order.table.floor.name})`
                : 'Takeaway'
            }</p>
            <p><strong>Payment Method:</strong> ${paymentMethodStr}</p>
            ${
              order.customer
                ? `<p><strong>Customer:</strong> ${order.customer.name} (${
                    order.customer.email || 'N/A'
                  })</p>`
                : ''
            }
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
          </table>
          <div class="totals">
            <table>
              <tr>
                <td>Subtotal</td>
                <td style="text-align: right;">₹${Number(order.subtotal).toFixed(2)}</td>
              </tr>
              ${
                Number(order.discountTotal) > 0
                  ? `
              <tr>
                <td>Discount</td>
                <td style="text-align: right; color: #d32f2f;">-₹${Number(
                  order.discountTotal,
                ).toFixed(2)}</td>
              </tr>
              `
                  : ''
              }
              <tr>
                <td>Tax Total</td>
                <td style="text-align: right;">₹${Number(order.taxTotal).toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px;">
                <td style="padding-top: 8px;">Total Paid</td>
                <td style="text-align: right; padding-top: 8px;">₹${Number(
                  order.total,
                ).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            <p>Thank you for visiting us!</p>
            <p>For support, contact support@odoocafe.local</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

