import { BadRequestException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { BrevoService, logoSrc } from '../mail/brevo.service';

function phoneKey(raw?: string | null) {
    const digits = String(raw || '').replace(/\D/g, '');
    return digits.length >= 8 ? digits.slice(-9) : '';
}

/** Contraseña inicial de clientas del CSV: últimos 4 dígitos del celular. */
export function passwordFromPhone(phone?: string | null) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : '';
}

function verificationEmailHtml(name: string, code: string) {
    const safeName = String(name || '').replace(/[<>&"]/g, '');
    return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:32px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;">
<tr><td style="padding:32px;text-align:center;color:#0f172a;">
<img src="${logoSrc()}" width="72" alt="Lo Más Rico" style="display:block;margin:0 auto 16px auto;" />
<p style="margin:0 0 8px 0;font-size:15px;">Hola${safeName ? `, ${safeName}` : ''}:</p>
<p style="margin:0 0 20px 0;font-size:15px;">Tu código para confirmar tu cuenta es</p>
<p style="margin:0 0 20px 0;font-size:34px;font-weight:900;letter-spacing:0.3em;">${code}</p>
<p style="margin:0;font-size:13px;color:#334155;">Si no creaste una cuenta, ignora este correo.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function tempPasswordEmailHtml(name: string, tempPassword: string) {
    const safeName = String(name || '').replace(/[<>&"]/g, '');
    const safePass = String(tempPassword || '').replace(/[<>&"]/g, '');
    return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:32px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;">
<tr><td style="padding:32px;text-align:center;color:#0f172a;">
<img src="${logoSrc()}" width="72" alt="Lo Más Rico" style="display:block;margin:0 auto 16px auto;" />
<p style="margin:0 0 8px 0;font-size:15px;">Hola${safeName ? `, ${safeName}` : ''}:</p>
<p style="margin:0 0 16px 0;font-size:15px;">Tu contraseña temporal de Lo Más Rico es</p>
<p style="margin:0 0 16px 0;font-size:28px;font-weight:900;letter-spacing:0.12em;">${safePass}</p>
<p style="margin:0 0 12px 0;font-size:14px;color:#334155;">Ingresa con tu correo y esta clave. Después cámbiala en tu perfil.</p>
<p style="margin:0;font-size:13px;color:#334155;">Si no pediste recuperar la contraseña, ignora este correo.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function makeTempPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(8);
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
}

const STAFF_ROLES = ['OWNER', 'ADMIN', 'CASHIER', 'KITCHEN', 'WAITER'] as const;
const PIN_ROLES = [...STAFF_ROLES, 'DRIVER'] as const;
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
        const email = String(dto.email || '').trim().toLowerCase();
        // @ts-ignore
        const existing = await (this.prisma as any).user.findUnique({
            where: { email },
        });

        if (existing) {
            throw new UnauthorizedException('El correo ya está registrado');
        }

        const phone = String(dto.phone || '').trim();
        const key = phoneKey(phone);
        if (key) {
            // @ts-ignore
            const withPhone: { phone: string | null }[] = await (this.prisma as any).user.findMany({
                where: { phone: { not: null } },
                select: { phone: true },
            });
            const taken = withPhone.some((u) => phoneKey(u.phone) === key);
            if (taken) {
                throw new UnauthorizedException('El celular ya está registrado');
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // @ts-ignore
        const user = await (this.prisma as any).user.create({
            data: {
                email,
                name: dto.name,
                password: hashedPassword,
                phone: phone || null,
                role: 'CUSTOMER',
                confirmationCode: verificationCode,
                isVerified: false
            },
        });

        let codeSent = false;
        let codeError = '';
        try {
            await this.brevo.sendTransactional(
                user.email,
                user.name,
                `Tu código Lo Más Rico: ${verificationCode}`,
                verificationEmailHtml(user.name, verificationCode),
            );
            codeSent = true;
        } catch (err: unknown) {
            codeError = err instanceof Error ? err.message : String(err);
            console.warn(`No se pudo enviar el código de verificación a ${user.email}: ${codeError}`);
        }

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user: this.sanitizeUser(user),
            // Siempre pedimos el código: la cuenta queda sin verificar hasta que llegue el correo.
            requiresVerification: true,
            codeSent,
            ...(codeSent ? {} : { warning: 'No pudimos enviar el correo. Revisa el correo o intenta más tarde.' }),
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
        if (updated.role === 'CUSTOMER') await this.linkGuestSales(updated.id, updated.email);

        return { success: true, user: this.sanitizeUser(updated) };
    }

    async login(dto: LoginDto) {
        const rawId = String(dto.email || '').trim();
        const looksEmail = rawId.includes('@');
        let user: any = null;

        if (looksEmail) {
            // @ts-ignore
            user = await (this.prisma as any).user.findUnique({
                where: { email: rawId.toLowerCase() },
            });
        } else {
            const key = phoneKey(rawId);
            if (key) {
                // @ts-ignore
                const candidates: any[] = await (this.prisma as any).user.findMany({
                    where: { phone: { not: null }, role: 'CUSTOMER' },
                });
                user = candidates.find((u) => phoneKey(u.phone) === key) || null;
            }
        }

        const typed = String(dto.password || '');
        const typedDigits = typed.replace(/\D/g, '');
        const pin = passwordFromPhone(user?.phone);
        const isCustomer = user?.role === 'CUSTOMER';
        const pinOk =
            !!user &&
            isCustomer &&
            pin.length === 4 &&
            typedDigits === pin &&
            typedDigits.length === 4;
        const hashOk = user?.password ? await bcrypt.compare(typed, user.password) : false;
        // Import CSV antiguo hasheó el celular completo; aceptar ese fallback una vez.
        const fullPhoneOk =
            !!user &&
            isCustomer &&
            !!user.password &&
            typedDigits.length >= 8 &&
            !!phoneKey(user.phone) &&
            typedDigits.slice(-9) === phoneKey(user.phone)
                ? await bcrypt.compare(typedDigits, user.password)
                : false;

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'login-phone4',hypothesisId:'B',location:'auth.service.ts:login',message:'customer login attempt',data:{looksEmail,found:!!user,hasPhone:!!user?.phone,pinLen:pin.length,pinOk,hashOk,fullPhoneOk,passLen:typed.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (!user || (!hashOk && !pinOk && !fullPhoneOk)) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if ((pinOk || fullPhoneOk) && !hashOk) {
            const nextPlain = pinOk ? pin : typedDigits.slice(-4);
            const hashedPassword = await bcrypt.hash(nextPlain, 10);
            // @ts-ignore
            await (this.prisma as any).user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });
        }

        if (user.role === 'CUSTOMER') await this.linkGuestSales(user.id, user.email);

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
            if (!payload || !payload.email || payload.email_verified !== true) {
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
            where: { pin, role: { in: [...PIN_ROLES] } },
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

    /**
     * Recupera acceso por correo o celular. Siempre responde igual (no revela si la cuenta existe).
     * Si encuentra la cuenta, genera clave temporal y la envía al correo registrado.
     */
    async forgotPassword(identifier: string) {
        const raw = String(identifier || '').trim();
        if (!raw) throw new BadRequestException('Ingresa tu correo o celular');

        const looksEmail = raw.includes('@');
        let user: any = null;

        if (looksEmail) {
            const email = raw.toLowerCase();
            // @ts-ignore
            user = await (this.prisma as any).user.findUnique({ where: { email } });
        } else {
            const key = phoneKey(raw);
            if (!key) throw new BadRequestException('Ingresa un correo o celular válido');
            // @ts-ignore
            const candidates: any[] = await (this.prisma as any).user.findMany({
                where: { phone: { not: null }, role: 'CUSTOMER' },
                select: { id: true, email: true, name: true, phone: true, password: true },
            });
            user = candidates.find((u) => phoneKey(u.phone) === key) || null;
        }

        const okMsg = {
            ok: true,
            message: 'Si la cuenta existe, enviamos una contraseña temporal a tu correo.',
        };

        if (!user?.email) return okMsg;

        const temp = makeTempPassword();
        const hashedPassword = await bcrypt.hash(temp, 10);
        // @ts-ignore
        await (this.prisma as any).user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        try {
            await this.brevo.sendTransactional(
                user.email,
                user.name || user.email,
                'Tu contraseña temporal · Lo Más Rico',
                tempPasswordEmailHtml(user.name, temp),
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`forgotPassword: no se pudo enviar correo a ${user.email}: ${message}`);
            throw new BadRequestException('No pudimos enviar el correo. Intenta más tarde.');
        }

        return okMsg;
    }
}
