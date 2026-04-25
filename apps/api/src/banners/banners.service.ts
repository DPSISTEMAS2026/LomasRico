import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'banners';

@Injectable()
export class BannersService {
    private readonly logger = new Logger(BannersService.name);
    private supabase: any = null;

    constructor() {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('PEGAR_AQUI')) {
            this.logger.warn(
                '[BannersService] Supabase no está configurado correctamente (falta URL o Service Role Key). ' +
                'La gestión de banners estará deshabilitada o limitada.'
            );
        } else {
            try {
                this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                this.ensureBucketExists();
            } catch (err: any) {
                this.logger.error('[BannersService] Fallo al inicializar SDK de Supabase:', err.message);
            }
        }
    }

    // Crea el bucket si no existe (solo en primer arranque)
    private async ensureBucketExists() {
        if (!this.supabase) return;
        try {
            const { data: buckets } = await this.supabase.storage.listBuckets();
            const exists = buckets?.some((b: any) => b.name === BUCKET);
            if (!exists) {
                const { error } = await this.supabase.storage.createBucket(BUCKET, {
                    public: true,          // Las URLs son públicas (para mostrar en la web)
                    fileSizeLimit: 10485760 // 10MB máximo por banner
                });
                if (error) this.logger.error('[Banners] Error creando bucket:', error.message);
                else this.logger.log('[Banners] Bucket "banners" creado en Supabase Storage ✅');
            }
        } catch (err: any) {
            this.logger.error('[Banners] Error verificando bucket:', err.message);
        }
    }

    async findAll() {
        if (!this.supabase) {
            this.logger.warn('[Banners] findAll llamado pero Supabase no está configurado.');
            return [];
        }

        try {
            const { data, error } = await this.supabase.storage.from(BUCKET).list('', {
                sortBy: { column: 'created_at', order: 'asc' }
            });

            if (error) {
                this.logger.error('[Banners] Error al listar archivos:', error.message);
                return [];
            }

            // Filtrar solo imágenes y construir URL pública
            return (data || [])
                .filter((f: any) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
                .map((f: any) => {
                    const { data: urlData } = this.supabase.storage
                        .from(BUCKET)
                        .getPublicUrl(f.name);
                    return {
                        name: f.name,
                        url: urlData.publicUrl,
                        createdAt: f.created_at,
                        size: f.metadata?.size,
                    };
                });
        } catch (err: any) {
            this.logger.error('[Banners] Error en findAll:', err.message);
            return [];
        }
    }

    async upload(buffer: Buffer, originalName: string, mimeType: string) {
        if (!this.supabase) {
            throw new InternalServerErrorException('Supabase Storage no configurado. Verifica tu .env');
        }

        // Nombre único para evitar colisiones
        const ext = originalName.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

        const { error } = await this.supabase.storage
            .from(BUCKET)
            .upload(filename, buffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) {
            this.logger.error('[Banners] Error al subir archivo:', error.message);
            throw new InternalServerErrorException(`Error al subir banner: ${error.message}`);
        }

        const { data: urlData } = this.supabase.storage.from(BUCKET).getPublicUrl(filename);

        this.logger.log(`[Banners] Banner subido: ${filename} → ${urlData.publicUrl}`);
        return {
            name: filename,
            url: urlData.publicUrl,
        };
    }

    async delete(filename: string) {
        if (!this.supabase) {
            throw new InternalServerErrorException('Supabase Storage no configurado.');
        }

        const { error } = await this.supabase.storage.from(BUCKET).remove([filename]);

        if (error) {
            this.logger.error('[Banners] Error al eliminar:', error.message);
            throw new InternalServerErrorException(`Error al eliminar banner: ${error.message}`);
        }

        this.logger.log(`[Banners] Banner eliminado: ${filename}`);
        return { success: true };
    }
}
