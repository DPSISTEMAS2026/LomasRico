import {
    BadRequestException,
    Controller,
    Get,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MANAGER_ROLES } from '../auth/access';
import { CloudinaryService, MEDIA_FOLDERS, MediaFolder } from './cloudinary.service';

function parseFolder(folder?: string): MediaFolder {
    const f = (folder || 'productos') as MediaFolder;
    if (!(f in MEDIA_FOLDERS)) throw new BadRequestException('Carpeta inválida');
    return f;
}

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MANAGER_ROLES)
export class MediaController {
    constructor(private readonly cloudinary: CloudinaryService) {}

    @Get('status')
    status() {
        return { cloudinary: this.cloudinary.isConfigured() };
    }

    @Get('signature')
    signature(@Query('folder') folder?: string) {
        return this.cloudinary.uploadSignature(parseFolder(folder));
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
                return cb(new BadRequestException('Solo imágenes o video') as any, false);
            }
            cb(null, true);
        },
    }))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder?: string,
    ) {
        if (!file?.buffer?.length) throw new BadRequestException('No se recibió ningún archivo');
        const mediaFolder = parseFolder(folder);
        const uploaded = await this.cloudinary.uploadBuffer(
            file.buffer,
            mediaFolder,
            file.mimetype,
            file.originalname,
        );
        return uploaded;
    }
}
