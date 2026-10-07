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

    async listImages(folder: MediaFolder) {
        const { cloudName, apiKey, apiSecret } = this.config;
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const out: { publicId: string; url: string }[] = [];
        let cursor = '';
        do {
            const qs = new URLSearchParams({ prefix: `${MEDIA_FOLDERS[folder]}/`, max_results: '500' });
            if (cursor) qs.set('next_cursor', cursor);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?${qs}`, {
                headers: { Authorization: `Basic ${auth}` },
            });
            if (!res.ok) throw new ServiceUnavailableException(`Cloudinary respondió ${res.status}`);
            const data: any = await res.json();
            for (const r of data.resources ?? []) out.push({ publicId: r.public_id, url: r.secure_url });
            cursor = data.next_cursor ?? '';
        } while (cursor);
        return out.sort((a, b) => a.publicId.localeCompare(b.publicId));
    }
}
