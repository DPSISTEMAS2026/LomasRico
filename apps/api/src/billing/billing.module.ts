import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LibreDteService } from './libre-dte.service';
import { BillingController } from './billing.controller';

@Module({
    imports: [DatabaseModule],
    providers: [LibreDteService],
    controllers: [BillingController],
    exports: [LibreDteService],
})
export class BillingModule {}
