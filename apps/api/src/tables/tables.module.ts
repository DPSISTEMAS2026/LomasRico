import { Module } from '@nestjs/common';
import { RecipeEngineeringModule } from '../recipe-engineering/recipe-engineering.module';
import { TablesController } from './tables.controller';
import { TablesPublicController } from './tables-public.controller';
import { TablesService } from './tables.service';

@Module({
    imports: [RecipeEngineeringModule],
    controllers: [TablesController, TablesPublicController],
    providers: [TablesService],
    exports: [TablesService],
})
export class TablesModule {}

