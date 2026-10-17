import 'dotenv/config';
// Hot reload trigger — Brevo API key loaded
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // ── Validate critical environment variables ──
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║  ❌ MISSING REQUIRED ENVIRONMENT VARIABLES      ║');
    missing.forEach(key => console.error(`║  → ${key.padEnd(44)}║`));
    console.error('║  Set them in .env or environment config.        ║');
    console.error('╚══════════════════════════════════════════════════╝');
    process.exit(1);
  }

  const warned = ['JWT_SECRET'];
  warned.filter(key => !process.env[key]).forEach(key => {
    console.warn(`⚠️  ${key} not set — using insecure default (OK for local dev)`);
  });

  const app = await NestFactory.create(AppModule);
  // TUU envía el callback como x-www-form-urlencoded
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express') as typeof import('express');
  app.use(express.urlencoded({ extended: true }));

  // CORS: solo dominios propios. Se compara el origen exacto (no prefijos).
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
  );
  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Sin origin: server-to-server, webhooks, curl
      if (!origin) return callback(null, true);
      try {
        const url = new URL(origin);
        const host = url.hostname;
        if (allowedOrigins.has(url.origin)) return callback(null, true);
        if (url.protocol === 'https:' && (host === 'lomasrico.cl' || host.endsWith('.lomasrico.cl'))) {
          return callback(null, true);
        }
        if (!isProduction) {
          const lan = /^192\.168\.\d+\.\d+$/.test(host) || /^10\.\d+\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host);
          if (lan || host === '127.0.0.1' || host === 'localhost') return callback(null, true);
        }
      } catch { /* origen inválido */ }
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT ?? 3333;
  console.log('#################################################');
  console.log('## API VERSION: PRODUCTION READY               ##');
  console.log(`## PORT: ${String(port).padEnd(39, ' ')}##`);
  console.log(`## CORS Origins: ${allowedOrigins.size} configured${' '.repeat(20)}##`);
  console.log('#################################################');

  await app.listen(port, '0.0.0.0');
}
bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack?.slice(0, 800) : null;
  console.error('BOOTSTRAP_CRASH', message, stack);
  process.exit(1);
});
