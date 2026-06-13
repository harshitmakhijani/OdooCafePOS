import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/**
 * Strongly-typed view of the process environment. ConfigModule validates the
 * raw env against this class on boot and fails fast if a required var is
 * missing or malformed (PRD §16.1, §17).
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.development;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT = 3000;

  // ---- Database ----
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // ---- JWT ----
  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL = '7d';

  // ---- CORS ----
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  // ---- Razorpay (integrations — values may be test placeholders) ----
  @IsString()
  @IsOptional()
  RAZORPAY_KEY_ID = '';

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_SECRET = '';

  @IsString()
  @IsOptional()
  RAZORPAY_WEBHOOK_SECRET = '';

  // ---- SMTP / Mail ----
  @IsString()
  @IsOptional()
  SMTP_HOST = '';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  SMTP_PORT = 587;

  @IsString()
  @IsOptional()
  SMTP_USER = '';

  @IsString()
  @IsOptional()
  SMTP_PASS = '';

  @IsString()
  @IsOptional()
  MAIL_FROM = 'Cafe POS <noreply@example.com>';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  // In production, integration secrets must be present — empty secrets would
  // otherwise silently disable Razorpay signature / webhook verification and
  // SMTP auth (PRD §15.1, §16.1). In dev they may stay empty (mock flows).
  if (validated.NODE_ENV === NodeEnv.production) {
    const requiredInProd: (keyof EnvironmentVariables)[] = [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
    ];
    const missing = requiredInProd.filter((k) => !validated[k]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required production secrets: ${missing.join(', ')}. ` +
          `Set them in the environment (PRD §15, §16.1).`,
      );
    }
  }

  return validated;
}
