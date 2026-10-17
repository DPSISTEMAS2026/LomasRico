import { Controller, Get, Patch, Param, Body, Query, UseGuards, Res, Req } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { KitchenService } from './kitchen.service';
import { UpdateTicketStatusDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { KITCHEN_ROLES } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

@Controller('kitchen')
@UseGuards(JwtAuthGuard)
@Roles(...KITCHEN_ROLES)
export class KitchenController {
    constructor(
        private readonly kitchenService: KitchenService,
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) { }

    @Get('version')
    async version() {
        // DB-backed: no depende del liveCounter en memoria de cada proceso
        const v = await this.kitchenService.getLiveVersion();
        return { v };
    }

    @Get('active')
    findAll() {
        return this.kitchenService.findAllActive();
    }

    @Get('history')
    findHistory(@Query('q') q?: string) {
        return this.kitchenService.findHistory(q);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() updateDto: UpdateTicketStatusDto,
        @Req() req: any,
    ) {
        if (String(updateDto.status) !== 'CANCELLED') return this.kitchenService.updateStatus(id, updateDto.status);
        const { approver, reason } = await this.audit.authorize(req, updateDto.approvalPin, updateDto.reason);
        return this.kitchenService.updateStatus(id, updateDto.status, { actorId: req.user?.userId, approver, reason });
    }

    @Get(':id/print')
    async printTicket(@Param('id') id: string, @Res() res: any) {
        const html = await this.kitchenService.generatePrintHtml(id, 'kitchen');
        res.type('text/html').send(html);
    }

    @Get(':id/print-account')
    async printAccount(@Param('id') id: string, @Res() res: any) {
        const html = await this.kitchenService.generatePrintHtml(id, 'account');
        res.type('text/html').send(html);
    }
}
