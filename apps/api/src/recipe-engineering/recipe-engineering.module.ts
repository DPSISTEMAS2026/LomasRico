import { Module } from '@nestjs/common';
import { RecipeResolverService } from './recipe-resolver.service';
@Module({
    providers: [RecipeResolverService],
    exports: [RecipeResolverService],
})
export class RecipeEngineeringModule { }
