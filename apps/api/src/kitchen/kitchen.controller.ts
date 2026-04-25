import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { UpdateTicketStatusDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('kitchen')
@UseGuards(JwtAuthGuard)
export class KitchenController {
    constructor(private readonly kitchenService: KitchenService) { }

    @Get('active')
    findAll() {
        return this.kitchenService.findAllActive();
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() updateDto: UpdateTicketStatusDto,
    ) {
        return this.kitchenService.updateStatus(id, updateDto.status);
    }
}
