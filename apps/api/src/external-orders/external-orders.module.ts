import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExternalOrdersController } from './external-orders.controller';
import { ExternalOrdersService } from './external-orders.service';
import { ProductMapperService } from './product-mapper.service';
import { UberScraperCronService } from './uber-scraper-cron.service';
import { DatabaseModule } from '../database/database.module';
import { SalesModule } from '../sales/sales.module';

@Module({
    imports: [
        DatabaseModule,
        ScheduleModule.forRoot(),
        forwardRef(() => SalesModule),
    ],
    controllers: [ExternalOrdersController],
    providers: [ExternalOrdersService, ProductMapperService, UberScraperCronService],
    exports: [ExternalOrdersService, ProductMapperService],
})
export class ExternalOrdersModule {}
