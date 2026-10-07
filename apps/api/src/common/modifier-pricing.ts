import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const MAX_QTY = 99;

export function validQuantity(raw: unknown): number {
    const qty = Number(raw ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        throw new BadRequestException(`Cantidad inválida (1 a ${MAX_QTY})`);
    }
    return qty;
}

function selectedOptionIds(modifiers: any): string[] {
    const ids: string[] = [];
    for (const group of modifiers?.dynamicSelections || []) {
        for (const opt of group?.selectedOptions || []) if (opt?.id) ids.push(String(opt.id));
        for (const id of group?.selectedOptionIds || []) if (id) ids.push(String(id));
    }
    return ids;
}

/**
 * Suma de extras de cada ítem según los precios guardados en la base.
 * El precio que manda el cliente se ignora: puede venir desactualizado o manipulado.
 */
export async function modifierExtrasByItem(prisma: PrismaService, items: any[]): Promise<number[]> {
    const perItem = (items || []).map((item) => selectedOptionIds(item?.modifiers));
    const all = [...new Set(perItem.flat())];
    const prices = new Map<string, number>();
    if (all.length) {
        const options = await prisma.modifierOption.findMany({
            where: { id: { in: all } },
            select: { id: true, priceAdjustment: true },
        });
        for (const o of options) prices.set(o.id, Math.max(0, Number(o.priceAdjustment) || 0));
    }
    return perItem.map((ids) => ids.reduce((sum, id) => sum + (prices.get(id) ?? 0), 0));
}
