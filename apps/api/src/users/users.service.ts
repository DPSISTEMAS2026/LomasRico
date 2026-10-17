import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AuditService } from '../audit/audit.service';

function makeTempPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(8);
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
}

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService, private audit: AuditService) { }

    async getAddresses(userId: string) {
        // @ts-ignore
        return (this.prisma as any).userAddress.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async addAddress(userId: string, dto: CreateAddressDto) {
        if (dto.isDefault) {
            // Reset other defaults
            // @ts-ignore
            await (this.prisma as any).userAddress.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        // @ts-ignore
        return (this.prisma as any).userAddress.create({
            data: {
                userId,
                addressText: dto.addressText,
                isDefault: dto.isDefault || false,
                lat: dto.latitude,
                lng: dto.longitude,
            },
        });
    }

    async getOrders(userId: string) {
        // @ts-ignore - Prisma client needs regeneration
        return (this.prisma as any).sale.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        sellingProduct: { select: { id: true, name: true } },
                        productVariant: {
                            include: {
                                sellingProduct: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async findAllCustomers(search?: string) {
        // @ts-ignore
        const dbUsers = await (this.prisma as any).user.findMany({
            where: {
                role: 'CUSTOMER',
                OR: search ? [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ] : undefined
            },
            include: {
                addresses: true
            },
            orderBy: { historicalSpent: 'desc' },
            take: search ? 15 : 1000
        });

        // Map addresses to match POS expectations (addressText -> address)
        return dbUsers.map(({ password, pin, confirmationCode, ...u }: any) => ({
            ...u,
            addresses: (u.addresses || []).map((a: any) => ({
                ...a,
                address: a.addressText,
                latitude: a.lat,
                longitude: a.lng
            }))
        }));
    }

    /**
     * Genera clave temporal para una clienta (OWNER/ADMIN).
     * No se puede leer la clave anterior (hash); esta se muestra una sola vez al admin.
     */
    async resetCustomerPassword(customerId: string, actor: { userId: string; role: string }) {
        const user = await (this.prisma as any).user.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, email: true, phone: true, role: true },
        });
        if (!user) throw new NotFoundException('Cliente no encontrado');
        if (user.role !== 'CUSTOMER') throw new BadRequestException('Solo se puede resetear clientes');

        const tempPassword = makeTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        await (this.prisma as any).user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        await this.audit.log({
            action: 'CUSTOMER_PASSWORD_RESET',
            actorId: actor.userId,
            details: { customerId: user.id, email: user.email || null, phone: user.phone || null },
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            tempPassword,
            message: 'Clave temporal lista. Dásela a la clienta; no vuelve a mostrarse.',
        };
    }
}
