import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TablesService } from './tables.service';

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
    constructor(private readonly tablesService: TablesService) {}

    @Get()
    list() {
        return this.tablesService.list();
    }

    @Get(':id')
    getTable(@Param('id') id: string) {
        return this.tablesService.getTable(id);
    }

    @Post(':id/guests')
    addGuest(@Param('id') id: string, @Body() body: any) {
        return this.tablesService.addGuest(id, body);
    }

    @Patch(':id/guests/:guestId')
    renameGuest(@Param('id') id: string, @Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.renameGuest(id, guestId, body.name);
    }

    @Post(':id/guests/:guestId/leave')
    leaveGuest(@Param('id') id: string, @Param('guestId') guestId: string) {
        return this.tablesService.leaveGuest(id, guestId);
    }

    @Post(':id/guests/:guestId/items')
    addItems(@Param('id') id: string, @Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.addItemsToGuest(id, guestId, body);
    }

    @Post(':id/guests/:guestId/send-kitchen')
    sendToKitchen(@Param('id') id: string, @Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.sendGuestToKitchen(id, guestId, body);
    }

    @Post(':id/guests/:guestId/pay')
    pay(@Param('id') id: string, @Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.payGuest(id, guestId, body);
    }

    @Get(':id/bill')
    bill(@Param('id') id: string) {
        return this.tablesService.getBill(id);
    }

    @Post(':id/pay-all')
    payAll(@Param('id') id: string, @Body() body: any) {
        return this.tablesService.payAll(id, body);
    }
}
