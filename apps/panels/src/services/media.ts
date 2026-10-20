import { CLOUDINARY_IMAGE, CLOUDINARY_VIDEO, cloudinaryTransform } from '@lomasrico/shared-types';
import { API_URL } from './api';
import { authFetch } from './authFetch';

export type MediaFolder = 'productos' | 'banners';

export interface MediaAsset {
    publicId: string;
    url: string;
}

async function readError(res: Response): Promise<string> {
    const data = await res.json().catch(() => ({} as any));
    const msg = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
    return msg || `HTTP ${res.status}`;
}

/**
 * Sube por la API (Cloudinary firmado en el servidor).
 * Más fiable que el browser → Cloudinary directo (CORS / firma / env en Render).
 */
export async function uploadMedia(file: File, folder: MediaFolder): Promise<MediaAsset> {
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('El archivo supera 10 MB. Comprime la imagen e inténtalo de nuevo.');
    }

    const form = new FormData();
    form.append('file', file);

    const res = await authFetch(`${API_URL}/media/upload?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const detail = await readError(res);
        if (res.status === 503 || /cloudinary/i.test(detail)) {
            throw new Error(`${detail} Revisá las variables CLOUDINARY_* en Render.`);
        }
        throw new Error(detail);
    }

    const data = await res.json();
    const isVideo = file.type.startsWith('video/');
    const rawUrl = String(data.url || data.secure_url || '');
    if (!rawUrl) throw new Error('La subida no devolvió URL');

    return {
        publicId: String(data.publicId || data.public_id || ''),
        url: cloudinaryTransform(rawUrl, isVideo ? CLOUDINARY_VIDEO : CLOUDINARY_IMAGE),
    };
}
