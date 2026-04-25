import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

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
                        productVariant: {
                            include: {
                                sellingProduct: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
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
        return dbUsers.map((u: any) => ({
            ...u,
            addresses: (u.addresses || []).map((a: any) => ({
                ...a,
                address: a.addressText,
                latitude: a.lat,
                longitude: a.lng
            }))
        }));
    }
}
