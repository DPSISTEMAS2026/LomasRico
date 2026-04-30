import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
    imports: [AvailabilityModule],
    controllers: [InventoryController],
    providers: [InventoryService],
    exports: [InventoryService],
})
export class InventoryModule {
    constructor() {
        console.log('!!! INVENTORY MODULE LOADED !!!');
    }
}
