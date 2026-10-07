import { HttpException, HttpStatus } from '@nestjs/common';

const WINDOW_MS = 10 * 60_000;
const MAX_FAILS_PER_IP = 8;
const MAX_FAILS_GLOBAL = 60;

/** Limita intentos fallidos de ingreso por IP y en total (contra fuerza bruta de PIN). */
export class LoginThrottle {
    private readonly fails = new Map<string, number[]>();

    static clientIp(req: any): string {
        const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
        return forwarded[forwarded.length - 1] || req?.ip || 'desconocida';
    }

    private recent(key: string) {
        const now = Date.now();
        const list = (this.fails.get(key) || []).filter((t) => now - t < WINDOW_MS);
        this.fails.set(key, list);
        return list;
    }

    check(ip: string) {
        if (this.recent(`ip:${ip}`).length >= MAX_FAILS_PER_IP || this.recent('global').length >= MAX_FAILS_GLOBAL) {
            throw new HttpException('Demasiados intentos. Espera unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    fail(ip: string) {
        this.recent(`ip:${ip}`).push(Date.now());
        this.recent('global').push(Date.now());
        if (this.fails.size > 5000) this.fails.clear();
    }

    async run<T>(req: any, attempt: () => Promise<T>): Promise<T> {
        const ip = LoginThrottle.clientIp(req);
        this.check(ip);
        try {
            return await attempt();
        } catch (err) {
            this.fail(ip);
            throw err;
        }
    }
}
