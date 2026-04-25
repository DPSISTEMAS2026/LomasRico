import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PromotionsService {
    private readonly logger = new Logger(PromotionsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return this.prisma.promotion.findMany({
            include: { targetProduct: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const promo = await this.prisma.promotion.findUnique({
            where: { id },
            include: { targetProduct: true },
        });
        if (!promo) throw new NotFoundException('Promoción no encontrada');
        return promo;
    }

    async findByCode(code: string) {
        const promo = await this.prisma.promotion.findUnique({
            where: { code: code.toUpperCase() },
            include: { targetProduct: true },
        });
        if (!promo) throw new NotFoundException('Código de promoción no válido');

        // Validate active
        if (!promo.isActive) throw new ConflictException('Promoción inactiva');

        // Validate dates
        const now = new Date();
        if (promo.startDate && now < promo.startDate) throw new ConflictException('Promoción aún no ha comenzado');
        if (promo.endDate && now > promo.endDate) throw new ConflictException('Promoción expirada');

        // Validate max uses
        if (promo.maxUses && promo.currentUses >= promo.maxUses) throw new ConflictException('Promoción agotada');

        // Validate timezone schedule (Chile)
        if (promo.activeDays || promo.startTime || promo.endTime) {
            const chileTime = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
            const chileDate = new Date(chileTime);
            const currentDayNumber = chileDate.getDay(); // 0: Sunday, 1: Monday, ... 6: Saturday
            const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
            const currentDayName = DAYS[currentDayNumber];

            if (promo.activeDays) {
                try {
                    const daysArr = JSON.parse(promo.activeDays);
                    if (Array.isArray(daysArr) && daysArr.length > 0 && !daysArr.includes(currentDayName)) {
                        throw new ConflictException('La promoción no está activa el día de hoy');
                    }
                } catch(e) {}
            }

            if (promo.startTime || promo.endTime) {
                const currentHour = chileDate.getHours();
                const currentMinute = chileDate.getMinutes();
                const nowMinutes = currentHour * 60 + currentMinute;

                // Validate start time
                if (promo.startTime) {
                    const [h, m] = promo.startTime.split(':').map(Number);
                    const startMinutes = h * 60 + (m || 0);
                    if (nowMinutes < startMinutes) throw new ConflictException('La promoción aún no está disponible en este horario');
                }

               // Validate end time
               if (promo.endTime) {
                    const [h, m] = promo.endTime.split(':').map(Number);
                    const endMinutes = h * 60 + (m || 0);
                    if (nowMinutes > endMinutes) throw new ConflictException('El horario de la promoción ha finalizado hoy');
               }
            }
        }

        return promo;
    }

    async create(data: {
        code: string;
        title: string;
        description?: string;
        discountType: string;
        discountValue: number;
        isActive?: boolean;
        startDate?: string;
        endDate?: string;
        minOrderAmount?: number;
        maxUses?: number;
        targetProductId?: string;
        bannerImageKey?: string;
        bannerImageUrl?: string;
        activeDays?: string;
        startTime?: string;
        endTime?: string;
    }) {
        const generatedCode = data.code ? data.code.toUpperCase().replace(/\s+/g, '') : `BANNER_${Date.now()}`;

        // Check unique
        const exists = await this.prisma.promotion.findUnique({ where: { code: generatedCode } });
        if (exists) throw new ConflictException(`El código "${generatedCode}" ya existe`);

        return this.prisma.promotion.create({
            data: {
                code: generatedCode,
                title: data.title || 'Banner Sin Título',
                description: data.description,
                discountType: data.discountType as any,
                discountValue: data.discountValue || 0,
                isActive: data.isActive ?? true,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                activeDays: data.activeDays || null,
                startTime: data.startTime || null,
                endTime: data.endTime || null,
                minOrderAmount: data.minOrderAmount ?? 0,
                maxUses: data.maxUses ?? null,
                targetProductId: data.targetProductId || null,
                bannerImageKey: data.bannerImageKey || null,
                bannerImageUrl: data.bannerImageUrl || null,
            },
            include: { targetProduct: true },
        });
    }

    async update(id: string, data: any) {
        await this.findOne(id); // ensure exists

        const updateData: any = { ...data };
        if (data.code) updateData.code = data.code.toUpperCase().replace(/\s+/g, '');
        if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
        if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        if (data.activeDays !== undefined) updateData.activeDays = data.activeDays || null;
        if (data.startTime !== undefined) updateData.startTime = data.startTime || null;
        if (data.endTime !== undefined) updateData.endTime = data.endTime || null;

        return this.prisma.promotion.update({
            where: { id },
            data: updateData,
            include: { targetProduct: true },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.promotion.delete({ where: { id } });
    }

    async redeemCode(code: string) {
        const promo = await this.findByCode(code); // validates

        // Increment usage
        await this.prisma.promotion.update({
            where: { id: promo.id },
            data: { currentUses: { increment: 1 } },
        });

        this.logger.log(`[Promo] Code "${code}" redeemed. Uses: ${promo.currentUses + 1}/${promo.maxUses || '∞'}`);
        return promo;
    }
}
