import {
    Controller, Get, Post, Delete, Param,
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

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(), // Buffer en memoria → lo mandamos a Supabase
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new BadRequestException('Solo se permiten imágenes'), false);
            }
            cb(null, true);
        }
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No se recibió ningún archivo');
        }

        this.logger.log(`[Banners] Subiendo: ${file.originalname} (${Math.round(file.size / 1024)}KB)`);

        return this.bannersService.upload(file.buffer, file.originalname, file.mimetype);
    }

    @Delete(':filename')
    delete(@Param('filename') filename: string) {
        return this.bannersService.delete(filename);
    }
}
