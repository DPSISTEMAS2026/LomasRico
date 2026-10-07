import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { KitchenModule } from '../kitchen/kitchen.module';
import { DatabaseModule } from '../database/database.module';
import { ShippingModule } from '../shipping/shipping.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [KitchenModule, DatabaseModule, ShippingModule, MailModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
