import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@lomasrico/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    constructor() {
        super({
            log: ['info', 'warn', 'error'],
        });
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
