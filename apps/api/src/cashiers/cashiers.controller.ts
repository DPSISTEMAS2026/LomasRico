import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { CashiersService } from './cashiers.service';
import { MANAGER_ROLES } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

@Controller('cashiers')
@Roles(...MANAGER_ROLES)
export class CashiersController {
    constructor(private readonly cashiersService: CashiersService) { }

    @Get()
    findAll() {
        return this.cashiersService.findAll();
    }

    @Post()
    create(@Body() data: { name: string; email: string; pin: string; role?: string; modules?: string[] }, @Req() req: any) {
        return this.cashiersService.createCashier(data, req.user);
    }

    @Patch(':id/modules')
    updateModules(@Param('id') id: string, @Body() data: { modules: string[] }, @Req() req: any) {
        return this.cashiersService.updateModules(id, data.modules, req.user);
    }

    @Patch(':id/role')
    updateRole(@Param('id') id: string, @Body() data: { role: string }, @Req() req: any) {
        return this.cashiersService.updateRole(id, data.role, req.user);
    }

    @Patch(':id/pin')
    updatePin(@Param('id') id: string, @Body() data: { pin: string }, @Req() req: any) {
        return this.cashiersService.updatePin(id, data.pin, req.user);
    }

    @Patch(':id/permissions')
    updatePermissions(@Param('id') id: string, @Body() data: { canDiscount?: boolean }, @Req() req: any) {
        return this.cashiersService.updatePermissions(id, data, req.user);
    }

    @Delete(':id')
    delete(@Param('id') id: string, @Req() req: any) {
        return this.cashiersService.delete(id, req.user);
    }
}
