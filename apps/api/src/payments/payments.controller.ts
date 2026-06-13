import { Body, Controller, Get, Headers, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { RazorpayVerifyDto } from './dto/razorpay-verify.dto';
import { EmailReceiptDto } from './dto/email-receipt.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // NOTE: `POST /orders/:id/pay/cash` is handled by OrdersController (single source
  // of truth, Decimal-based). It was previously duplicated here — removed to avoid
  // two divergent handlers on the same route.

  @Post('orders/:id/pay/razorpay/create')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Create a Razorpay order for payment' })
  razorpayCreate(@Param('id') id: string) {
    return this.paymentsService.razorpayCreate(id);
  }

  @Post('orders/:id/pay/razorpay/verify')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Verify a Razorpay payment signature' })
  razorpayVerify(@Param('id') id: string, @Body() dto: RazorpayVerifyDto) {
    return this.paymentsService.razorpayVerify(id, dto);
  }

  @Post('payments/webhook')
  @Public()
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.webhook(req.rawBody, signature);
  }

  @Get('orders/:id/receipt.pdf')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Download a PDF receipt for an order' })
  async receiptPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.paymentsService.receiptPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
    });
    res.end(pdfBuffer);
  }

  @Post('orders/:id/receipt/email')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Email a PDF receipt for an order' })
  emailReceipt(@Param('id') id: string, @Body() dto: EmailReceiptDto) {
    return this.paymentsService.emailReceipt(id, dto);
  }
}
