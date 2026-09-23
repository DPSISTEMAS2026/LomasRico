import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@lomasrico/database';

const PRISMA_CONNECTION_LIMIT = 3;

function withPoolLimit(url: string): string {
    if (/[?&]connection_limit=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${PRISMA_CONNECTION_LIMIT}&pool_timeout=10`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    constructor() {
        const raw = process.env.DATABASE_URL || '';
        super({
            log: ['info', 'warn', 'error'],
            ...(raw ? { datasources: { db: { url: withPoolLimit(raw) } } } : {}),
        });
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'post-fix',hypothesisId:'H-POOL',location:'prisma.service.ts:constructor',message:'prisma pool cap',data:{hadUrl:!!raw,alreadyLimited:/[?&]connection_limit=/.test(raw),appliedLimit:PRISMA_CONNECTION_LIMIT},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }

    async onModuleInit() {
        // Timeout de 5 segundos para la conexión inicial para evitar bloqueos en el deploy de Render
        const connectionTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        );

        try {
            await Promise.race([this.$connect(), connectionTimeout]);
            this.logger.log('Database connected successfully');
        } catch (e) {
            this.logger.warn('Failed to connect to database within timeout. API running in offline/fallback mode.');
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
