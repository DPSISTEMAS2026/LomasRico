import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { RecipeEngineeringModule } from '../recipe-engineering/recipe-engineering.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';
import { AvailabilityModule } from '../availability/availability.module';
import { TuuModule } from '../payments/tuu.module';
import { StoreSettingsModule } from '../store-settings/store-settings.module';

@Module({
    imports: [RecipeEngineeringModule, InventoryModule, ShippingModule, AvailabilityModule, TuuModule, StoreSettingsModule],
    controllers: [SalesController],
    providers: [SalesService],
    exports: [SalesService],
})
export class SalesModule { }
