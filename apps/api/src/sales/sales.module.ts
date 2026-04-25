import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { RecipeEngineeringModule } from '../recipe-engineering/recipe-engineering.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
    imports: [RecipeEngineeringModule, InventoryModule, ShippingModule],
    controllers: [SalesController],
    providers: [SalesService],
    exports: [SalesService],
})
export class SalesModule { }
