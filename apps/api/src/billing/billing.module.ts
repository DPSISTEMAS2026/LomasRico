import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
// import { DatabaseModule } from '../database/database.module';

@Module({
    //   imports: [DatabaseModule],
    providers: [BillingService],
    controllers: [BillingController],
    exports: [BillingService],
})
export class BillingModule { }
