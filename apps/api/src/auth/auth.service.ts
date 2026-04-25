import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.warn('WARNING: GOOGLE_CLIENT_ID is not defined in environment variables.');
        }
        this.googleClient = new OAuth2Client(clientId);
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

        // TODO: Integrate real email service
        console.log(`[EMAIL MOCK] Verification Code for ${dto.email}: ${verificationCode}`);

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user: { ...user, password: undefined },
            requiresVerification: true
        };
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

        return { success: true, user: updated };
    }

    async login(dto: LoginDto) {
        // @ts-ignore
        const user = await (this.prisma as any).user.findUnique({
            where: { email: dto.email },
        });

        if (!user || !user.password) {
            // Handle Google-only users trying to login with password logic or just bad creds
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const cleanPass = await bcrypt.compare(dto.password, user.password);
        if (!cleanPass) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user: { ...user, password: undefined },
        };
    }

    async updateProfile(userId: string, data: { phone?: string; name?: string }) {
        // @ts-ignore
        return (this.prisma as any).user.update({
            where: { id: userId },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
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
                },
            });

            const jwtPayload = { sub: user.id, email: user.email };
            return {
                accessToken: this.jwtService.sign(jwtPayload),
                user,
            };
        } catch (error) {
            console.error('Google Auth Error:', error);
            throw new UnauthorizedException('Invalid Google credentials');
        }
    }

    async loginWithPin(pin: string) {
        // @ts-ignore: Prisma Client not updated yet
        const user = await (this.prisma as any).user.findFirst({
            where: { pin },
        });

        if (!user) {
            throw new UnauthorizedException('PIN inválido');
        }

        const jwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwtService.sign(jwtPayload),
            user,
        };
    }

    async getMe(userId: string) {
        // @ts-ignore: Prisma Client must be regenerated to see 'user' model
        return (this.prisma as any).user.findUnique({
            where: { id: userId },
            include: {
                addresses: true,
            }
        });
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
