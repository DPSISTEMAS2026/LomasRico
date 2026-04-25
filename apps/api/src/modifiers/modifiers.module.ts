import { Module } from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [ModifiersController],
    providers: [ModifiersService],
    exports: [ModifiersService],
})
export class ModifiersModule {}
