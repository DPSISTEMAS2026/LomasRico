import { CLOUDINARY_IMAGE, CLOUDINARY_VIDEO, cloudinaryTransform } from '@lomasrico/shared-types';
import { API_URL } from './api';
import { authFetch } from './authFetch';

export type MediaFolder = 'productos' | 'banners';

export interface MediaAsset {
    publicId: string;
    url: string;
}

/** Sube el archivo directo a Cloudinary y devuelve la URL de entrega optimizada. */
export async function uploadMedia(file: File, folder: MediaFolder): Promise<MediaAsset> {
    const signRes = await authFetch(`${API_URL}/media/signature?folder=${folder}`);
    if (!signRes.ok) throw new Error(`No se pudo autorizar la subida (HTTP ${signRes.status})`);
    const sign = await signRes.json();

    const isVideo = file.type.startsWith('video/');
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sign.apiKey);
    form.append('timestamp', String(sign.timestamp));
    form.append('folder', sign.folder);
    form.append('signature', sign.signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/${isVideo ? 'video' : 'image'}/upload`, {
        method: 'POST',
        body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);

    return {
        publicId: data.public_id,
        url: cloudinaryTransform(data.secure_url, isVideo ? CLOUDINARY_VIDEO : CLOUDINARY_IMAGE),
    };
}
