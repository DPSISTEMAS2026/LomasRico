import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { PrismaService } from '../database/prisma.service';
import { ShippingModule } from '../shipping/shipping.module';
import { SalesModule } from '../sales/sales.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [ShippingModule, SalesModule, WhatsAppModule, PaymentsModule],
    controllers: [BotController],
    providers: [BotService, PrismaService],
})
export class BotModule { }
