
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export function jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET es obligatorio en producción');
    }
    return 'dev-only-secret-replace-in-prod';
}

const USER_CACHE_MS = 60_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly users = new Map<string, { at: number; user: { id: string; email: string | null; role: string; name: string | null } | null }>();

    constructor(private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret(),
        });
    }

    /** El rol se toma de la base: si se elimina o cambia a alguien, el token deja de valer en un minuto. */
    async validate(payload: any) {
        const id = String(payload?.sub || '');
        const hit = this.users.get(id);
        let user = hit && Date.now() - hit.at < USER_CACHE_MS ? hit.user : undefined;
        if (user === undefined) {
            user = await this.prisma.user.findUnique({
                where: { id },
                select: { id: true, email: true, role: true, name: true },
            });
            if (this.users.size > 500) this.users.clear();
            this.users.set(id, { at: Date.now(), user });
        }
        if (!user) throw new UnauthorizedException('Sesión inválida o vencida');
        return { userId: user.id, email: user.email, role: user.role, name: user.name };
    }
}
