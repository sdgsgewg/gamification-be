import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(cookieParser()); // ini wajib

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Increase payload size limit for file uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // ubah query string ke tipe sesuai DTO
      whitelist: true,
    }),
  );

  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    credentials: true,
  });

  await app.listen(3001);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log('JWT Secret:', configService.get('JWT_SECRET')); // Verify secret loads
}
bootstrap();
