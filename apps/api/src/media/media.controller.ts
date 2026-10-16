import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CloudinaryService, MEDIA_FOLDERS, MediaFolder } from './cloudinary.service';

function parseFolder(folder?: string): MediaFolder {
    const f = (folder || 'productos') as MediaFolder;
    if (!(f in MEDIA_FOLDERS)) throw new BadRequestException('Carpeta inválida');
    return f;
}

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class MediaController {
    constructor(private readonly cloudinary: CloudinaryService) {}

    @Get('signature')
    signature(@Query('folder') folder?: string) {
        return this.cloudinary.uploadSignature(parseFolder(folder));
    }
}
