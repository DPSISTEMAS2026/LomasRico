import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TablesService } from './tables.service';

@Controller('public/tables')
export class TablesPublicController {
    constructor(private readonly tablesService: TablesService) {}

    @Get(':number')
    async getTable(@Param('number') number: string) {
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'H2',location:'tables-public.controller.ts:getTable',message:'public table requested',data:{number},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return this.tablesService.getPublicTable(Number(number));
    }

    @Get(':number/bill')
    getBill(@Param('number') number: string) {
        return this.tablesService.publicBill(Number(number));
    }

    @Post(':number/party')
    openParty(@Param('number') number: string, @Body() body: any) {
        return this.tablesService.openParty(Number(number), body.names || []);
    }

    @Post(':number/claim')
    claim(@Param('number') number: string, @Body() body: any) {
        return this.tablesService.claimGuest(Number(number), body.guestId, {
            currentToken: body.currentToken,
            force: !!body.force,
        });
    }

    @Post('guests/:guestId/session')
    session(@Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.publicSession(guestId, body.claimToken);
    }

    @Post(':number/join')
    join(@Param('number') number: string, @Body() body: any) {
        return this.tablesService.joinGuest(Number(number), body.name);
    }

    @Post(':number/request-bill')
    requestBill(@Param('number') number: string, @Body() body: any) {
        return this.tablesService.publicRequestBill(Number(number), body);
    }

    @Post('guests/:guestId/items')
    addItems(@Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.publicAddItems(guestId, body.claimToken, body);
    }

    @Post('guests/:guestId/send-kitchen')
    sendKitchen(@Param('guestId') guestId: string, @Body() body: any) {
        return this.tablesService.publicSendKitchen(guestId, body.claimToken, body);
    }
}
