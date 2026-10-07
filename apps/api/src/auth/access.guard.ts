import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { timingSafeEqual } from 'crypto';
import { IS_INTEGRATION, IS_PUBLIC, STAFF_ROLES } from './access';

function sameSecret(a: string, b: string) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Guard global: toda ruta exige sesión de personal, salvo que se marque
 * `@Public()`, `@Integration()` o se indiquen otros roles con `@Roles(...)`.
 */
@Injectable()
export class AccessGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    private meta<T>(key: string, ctx: ExecutionContext) {
        return this.reflector.getAllAndOverride<T>(key, [ctx.getHandler(), ctx.getClass()]);
    }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest();

        if (this.meta<boolean>(IS_PUBLIC, ctx)) {
            if (req.headers?.authorization) {
                try { await super.canActivate(ctx); } catch { req.user = undefined; }
            }
            return true;
        }

        if (this.meta<boolean>(IS_INTEGRATION, ctx)) {
            const expected = process.env.INTEGRATION_API_KEY || '';
            const given = String(req.headers?.['x-integration-key'] || '');
            if (!expected || !given || !sameSecret(given, expected)) {
                throw new UnauthorizedException('Integración no autorizada');
            }
            return true;
        }

        await super.canActivate(ctx);
        const roles = this.meta<string[]>('roles', ctx) ?? STAFF_ROLES;
        if (!req.user || !roles.includes(req.user.role)) {
            throw new ForbiddenException('No tienes permiso para esta acción');
        }
        return true;
    }

    handleRequest(err: any, user: any) {
        if (err || !user) throw err || new UnauthorizedException('Sesión inválida o vencida');
        return user;
    }
}
