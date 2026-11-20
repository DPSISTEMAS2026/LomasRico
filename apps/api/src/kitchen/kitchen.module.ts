import { Module } from '@nestjs/common';
import { ShippingModule } from '../shipping/shipping.module';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';

@Module({
    imports: [ShippingModule],
    controllers: [KitchenController],
    providers: [KitchenService],
    exports: [KitchenService],
})
export class KitchenModule { }
