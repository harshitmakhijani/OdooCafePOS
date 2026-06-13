import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CashPaymentDto } from './dto/cash-payment.dto';
import { RazorpayVerifyDto } from './dto/razorpay-verify.dto';
import { EmailReceiptDto } from './dto/email-receipt.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async payCash(_id: string, _dto: CashPaymentDto) {
    // TODO(PRD §13.11): record cash payment, compute changeDue, mark order PAID
    throw new NotImplementedException('payments.payCash not implemented');
  }

  async razorpayCreate(_id: string) {
    // TODO(PRD §13.11 / §15.1): create Razorpay order
    throw new NotImplementedException('payments.razorpayCreate not implemented');
  }

  async razorpayVerify(_id: string, _dto: RazorpayVerifyDto) {
    // TODO(PRD §13.11 / §15.1): verify signature, mark order PAID
    throw new NotImplementedException('payments.razorpayVerify not implemented');
  }

  async webhook(_body: unknown, _signature: string) {
    // TODO(PRD §13.11 / §15.1): verify X-Razorpay-Signature, idempotent processing
    throw new NotImplementedException('payments.webhook not implemented');
  }

  async receiptPdf(_id: string) {
    // TODO(PRD §13.12 / §15.3): render receipt PDF via Puppeteer
    throw new NotImplementedException('payments.receiptPdf not implemented');
  }

  async emailReceipt(_id: string, _dto: EmailReceiptDto) {
    // TODO(PRD §13.12 / §15.2): email PDF receipt
    throw new NotImplementedException('payments.emailReceipt not implemented');
  }
}
