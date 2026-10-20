import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';

export const MEDIA_FOLDERS = { productos: 'lomasrico/assets', banners: 'lomasrico/banners' } as const;
export type MediaFolder = keyof typeof MEDIA_FOLDERS;

@Injectable()
export class CloudinaryService {
    isConfigured() {
        return !!(
            process.env.CLOUDINARY_CLOUD_NAME
            && process.env.CLOUDINARY_API_KEY
            && process.env.CLOUDINARY_API_SECRET
        );
    }

    private get config() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!cloudName || !apiKey || !apiSecret) {
            throw new ServiceUnavailableException(
                'Cloudinary no está configurado en el servidor (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).',
            );
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

    /** Subida firmada desde el servidor (más fiable que el browser → Cloudinary). */
    async uploadBuffer(buffer: Buffer, folder: MediaFolder, mimeType: string, originalName?: string) {
        const { cloudName, apiKey, apiSecret } = this.config;
        const timestamp = Math.floor(Date.now() / 1000);
        const folderPath = MEDIA_FOLDERS[folder];
        const params = { folder: folderPath, timestamp };
        const signature = this.sign(params);

        const isVideo = mimeType.startsWith('video/');
        const form = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'application/octet-stream' });
        form.append('file', blob, originalName || (isVideo ? 'upload.mp4' : 'upload.jpg'));
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('folder', folderPath);
        form.append('signature', signature);

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`,
            { method: 'POST', body: form },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new ServiceUnavailableException(
                data?.error?.message || `Cloudinary rechazó la subida (HTTP ${res.status})`,
            );
        }
        return {
            publicId: data.public_id as string,
            url: data.secure_url as string,
            bytes: Number(data.bytes || buffer.length),
            resourceType: (data.resource_type as string) || (isVideo ? 'video' : 'image'),
        };
    }
}
