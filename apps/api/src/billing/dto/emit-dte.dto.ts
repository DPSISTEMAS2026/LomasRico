import { IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DteReceptorDto {
    @IsString()
    rut: string; // e.g. '76.123.456-7' or '66666666-6' for boleta

    @IsOptional()
    @IsString()
    razonSocial?: string;

    @IsOptional()
    @IsString()
    giro?: string;

    @IsOptional()
    @IsString()
    direccion?: string;

    @IsOptional()
    @IsString()
    comuna?: string;
}

export class DteItemDto {
    @IsString()
    nombre: string;

    @IsNumber()
    cantidad: number;

    @IsNumber()
    precioUnitario: number;

    @IsOptional()
    @IsNumber()
    descuento?: number;
}

export class EmitDteDto {
    /** 39 = Boleta, 33 = Factura, 61 = Nota de Crédito, 56 = Nota de Débito */
    @IsNumber()
    tipoDTE: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => DteReceptorDto)
    receptor?: DteReceptorDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DteItemDto)
    items: DteItemDto[];

    @IsOptional()
    @IsString()
    saleId?: string; // Link back to our Sale record

    /** For Nota de Crédito: reference to original DTE */
    @IsOptional()
    @IsNumber()
    referenciaFolio?: number;

    @IsOptional()
    @IsNumber()
    referenciaTipoDTE?: number;

    @IsOptional()
    @IsString()
    referenciaRazon?: string;
}
