import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
    @IsString()
    ingredientId: string;

    @IsNumber()
    quantity: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsString()
    @IsOptional()
    role?: string;
}

export class CreateRecipeDto {
    @IsString()
    targetId: string;

    @IsString()
    type: string;

    @IsNumber()
    @IsOptional()
    baseWeight?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RecipeItemDto)
    items: RecipeItemDto[];
}
