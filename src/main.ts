import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000', // URL Next.js (frontend)
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001); // Backend di port 3001
}
bootstrap();
