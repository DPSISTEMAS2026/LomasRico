import { Controller, Get, Post, Body, Param, Query, Req, ForbiddenException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CASH_ROLES, MANAGER_ROLES } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

const isManager = (user: any) => MANAGER_ROLES.includes(user?.role);

@Controller('shifts')
@Roles(...CASH_ROLES)
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService) { }

    @Roles(...MANAGER_ROLES)
    @Get()
    findAll(@Query('cashierId') cashierId?: string, @Query('status') status?: string) {
        return this.shiftsService.findAll({ cashierId, status });
    }

    /** Mesas con comensales o cuenta sin cobrar — bloquea cierre de turno. */
    @Get('floor/open-tables')
    listOpenFloorTables() {
        return this.shiftsService.listOpenFloorTables();
    }

    @Get('active/:cashierId')
    async getActiveShift(@Param('cashierId') cashierId: string, @Req() req: any) {
        if (!isManager(req.user) && cashierId !== req.user.userId) {
            throw new ForbiddenException('Solo puedes ver tu propio turno');
        }
        const shift = await this.shiftsService.getActiveShift(cashierId);
        // Siempre retornar JSON válido — null causaba "Unexpected end of JSON input" en el cliente
        return shift ?? { active: false };
    }

    @Get(':id/summary')
    getShiftSummary(@Param('id') id: string) {
        return this.shiftsService.getShiftSummary(id);
    }

    @Post('open')
    openShift(@Body() data: { cashierId: string; startAmount: number }, @Req() req: any) {
        const cashierId = isManager(req.user) && data.cashierId ? data.cashierId : req.user.userId;
        return this.shiftsService.openShift({ ...data, cashierId });
    }

    @Post(':id/close')
    async closeShift(@Param('id') id: string, @Body() data: { endAmount: number; note?: string }, @Req() req: any) {
        await this.shiftsService.assertOpenShiftOf(id, req.user);
        return this.shiftsService.closeShift(id, data, req.user.userId);
    }

    @Roles(...MANAGER_ROLES)
    @Post(':id/sale')
    registerSale(@Param('id') id: string, @Body() data: { amount: number; saleId: string }) {
        return this.shiftsService.registerSale(id, data.amount, data.saleId);
    }

    @Post(':id/expense')
    async registerExpense(@Param('id') id: string, @Body() data: { amount: number; description: string; type: 'EXPENSE' | 'WITHDRAWAL' }, @Req() req: any) {
        await this.shiftsService.assertOpenShiftOf(id, req.user);
        return this.shiftsService.registerExpense(id, data, req.user.userId);
    }
}
