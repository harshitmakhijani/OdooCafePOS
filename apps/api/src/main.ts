import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global REST prefix (PRD §13 — base path `/api`).
  app.setGlobalPrefix('api');

  // CORS restricted to the configured app origin(s) (PRD §16.1).
  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['http://localhost:5173'];
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Validate + strip every request body against its DTO (PRD §16.1).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger API docs at /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cafe POS API')
    .setDescription('REST API for the Cafe / Restaurant POS system (PRD §13).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
