import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BrevoService, DEFAULT_ANNOUNCE_SUBJECT, defaultAnnounceHtml } from './brevo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class MailController {
    constructor(private readonly brevo: BrevoService) {}

    @Get('status')
    status() {
        return this.brevo.getStatus();
    }

    @Get('draft')
    draft() {
        return {
            subject: DEFAULT_ANNOUNCE_SUBJECT,
            html: defaultAnnounceHtml(),
        };
    }

    @Post('sync')
    sync() {
        return this.brevo.syncContacts();
    }

    @Post('test')
    test(@Body() body: { to?: string; subject?: string; html?: string }) {
        return this.brevo.sendTest(body?.to || '', body?.subject, body?.html);
    }

    @Post('announce')
    announce(@Body() body: { confirm?: string; subject?: string; html?: string }) {
        return this.brevo.sendAnnounce({
            confirm: body?.confirm || '',
            subject: body?.subject,
            html: body?.html,
        });
    }
}
