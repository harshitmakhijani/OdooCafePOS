import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  /** The method Razorpay Checkout reported (e.g. 'card' | 'upi' | 'netbanking'). */
  @ApiPropertyOptional({ enum: ['card', 'upi', 'netbanking', 'wallet'] })
  @IsOptional()
  @IsIn(['card', 'upi', 'netbanking', 'wallet'])
  method?: string;
}
