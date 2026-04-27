import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { ExternalOrdersService } from './external-orders.service';
import { ProductMapperService } from './product-mapper.service';
import { DailyHealthCheckService } from './daily-health-check.service';
import { CreateExternalOrderDto, BulkExternalOrderDto, ExternalPlatform } from './dto/create-external-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UberEatsScraper } from './scrapers/uber-eats.scraper';
import { PedidosYaScraper } from './scrapers/pedidosya.scraper';
import { UberScraperCronService } from './uber-scraper-cron.service';

@Controller('external-orders')
export class ExternalOrdersController {
    private readonly logger = new Logger(ExternalOrdersController.name);

    constructor(
        private readonly externalOrdersService: ExternalOrdersService,
        private readonly productMapper: ProductMapperService,
        private readonly healthCheck: DailyHealthCheckService,
        private readonly uberCron: UberScraperCronService,
    ) {}

    /**
     * POST /external-orders/ingest
     * Ingest a single external order from a scraper.
     * 
     * This is the PRIMARY endpoint for scrapers.
     * The scraper sends normalized order data, and the system:
     * 1. Checks for duplicates
     * 2. Maps products to internal catalog
     * 3. Creates a Sale + KitchenTicket
     * 4. Records the ExternalOrder for audit
     */
    @Post('ingest')
    @HttpCode(HttpStatus.OK)
    async ingestOrder(@Body() dto: CreateExternalOrderDto) {
        this.logger.log(`📥 Ingest: ${dto.platform}#${dto.externalOrderId} (${dto.items?.length || 0} items)`);
        return this.externalOrdersService.ingestOrder(dto);
    }

    /**
     * POST /external-orders/ingest/bulk
     * Ingest multiple orders at once (batch scraping result).
     */
    @Post('ingest/bulk')
    @HttpCode(HttpStatus.OK)
    async ingestBulk(@Body() dto: BulkExternalOrderDto) {
        this.logger.log(`📥 Bulk ingest: ${dto.orders?.length || 0} orders`);
        return this.externalOrdersService.ingestBulk(dto.orders);
    }

    /**
     * POST /external-orders/scraper/run
     * Execute a scraper on-demand. Requires JWT auth.
     * Body: { platform: "UBER_EATS" | "PEDIDOS_YA" }
     */
    @Post('scraper/run')
    async runScraper(@Body() body: { platform: ExternalPlatform }) {
        const { platform } = body;

        if (!platform || !['UBER_EATS', 'PEDIDOS_YA'].includes(platform)) {
            throw new BadRequestException('platform must be UBER_EATS or PEDIDOS_YA');
        }

        this.logger.log(`🚀 Manual scraper trigger: ${platform}`);

        const scraper = platform === 'UBER_EATS'
            ? new UberEatsScraper()
            : new PedidosYaScraper();

        return scraper.execute();
    }

    /**
     * GET /external-orders
     * List all external orders (admin panel).
     */
    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(
        @Query('platform') platform?: string,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
    ) {
        return this.externalOrdersService.findAll({
            platform,
            status,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    /**
     * GET /external-orders/health-check
     * Obtener el último resultado del health check diario.
     */
    @Get('health-check')
    async getHealthCheck() {
        const result = this.healthCheck.getLastResult();
        if (!result) return { message: 'No se ha ejecutado un health check aún. Se ejecuta diariamente a las 10:00.' };
        return result;
    }

    /**
     * POST /external-orders/health-check/run
     * Forzar un health check manual.
     */
    @Post('health-check/run')
    async runHealthCheck() {
        return this.healthCheck.forceCheck();
    }

    /**
     * GET /external-orders/:id
     * Get details of a specific external order.
     */
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.externalOrdersService.findOne(id);
    }

    /**
     * POST /external-orders/:id/retry
     * Retry a failed external order (after mapping fix).
     */
    @UseGuards(JwtAuthGuard)
    @Post(':id/retry')
    async retryOrder(@Param('id') id: string) {
        return this.externalOrdersService.retryOrder(id);
    }

    /**
     * POST /external-orders/mapper/refresh
     * Refresh the product mapper cache (after catalog changes).
     */
    @UseGuards(JwtAuthGuard)
    @Post('mapper/refresh')
    async refreshMapper() {
        return this.externalOrdersService.refreshMapper();
    }

    /**
     * POST /external-orders/mapper/test
     * Test product mapping for a given name (debugging tool).
     */
    @Post('mapper/test')
    async testMapping(@Body() body: { name: string }) {
        const result = this.productMapper.mapProduct(body.name);
        return {
            input: body.name,
            ...result,
        };
    }

    /**
     * GET /external-orders/cron-status
     * Check the status of the UberScraperCronService.
     */
    @Post('cron-status')
    @HttpCode(HttpStatus.OK)
    getCronStatus() {
        return this.uberCron.getStatus();
    }
}
