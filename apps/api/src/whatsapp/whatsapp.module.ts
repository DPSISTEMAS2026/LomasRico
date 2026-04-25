import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../database/prisma.service';

@Module({
    controllers: [WhatsAppController],
    providers: [WhatsAppService, PrismaService],
    exports: [WhatsAppService],
})
export class WhatsAppModule { }
