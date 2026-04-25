import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { CashiersService } from './cashiers.service';

@Controller('cashiers')
export class CashiersController {
    constructor(private readonly cashiersService: CashiersService) { }

    @Get()
    findAll() {
        return this.cashiersService.findAll();
    }

    @Post()
    create(@Body() data: { name: string; email: string; pin: string; role?: string; modules?: string[] }) {
        return this.cashiersService.createCashier(data);
    }

    @Post('verify')
    verifyPin(@Body() data: { pin: string }) {
        return this.cashiersService.verifyPin(data.pin);
    }

    @Patch(':id/modules')
    updateModules(@Param('id') id: string, @Body() data: { modules: string[] }) {
        return this.cashiersService.updateModules(id, data.modules);
    }

    @Patch(':id/role')
    updateRole(@Param('id') id: string, @Body() data: { role: string }) {
        return this.cashiersService.updateRole(id, data.role);
    }

    @Patch(':id/permissions')
    updatePermissions(@Param('id') id: string, @Body() data: { canDiscount?: boolean }) {
        return this.cashiersService.updatePermissions(id, data);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.cashiersService.delete(id);
    }
}
