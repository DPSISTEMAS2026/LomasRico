import 'dotenv/config';
// Hot reload trigger — Brevo API key loaded
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // #region agent log
  fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'render-start',hypothesisId:'H-ENV',location:'main.ts:bootstrap',message:'env check before required',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,hasJwt:!!process.env.JWT_SECRET,nodeEnv:process.env.NODE_ENV||null,port:process.env.PORT||null,hasBrevoKey:!!process.env.BREVO_API_KEY,cwd:process.cwd()},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  // ── Validate critical environment variables ──
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    // #region agent log
    fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'render-start',hypothesisId:'H-ENV',location:'main.ts:missing-env',message:'required env missing — exit 1',data:{missing},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'render-start',hypothesisId:'H-MAIL',location:'main.ts:after-create',message:'NestFactory.create ok',data:{mailModule:true},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
      // En producción también permitir Render/Vercel/Netlify domains genéricos
      if (origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) {
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
  // #region agent log
  fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'render-start',hypothesisId:'H-LISTEN',location:'main.ts:listen',message:'api listening',data:{port:String(port)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}
bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack?.slice(0, 800) : null;
  // #region agent log
  fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'render-start',hypothesisId:'H-BOOT',location:'main.ts:bootstrap-catch',message:'bootstrap crashed',data:{message,stack},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  console.error('BOOTSTRAP_CRASH', message, stack);
  process.exit(1);
});
