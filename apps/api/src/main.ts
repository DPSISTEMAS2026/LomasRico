import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: Whitelist basada en variable de entorno
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3002'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permitir requests sin origin (server-to-server, mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(allowed => origin.startsWith(allowed.trim()))) {
        return callback(null, true);
      }
      // En producción también permitir Render/Vercel domains genéricos
      if (origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT ?? 3333;
  console.log('#################################################');
  console.log('## API VERSION: PRODUCTION READY               ##');
  console.log(`## PORT: ${String(port).padEnd(39, ' ')}##`);
  console.log(`## CORS Origins: ${allowedOrigins.length} configured${' '.repeat(20)}##`);
  console.log('#################################################');

  await app.listen(port, '0.0.0.0');
}
bootstrap();
