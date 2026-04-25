import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('api/whatsapp/conversations')
export class WhatsAppController {
    constructor(private readonly whatsappService: WhatsAppService) { }

    @Get('by-phone')
    async getByPhone(@Query('phone') phone: string) {
        return this.whatsappService.getConversationMode(phone);
    }

    @Get()
    async findAll() {
        return this.whatsappService.findAllConversations();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.whatsappService.findOneConversation(id);
    }

    @Post(':id/take')
    async take(@Param('id') id: string, @Body('userId') userId: string) {
        return this.whatsappService.take(id, userId);
    }

    @Post(':id/release')
    async release(@Param('id') id: string) {
        return this.whatsappService.release(id);
    }

    @Post(':id/resolve')
    async resolve(@Param('id') id: string) {
        return this.whatsappService.resolve(id);
    }

    @Post(':id/note')
    async addNote(@Param('id') id: string, @Body('userId') userId: string, @Body('text') text: string) {
        return this.whatsappService.addNote(id, userId, text);
    }

    @Post(':id/reply')
    async reply(@Param('id') id: string, @Body('userId') userId: string, @Body('text') text: string) {
        return this.whatsappService.reply(id, userId, text);
    }

    // Webhook para recibir mensajes (N8N o Meta lo llamarán aquí)
    @Post('webhook/inbound')
    async inbound(@Body() body: any) {
        // Formato esperado de N8N: { contactId: "569...", body: "hola", ... }
        return this.whatsappService.handleInboundMessage(body);
    }

    @Get('check-mode/:contactId')
    async checkMode(@Param('contactId') contactId: string) {
        return this.whatsappService.getConversationMode(contactId);
    }
}
