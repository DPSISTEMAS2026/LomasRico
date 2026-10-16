import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';

export const MEDIA_FOLDERS = { productos: 'lomasrico/assets', banners: 'lomasrico/banners' } as const;
export type MediaFolder = keyof typeof MEDIA_FOLDERS;

@Injectable()
export class CloudinaryService {
    private get config() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!cloudName || !apiKey || !apiSecret) {
            throw new ServiceUnavailableException('Cloudinary no está configurado');
        }
        return { cloudName, apiKey, apiSecret };
    }

    sign(params: Record<string, string | number>): string {
        const payload = Object.keys(params)
            .sort()
            .map((k) => `${k}=${params[k]}`)
            .join('&');
        return createHash('sha1').update(payload + this.config.apiSecret).digest('hex');
    }

    /** Datos para que el panel suba el archivo directo a Cloudinary (no pasa por Render). */
    uploadSignature(folder: MediaFolder) {
        const { cloudName, apiKey } = this.config;
        const timestamp = Math.floor(Date.now() / 1000);
        const params = { folder: MEDIA_FOLDERS[folder], timestamp };
        return { cloudName, apiKey, ...params, signature: this.sign(params) };
    }

}
