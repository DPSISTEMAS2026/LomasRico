import { Body, Controller, Get, Header, Param, Patch, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { DRIVER_ROLES } from '../auth/access';
import { DeliveryService, DriverDeliveryStatus } from './delivery.service';

@Controller('delivery')
@Roles(...DRIVER_ROLES)
export class DeliveryController {
    constructor(private readonly delivery: DeliveryService) {}

    /** Cola liviana: sin joins pesados; cache corta en servicio. */
    @Get('queue')
    @Header('Cache-Control', 'private, max-age=8')
    queue(@Query('includeDone') includeDone?: string) {
        return this.delivery.listForDriver({ includeDone: includeDone === '1' || includeDone === 'true' });
    }

    @Patch(':id/status')
    setStatus(
        @Param('id') id: string,
        @Body() body: { status: DriverDeliveryStatus },
        @Req() req: any,
    ) {
        return this.delivery.setStatus(id, body?.status, {
            userId: req.user?.userId,
            name: req.user?.name || req.user?.email,
        });
    }
}
