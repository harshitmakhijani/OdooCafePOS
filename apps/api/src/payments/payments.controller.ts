import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { CashPaymentDto } from './dto/cash-payment.dto';
import { RazorpayVerifyDto } from './dto/razorpay-verify.dto';
import { EmailReceiptDto } from './dto/email-receipt.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/pay/cash')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Pay an order with cash' })
  payCash(@Param('id') id: string, @Body() dto: CashPaymentDto) {
    return this.paymentsService.payCash(id, dto);
  }

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
    @Body() _body: unknown,
    @Headers('x-razorpay-signature') _signature: string,
  ) {
    return this.paymentsService.webhook(_body, _signature);
  }

  @Get('orders/:id/receipt.pdf')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Download a PDF receipt for an order' })
  receiptPdf(@Param('id') id: string) {
    return this.paymentsService.receiptPdf(id);
  }

  @Post('orders/:id/receipt/email')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Email a PDF receipt for an order' })
  emailReceipt(@Param('id') id: string, @Body() dto: EmailReceiptDto) {
    return this.paymentsService.emailReceipt(id, dto);
  }
}
