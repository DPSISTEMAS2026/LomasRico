import {
    Controller, Get, Post, Delete, Param, Query,
    UseInterceptors, UploadedFile, Logger, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { memoryStorage } from 'multer';

@Controller('banners')
export class BannersController {
    private readonly logger = new Logger(BannersController.name);

    constructor(private readonly bannersService: BannersService) { }

    @Get()
    findAll() {
        return this.bannersService.findAll();
    }

    /**
     * POST /banners/upload?type=desktop|mobile
     * Sube un banner con prefijo determinista.
     * 
     * type=desktop → Panorámico (1920×600) → Se muestra en PC
     * type=mobile  → Cuadrado (600×400)   → Se muestra en celular/tablet
     * Sin type     → Nombre genérico (asignación por tamaño de archivo)
     */
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new BadRequestException('Solo se permiten imágenes'), false);
            }
            cb(null, true);
        }
    }))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Query('type') bannerType?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No se recibió ningún archivo');
        }

        // Validar tipo si se proporciona
        if (bannerType && !['desktop', 'mobile'].includes(bannerType)) {
            throw new BadRequestException('type debe ser "desktop" o "mobile"');
        }

        this.logger.log(`[Banners] Subiendo: ${file.originalname} (${Math.round(file.size / 1024)}KB) tipo=${bannerType || 'auto'}`);

        return this.bannersService.upload(file.buffer, file.originalname, file.mimetype, bannerType);
    }

    @Delete(':filename')
    delete(@Param('filename') filename: string) {
        return this.bannersService.delete(filename);
    }
}
