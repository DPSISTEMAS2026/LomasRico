import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    price: number;

    @IsString()
    category: string;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    imageKey?: string;

    @IsString()
    @IsOptional()
    hoverVideoUrl?: string;

    @IsString()
    @IsOptional()
    hoverVideoKey?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    isConfigurable?: boolean;

    @IsNumber()
    @IsOptional()
    maxProteins?: number;
}
