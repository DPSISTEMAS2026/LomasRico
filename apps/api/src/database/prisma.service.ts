import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@lomasrico/database';

const PRISMA_CONNECTION_LIMIT = 3;

const WRITE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);
const RAW_ACTIONS = new Set(['executeRaw', 'executeRawUnsafe', 'queryRaw', 'queryRawUnsafe']);
const LIVE_MODELS = new Set(['KitchenTicket', 'Sale', 'SaleItem', 'DiningTable', 'TableGuest']);
const CATALOG_MODELS = new Set(['SellingProduct', 'ProductVariant', 'ProductModifier', 'ModifierGroup', 'ModifierOption']);

function rawSqlText(args: any): string {
    const first = Array.isArray(args) ? args[0] : args?.query ?? args;
    if (typeof first === 'string') return first;
    if (Array.isArray(first)) return first.join('?');
    if (first?.strings) return first.strings.join('?');
    if (typeof first?.sql === 'string') return first.sql;
    return '';
}

function isRawWrite(args: any) {
    return /^\s*(update|insert|delete)\b/i.test(rawSqlText(args));
}

function withPoolLimit(url: string): string {
    if (/[?&]connection_limit=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${PRISMA_CONNECTION_LIMIT}&pool_timeout=10`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly bootId = Date.now().toString(36);
    private liveCounter = 0;
    private catalogCounter = 0;

    constructor() {
        const raw = process.env.DATABASE_URL || '';
        super({
            log: ['info', 'warn', 'error'],
            ...(raw ? { datasources: { db: { url: withPoolLimit(raw) } } } : {}),
        });
        this.$use(async (params, next) => {
            const result = await next(params);
            const noRowsTouched = (params.action === 'updateMany' || params.action === 'deleteMany') && result?.count === 0;
            if (WRITE_ACTIONS.has(params.action) && params.model && !noRowsTouched) {
                if (LIVE_MODELS.has(params.model)) this.liveCounter++;
                if (CATALOG_MODELS.has(params.model)) this.catalogCounter++;
            } else if (RAW_ACTIONS.has(params.action) && isRawWrite(params.args)) {
                this.liveCounter++;
            }
            return result;
        });
        // Dentro de una transacción se cuenta antes del commit; se vuelve a contar al confirmarla.
        const transaction = this.$transaction.bind(this);
        (this as any).$transaction = async (...args: any[]) => {
            const result = await (transaction as any)(...args);
            this.liveCounter++;
            this.catalogCounter++;
            return result;
        };
    }

    /** Cambia cada vez que se escribe una comanda, venta o mesa. */
    get liveVersion() {
        return `${this.bootId}.${this.liveCounter}`;
    }

    /** Cambia cada vez que se escribe un producto o modificador. */
    get catalogVersion() {
        return `${this.bootId}.${this.catalogCounter}`;
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
