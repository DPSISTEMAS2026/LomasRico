/** Transformaciones de entrega de Cloudinary. El original queda intacto en la cuenta. */
export const CLOUDINARY_IMAGE = 'f_auto,q_auto,c_limit,w_1600';
export const CLOUDINARY_VIDEO = 'q_auto,c_limit,w_720';
export const CLOUDINARY_THUMB = 'f_auto,q_auto,c_fill,w_300,h_300';
/** Tarjetas y mosaico de la tienda. Más chico que la foto guardada (1600). */
export const CLOUDINARY_CARD = 'f_auto,q_auto,c_limit,w_720';

export function isCloudinaryUrl(url?: string | null): boolean {
    return !!url && /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\//.test(url);
}

/** Inserta (o reemplaza) la transformación de una URL de Cloudinary. Otras URLs se devuelven igual. */
export function cloudinaryTransform(url: string, transform: string): string {
    if (!isCloudinaryUrl(url)) return url;
    const [base, rest] = url.split('/upload/');
    const parts = rest.split('/');
    while (parts.length > 1 && !/^v\d+$/.test(parts[0]) && parts[0].includes('_')) parts.shift();
    return `${base}/upload/${transform}/${parts.join('/')}`;
}
