import { Module } from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [DatabaseModule, ProductsModule],
    controllers: [ModifiersController],
    providers: [ModifiersService],
    exports: [ModifiersService],
})
export class ModifiersModule {}
