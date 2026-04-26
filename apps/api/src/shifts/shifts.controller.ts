import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService) { }

    @Get()
    findAll(@Query('cashierId') cashierId?: string, @Query('status') status?: string) {
        return this.shiftsService.findAll({ cashierId, status });
    }

    @Get(':id/summary')
    getShiftSummary(@Param('id') id: string) {
        return this.shiftsService.getShiftSummary(id);
    }

    @Get('active/:cashierId')
    async getActiveShift(@Param('cashierId') cashierId: string) {
        const shift = await this.shiftsService.getActiveShift(cashierId);
        // Siempre retornar JSON válido — null causaba "Unexpected end of JSON input" en el cliente
        return shift ?? { active: false };
    }

    @Post('open')
    openShift(@Body() data: { cashierId: string; startAmount: number }) {
        return this.shiftsService.openShift(data);
    }

    @Post(':id/close')
    closeShift(@Param('id') id: string, @Body() data: { endAmount: number; note?: string }) {
        return this.shiftsService.closeShift(id, data);
    }

    @Post(':id/sale')
    registerSale(@Param('id') id: string, @Body() data: { amount: number; saleId: string }) {
        return this.shiftsService.registerSale(id, data.amount, data.saleId);
    }

    @Post(':id/expense')
    registerExpense(@Param('id') id: string, @Body() data: { amount: number; description: string; type: 'EXPENSE' | 'WITHDRAWAL' }) {
        return this.shiftsService.registerExpense(id, data);
    }
}
