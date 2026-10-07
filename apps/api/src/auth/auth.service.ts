import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { BrevoService, logoSrc } from '../mail/brevo.service';

function verificationEmailHtml(name: string, code: string) {
    const safeName = String(name || '').replace(/[<>&"]/g, '');
    return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:32px 12px;background:#fff6ea;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #f3e7d7;">
<tr><td style="padding:32px;text-align:center;color:#0f172a;">
<img src="${logoSrc()}" width="72" alt="Lo Más Rico" style="display:block;margin:0 auto 16px auto;" />
<p style="margin:0 0 8px 0;font-size:15px;">Hola${safeName ? `, ${safeName}` : ''}:</p>
<p style="margin:0 0 20px 0;font-size:15px;">Tu código para confirmar tu cuenta es</p>
<p style="margin:0 0 20px 0;font-size:34px;font-weight:900;letter-spacing:0.3em;">${code}</p>
<p style="margin:0;font-size:13px;color:#334155;">Si no creaste una cuenta, ignora este correo.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function passwordFromPhone(phone?: string | null) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.slice(-4);
}

const STAFF_ROLES = ['OWNER', 'ADMIN', 'CASHIER', 'KITCHEN', 'WAITER'] as const;
const DEFAULT_STAFF_PIN = '2026';

@Injectable()
export class AuthService implements OnModuleInit {
    private googleClient: OAuth2Client;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private brevo: BrevoService,
    ) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.warn('WARNING: GOOGLE_CLIENT_ID is not defined in environment variables.');
        }
        this.googleClient = new OAuth2Client(clientId);
    }

    async onModuleInit() {
        try {
            await this.ensureStaffPins();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn('ensureStaffPins skipped:', message);
        }
    }

    /** Solo en una base vacía: crea el dueño inicial para poder entrar la primera vez. */
    private async ensureStaffPins() {
        const staff = await this.prisma.user.count({
            where: { role: { in: [...STAFF_ROLES] as any } },
        });

        if (staff === 0) {
            await this.prisma.user.create({
                data: {
                    name: 'Dueño',
                    email: 'dueno@lomasrico.cl',
                    role: 'OWNER',
                    pin: DEFAULT_STAFF_PIN,
                },
            });
        }

    }

    private sanitizeUser(user: any) {
        if (!user) return user;
        const { password, pin, confirmationCode, ...safe } = user;
        return safe;
    }

    /**
     * PENDIENTE DE REGENERACIÓN DE PRISMA CLIENT:
     * El modelo 'User' y 'UserAddress' han sido añadidos al schema.prisma,
     * pero el Prisma Client local aun no los reconoce. 
     * Ejecutar 'npx prisma generate' para resolver errores de compilado.
     */

    async register(dto: RegisterDto) {
        // @ts-ignore
        const existing = await (this.prisma as any).user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new UnauthorizedException('El correo ya está registrado');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // @ts-ignore
        const user = await (this.prisma as any).user.create({
            data: {
                email: dto.email,
                name: dto.name,
                password: hashedPassword,
                phone: dto.phone, // N8N Key field
                role: 'CUSTOMER',
                confirmationCode: verificationCode,
                isVerified: false
            },
        });

        await this.linkGuestSales(user.id, user.email);

        let codeSent = false;
        try {
            await this.brevo.sendTransactional(
                user.email,
                user.name,
                `Tu código Lo Más Rico: ${verificationCode}`,
                verificationEmailHtml(user.name, verificationCode),
            );
            codeSent = true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`No se pudo enviar el código de verificación a ${user.email}: ${message}`);
        }

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user: this.sanitizeUser(user),
            requiresVerification: codeSent
        };
    }

    private async linkGuestSales(userId: string, email: string) {
        try {
            await (this.prisma as any).sale.updateMany({
                where: { channel: 'WEB', userId: null, shippingData: { path: ['contact', 'email'], equals: String(email).trim().toLowerCase() } },
                data: { userId },
            });
        } catch (err: unknown) {
            console.warn(`No se pudieron asociar pedidos previos de ${email}: ${err instanceof Error ? err.message : err}`);
        }
    }

    async verifyEmail(email: string, code: string) {
        // @ts-ignore
        const user = await (this.prisma as any).user.findUnique({
            where: { email }
        });

        if (!user || user.confirmationCode !== code) {
            throw new UnauthorizedException('Código inválido');
        }

        // @ts-ignore
        const updated = await (this.prisma as any).user.update({
            where: { email },
            data: {
                isVerified: true,
                confirmationCode: null // Consume code
            }
        });

        return { success: true, user: this.sanitizeUser(updated) };
    }

    async login(dto: LoginDto) {
        // @ts-ignore
        const user = await (this.prisma as any).user.findUnique({
            where: { email: dto.email },
        });

        const pin = passwordFromPhone(user?.phone);
        const typed = String(dto.password || '').replace(/\D/g, '');
        const pinOk = !!user && user.role === 'CUSTOMER' && pin.length === 4 && typed === pin;
        const hashOk = user?.password ? await bcrypt.compare(dto.password, user.password) : false;

        if (!user || (!hashOk && !pinOk)) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (pinOk && !hashOk) {
            const hashedPassword = await bcrypt.hash(pin, 10);
            await (this.prisma as any).user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });
        }

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user: this.sanitizeUser(user),
        };
    }

    async updateProfile(userId: string, data: { phone?: string; name?: string }) {
        const allowed: { phone?: string; name?: string } = {};
        if (typeof data?.phone === 'string') allowed.phone = data.phone.trim().slice(0, 30);
        if (typeof data?.name === 'string') allowed.name = data.name.trim().slice(0, 80);
        // @ts-ignore
        const user = await (this.prisma as any).user.update({
            where: { id: userId },
            data: { ...allowed, updatedAt: new Date() }
        });
        return this.sanitizeUser(user);
    }

    async googleLogin(dto: GoogleLoginDto) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: dto.token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new UnauthorizedException('Invalid Google Token payload');
            }

            const { sub: googleId, email, name, picture: avatarUrl } = payload;

            // @ts-ignore: Prisma Client must be regenerated to see 'user' model
            const user = await (this.prisma as any).user.upsert({
                where: { email },
                update: {
                    googleId,
                    name: name || '',
                    avatarUrl,
                },
                create: {
                    email,
                    googleId: googleId || '',
                    name: name || '',
                    avatarUrl,
                    isVerified: true,
                },
            });

            if (user.role === 'CUSTOMER') await this.linkGuestSales(user.id, user.email);

            const jwtPayload = { sub: user.id, email: user.email, role: user.role };
            return {
                accessToken: this.jwtService.sign(jwtPayload),
                user: this.sanitizeUser(user),
            };
        } catch (error) {
            console.error('Google Auth Error:', error);
            throw new UnauthorizedException('Invalid Google credentials');
        }
    }

    async loginWithPin(pin: string) {
        const isFourDigits = /^\d{4}$/.test(String(pin || ''));

        if (!isFourDigits) {
            throw new UnauthorizedException('El PIN debe ser de 4 dígitos');
        }

        const matches = await this.prisma.user.findMany({
            where: { pin, role: { in: [...STAFF_ROLES] } },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                modules: true,
                canDiscount: true,
            },
        });

        const user = matches[0];

        if (!user) {
            throw new UnauthorizedException('PIN inválido');
        }
        if (matches.some((m) => m.role !== user.role)) {
            throw new UnauthorizedException('PIN compartido entre roles distintos. Pide al administrador que lo cambie.');
        }

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user: this.sanitizeUser(user),
        };
    }

    async getMe(userId: string) {
        // @ts-ignore: Prisma Client must be regenerated to see 'user' model
        const user = await (this.prisma as any).user.findUnique({
            where: { id: userId },
            include: {
                addresses: true,
            }
        });
        return this.sanitizeUser(user);
    }

    async updatePassword(userId: string, currentPass: string, newPass: string) {
        // @ts-ignore
        const user = await (this.prisma as any).user.findUnique({ where: { id: userId } });
        if (!user || !user.password) throw new UnauthorizedException('Usuario no válido');

        const isValid = await bcrypt.compare(currentPass, user.password);
        if (!isValid) throw new UnauthorizedException('Contraseña actual incorrecta');

        const hashedPassword = await bcrypt.hash(newPass, 10);
        // @ts-ignore
        await (this.prisma as any).user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return { success: true };
    }
}
