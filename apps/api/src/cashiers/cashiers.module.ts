import { Module } from '@nestjs/common';
import { CashiersController } from './cashiers.controller';
import { CashiersService } from './cashiers.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [CashiersController],
    providers: [CashiersService],
    exports: [CashiersService]
})
export class CashiersModule { }
