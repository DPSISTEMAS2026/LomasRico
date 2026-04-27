import { Controller, Get, Patch, Param, Body, UseGuards, Res } from '@nestjs/common';
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

    @Get(':id/print')
    async printTicket(@Param('id') id: string, @Res() res: any) {
        const html = await this.kitchenService.generatePrintHtml(id);
        res.type('text/html').send(html);
    }
}
