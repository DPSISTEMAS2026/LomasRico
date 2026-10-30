import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { cleanModifierLabel } from './clean-label';

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
 * Valida las opciones elegidas contra la base y devuelve la suma de extras de cada ítem.
 * Precio y nombres vienen de la base: lo que manda el cliente puede venir desactualizado o manipulado.
 * Reescribe `dynamicSelections` del ítem con los nombres reales para que cocina vea lo que se cobró.
 */
export async function modifierExtrasByItem(prisma: PrismaService, items: any[]): Promise<number[]> {
    const rows = items || [];
    const perItem = rows.map((item) => selectedOptionIds(item?.modifiers));
    const all = [...new Set(perItem.flat())];
    if (!all.length) return rows.map(() => 0);

    const options = await prisma.modifierOption.findMany({
        where: { id: { in: all } },
        select: {
            id: true, name: true, priceAdjustment: true, isActive: true, modifierGroupId: true,
            modifierGroup: { select: { id: true, name: true, displayName: true, type: true, maxSelections: true, priceIsFinal: true } },
        },
    });
    const optionById = new Map(options.map((o) => [o.id, o]));

    const productIds = [...new Set(rows.map((item) => item?.sellingProductId).filter(Boolean))] as string[];
    const links = productIds.length
        ? await prisma.productModifier.findMany({
            where: { sellingProductId: { in: productIds } },
            select: { sellingProductId: true, modifierGroupId: true, overrideMax: true },
        })
        : [];
    const linkKey = (productId: string, groupId: string) => `${productId}:${groupId}`;
    const linkByKey = new Map(links.map((l) => [linkKey(l.sellingProductId, l.modifierGroupId), l]));

    return rows.map((item, index) => {
        const productId: string | undefined = item?.sellingProductId;
        const countByGroup = new Map<string, Set<string>>();
        let extras = 0;
        for (const id of new Set(perItem[index])) {
            const opt = optionById.get(id);
            if (!opt || !opt.isActive) {
                throw new BadRequestException('Una opción elegida ya no está disponible. Vuelve a armar el plato.');
            }
            if (productId && !linkByKey.has(linkKey(productId, opt.modifierGroupId))) {
                throw new BadRequestException('Opción no válida para este producto. Vuelve a armar el plato.');
            }
            const set = countByGroup.get(opt.modifierGroupId) || new Set<string>();
            set.add(id);
            countByGroup.set(opt.modifierGroupId, set);
            extras += Math.max(0, Number(opt.priceAdjustment) || 0);
        }

        for (const [groupId, ids] of countByGroup) {
            const group = optionById.get([...ids][0])!.modifierGroup;
            const override = productId ? linkByKey.get(linkKey(productId, groupId))?.overrideMax : null;
            const max = group.type === 'SINGLE_SELECT' ? 1 : Number(override ?? group.maxSelections) || 0;
            if (max > 0 && ids.size > max) {
                throw new BadRequestException(`Demasiadas opciones en "${cleanModifierLabel(group.displayName || group.name)}" (máximo ${max})`);
            }
        }

        const selections = item?.modifiers?.dynamicSelections;
        if (Array.isArray(selections)) {
            item.modifiers.dynamicSelections = selections.map((sel: any) => {
                const ids = [
                    ...(sel?.selectedOptions || []).map((o: any) => o?.id),
                    ...(sel?.selectedOptionIds || []),
                ].filter(Boolean).map(String);
                const real = [...new Set(ids)].map((id) => optionById.get(id)!);
                const group = real[0]?.modifierGroup;
                if (!group) return { ...sel, selectedOptions: [] };
                return {
                    ...sel,
                    groupId: group.id,
                    groupName: cleanModifierLabel(group.displayName || group.name),
                    priceIsFinal: group.priceIsFinal === true,
                    selectedOptions: real.map((o) => ({ id: o.id, name: o.name, price: Math.max(0, Number(o.priceAdjustment) || 0) })),
                };
            });
        }
        return extras;
    });
}
