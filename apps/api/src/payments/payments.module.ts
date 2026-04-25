import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { KitchenModule } from '../kitchen/kitchen.module';
import { DatabaseModule } from '../database/database.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
    imports: [KitchenModule, DatabaseModule, ShippingModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
