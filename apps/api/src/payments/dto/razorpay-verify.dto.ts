import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RazorpayVerifyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpay_order_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpay_signature!: string;
}
