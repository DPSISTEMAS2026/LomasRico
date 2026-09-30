import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecipeResolverService } from '../recipe-engineering/recipe-resolver.service';
import { isInventoryEnforced } from '../config/flags';

const TABLE_COUNT = 5;

@Injectable()
export class TablesService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private recipeResolver: RecipeResolverService,
    ) {}

    async onModuleInit() {
        try {
            await this.ensureTables();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn('ensureTables skipped:', message);
        }
    }

    private saleInclude(full = false) {
        return {
            items: {
                include: {
                    sellingProduct: full ? true : { select: { id: true, name: true, price: true, category: true } },
                    productVariant: full,
                    recipeSnapshot: full,
                },
                orderBy: { id: 'asc' as const },
            },
            table: true,
            guest: true,
            kitchenTickets: { orderBy: { batchNumber: 'asc' as const } },
        };
    }

    async ensureTables() {
        for (let n = 1; n <= TABLE_COUNT; n++) {
            await (this.prisma as any).diningTable.upsert({
                where: { number: n },
                update: { isActive: true, name: `Mesa ${n}` },
                create: { number: n, name: `Mesa ${n}` },
            });
        }
    }

    private openSaleWhere(extra: any = {}) {
        return {
            fulfillmentType: 'DINE_IN',
            paymentStatus: 'PENDING',
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
            ...extra,
        };
    }

    async list() {
        const [tables, openSales] = await Promise.all([
            (this.prisma as any).diningTable.findMany({
                where: { isActive: true },
                orderBy: { number: 'asc' },
                select: {
                    id: true,
                    number: true,
                    name: true,
                    billRequest: true,
                    guests: {
                        where: { isActive: true },
                        orderBy: { seat: 'asc' },
                        select: { id: true, name: true, seat: true, isActive: true, claimToken: true, createdAt: true },
                    },
                },
            }),
            (this.prisma as any).sale.findMany({
                where: this.openSaleWhere(),
                select: { id: true, total: true, guestId: true, tableId: true },
            }),
        ]);
        const result = tables.map((table: any) => this.decorateTable(table, openSales));
        return result;
    }

    async getTable(tableId: string) {
        const t0 = Date.now();
        const [table, openSales] = await Promise.all([
            (this.prisma as any).diningTable.findUnique({
                where: { id: tableId },
                select: {
                    id: true,
                    number: true,
                    name: true,
                    billRequest: true,
                    guests: {
                        where: { isActive: true },
                        orderBy: { seat: 'asc' },
                        select: { id: true, name: true, seat: true, isActive: true, claimToken: true },
                    },
                },
            }),
            (this.prisma as any).sale.findMany({
                where: this.openSaleWhere({ tableId }),
                select: {
                    id: true,
                    total: true,
                    guestId: true,
                    tableId: true,
                    items: {
                        orderBy: { id: 'asc' },
                        select: {
                            id: true,
                            quantity: true,
                            priceUnit: true,
                            modifiers: true,
                            sentToKitchenAt: true,
                            sellingProductId: true,
                            sellingProduct: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
        ]);
        if (!table) throw new NotFoundException('Mesa no existe');
        const decorated = this.decorateTable(table, openSales);
        return decorated;
    }

    private async loadQrExtras(tableIds: string[]) {
        if (!tableIds.length) return { bills: new Map<string, any>(), claims: new Map<string, string>() };
        const bills = new Map<string, any>();
        const claims = new Map<string, string>();
        try {
            const placeholders = tableIds.map((_, i) => `$${i + 1}`).join(',');
            const billRows: any[] = await this.prisma.$queryRawUnsafe(
                `SELECT id, "billRequest" FROM "DiningTable" WHERE id IN (${placeholders})`,
                ...tableIds,
            );
            for (const row of billRows) bills.set(row.id, row.billRequest || null);
            const claimRows: any[] = await this.prisma.$queryRawUnsafe(
                `SELECT id, "claimToken" FROM "TableGuest" WHERE "tableId" IN (${placeholders}) AND "isActive" = true`,
                ...tableIds,
            );
            for (const row of claimRows) if (row.claimToken) claims.set(row.id, row.claimToken);
        } catch (e: any) {
        }
        return { bills, claims };
    }

    private decorateTable(table: any, openSales: any[]) {
        const guests = (table.guests || []).map((guest: any) => {
            const openSale = openSales.find((s) => s.guestId === guest.id) || null;
            const { claimToken, ...safeGuest } = guest;
            return { ...safeGuest, openSale, claimed: !!claimToken };
        });
        const openTotal = guests.reduce((sum: number, g: any) => sum + Number(g.openSale?.total || 0), 0);
        return {
            ...table,
            billRequest: table.billRequest || null,
            guests,
            guestCount: guests.length,
            openTotal,
            occupied: guests.length > 0,
        };
    }

    async addGuest(tableId: string, dto: any = {}) {
        const table = await (this.prisma as any).diningTable.findUnique({ where: { id: tableId } });
        if (!table) throw new NotFoundException('Mesa no existe');
        const last = await (this.prisma as any).tableGuest.findFirst({
            where: { tableId },
            orderBy: { seat: 'desc' },
        });
        const seat = (last?.seat || 0) + 1;
        const guest = await (this.prisma as any).tableGuest.create({
            data: {
                tableId,
                seat,
                name: dto.name?.trim() || `Comensal ${seat}`,
                isActive: true,
            },
        });
        return this.getTable(tableId);
    }

    async renameGuest(tableId: string, guestId: string, name: string) {
        const guest = await this.requireGuest(tableId, guestId);
        const clean = name.trim();
        if (!clean) throw new BadRequestException('Escribe el nombre del comensal');
        await (this.prisma as any).tableGuest.update({
            where: { id: guestId },
            data: { name: clean },
        });
        const open = await this.getOpenSaleForGuest(guestId);
        if (open) {
            const label = `MESA ${guest.table?.number ?? ''} · ${clean}`;
            await (this.prisma as any).sale.update({
                where: { id: open.id },
                data: { note: clean },
            });
            await (this.prisma as any).kitchenTicket.updateMany({
                where: { saleId: open.id },
                data: { label },
            });
        }
        return this.getTable(tableId);
    }

    async leaveGuest(tableId: string, guestId: string) {
        const guest = await this.requireGuest(tableId, guestId);
        const open = await this.getOpenSaleForGuest(guestId);
        if (open && Number(open.total) > 0) {
            throw new BadRequestException('Este comensal tiene cuenta abierta. Cobra antes de quitarlo.');
        }
        if (open) {
            await (this.prisma as any).sale.update({
                where: { id: open.id },
                data: { status: 'CANCELLED' },
            });
        }
        await (this.prisma as any).tableGuest.update({
            where: { id: guest.id },
            data: { isActive: false },
        });
        await this.prisma.$executeRawUnsafe(
            `UPDATE "TableGuest" SET "claimToken" = NULL WHERE id = $1`,
            guest.id,
        );
        await this.clearBillRequestIfSettled(tableId, guest.id);
        return this.getTable(tableId);
    }

    private async requireGuest(tableId: string, guestId: string) {
        const guest = await (this.prisma as any).tableGuest.findFirst({
            where: { id: guestId, tableId, isActive: true },
            include: { table: true },
        });
        if (!guest) throw new NotFoundException('Comensal no encontrado');
        return guest;
    }

    async getOpenSaleForGuest(guestId: string) {
        return (this.prisma as any).sale.findFirst({
            where: this.openSaleWhere({ guestId }),
            include: this.saleInclude(),
            orderBy: { createdAt: 'desc' },
        });
    }

    async getSale(saleId: string) {
        return (this.prisma as any).sale.findUnique({
            where: { id: saleId },
            include: this.saleInclude(true),
        });
    }

    private async nextSaleCode(client: any = this.prisma) {
        for (let attempt = 0; attempt < 5; attempt++) {
            const lastSale = await client.sale.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { code: true },
            });
            let nextNumber = 1;
            if (lastSale?.code) {
                const match = String(lastSale.code).match(/\d+/);
                if (match) nextNumber = parseInt(match[0], 10) + 1 + attempt;
            }
            const code = `#${nextNumber.toString().padStart(4, '0')}`;
            const exists = await client.sale.findUnique({ where: { code } });
            if (!exists) return code;
        }
        return `#${Date.now().toString().slice(-6)}`;
    }

    private async appendItems(saleId: string, items: any[]) {
        const rows = items || [];
        const ids = [...new Set(rows.map((item: any) => item.sellingProductId).filter(Boolean))];
        if (!ids.length) throw new BadRequestException('Cada ítem necesita sellingProductId');
        const products = await this.prisma.sellingProduct.findMany({
            where: { id: { in: ids as string[] } },
            select: { id: true, price: true },
        });
        const byId = new Map(products.map((p) => [p.id, p]));
        let added = 0;
        const created = [];
        for (const itemDto of rows) {
            const product = byId.get(itemDto.sellingProductId);
            if (!product) throw new BadRequestException(`Producto no encontrado: ${itemDto.sellingProductId}`);
            const extras = Number(
                (itemDto.modifiers?.dynamicSelections || []).reduce(
                    (sum: number, group: any) =>
                        sum + (group.selectedOptions || []).reduce((s: number, o: any) => s + Number(o.price || 0), 0),
                    0,
                ),
            );
            const price = Number(product.price) + extras;
            const quantity = itemDto.quantity || 1;
            added += price * quantity;
            created.push({
                saleId,
                sellingProductId: product.id,
                quantity,
                priceUnit: price,
                modifiers: itemDto.modifiers || undefined,
            });
        }
        await Promise.all(created.map((data) => (this.prisma as any).saleItem.create({ data })));
        return added;
    }

    private async recalcTotal(saleId: string, discount?: number, discountType?: string) {
        const items = await (this.prisma as any).saleItem.findMany({ where: { saleId } });
        let total = items.reduce((sum: number, item: any) => sum + Number(item.priceUnit) * item.quantity, 0);
        let discountValue = 0;
        if (discount && discount > 0) {
            discountValue = discountType === 'PERCENT' ? total * (discount / 100) : discount;
            total = Math.max(0, total - discountValue);
        }
        return (this.prisma as any).sale.update({
            where: { id: saleId },
            data: {
                total,
                discount: discountValue,
                discountType: discount ? (discountType || 'FIXED') : undefined,
            },
        });
    }

    async addItemsToGuest(tableId: string, guestId: string, dto: any, withTable = true) {
        const findOpen = (client: any) => client.sale.findFirst({
            where: this.openSaleWhere({ guestId }),
            select: { id: true },
            orderBy: { createdAt: 'desc' },
        });
        const [guest, existing] = await Promise.all([
            this.requireGuest(tableId, guestId),
            findOpen(this.prisma as any),
        ]);
        const sale = existing || await this.openSaleForGuestLocked(guest, dto, findOpen);
        const added = dto.items?.length ? await this.appendItems(sale.id, dto.items) : 0;
        if (dto.discount && dto.discount > 0) {
            await this.recalcTotal(sale.id, dto.discount, dto.discountType);
        } else if (added) {
            await (this.prisma as any).sale.update({
                where: { id: sale.id },
                data: { total: { increment: added } },
            });
        }
        return withTable ? this.getTable(tableId) : null;
    }

    private async openSaleForGuestLocked(guest: any, dto: any, findOpen: (client: any) => Promise<any>) {
        return (this.prisma as any).$transaction(async (tx: any) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${guest.id}))`;
            const again = await findOpen(tx);
            if (again) return again;
            const code = await this.nextSaleCode(tx);
            return tx.sale.create({
                data: {
                    code,
                    channel: 'POS',
                    status: 'PENDING',
                    total: 0,
                    paymentStatus: 'PENDING',
                    fulfillmentType: 'DINE_IN',
                    tableId: guest.tableId,
                    guestId: guest.id,
                    shiftId: dto.shiftId || undefined,
                    userId: dto.userId || undefined,
                    note: dto.note || guest.name,
                },
                select: { id: true },
            });
        });
    }

    async sendGuestToKitchen(tableId: string, guestId: string, dto: any = {}, withTable = true) {
        if (dto.items?.length) {
            await this.addItemsToGuest(tableId, guestId, dto, false);
        }
        const sale = await (this.prisma as any).sale.findFirst({
            where: this.openSaleWhere({ guestId }),
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                code: true,
                status: true,
                table: { select: { number: true } },
                guest: { select: { name: true } },
            },
        });
        if (!sale) throw new BadRequestException('Este comensal no tiene platos');

        const label = `MESA ${sale.table?.number ?? ''} · ${sale.guest?.name || 'Comensal'}`;
        const ticket = await (this.prisma as any).$transaction(async (tx: any) => {
            const claimed: { id: string }[] = await tx.$queryRaw`
                UPDATE "SaleItem" SET "sentToKitchenAt" = now()
                WHERE "saleId" = ${sale.id} AND "sentToKitchenAt" IS NULL
                RETURNING id`;
            if (!claimed.length) throw new BadRequestException('No hay platos nuevos para enviar a cocina');
            const itemIds = claimed.map((row) => row.id);
            const batches = await tx.kitchenTicket.count({ where: { saleId: sale.id } });
            const created = await tx.kitchenTicket.create({
                data: {
                    saleId: sale.id,
                    batchNumber: batches + 1,
                    label,
                    itemIds,
                    status: 'PREPARING',
                    startTime: new Date(),
                },
            });
            await tx.saleItem.updateMany({ where: { id: { in: itemIds } }, data: { kitchenTicketId: created.id } });
            if (sale.status === 'PENDING') {
                await tx.sale.update({ where: { id: sale.id }, data: { status: 'PREPARING' } });
            }
            return created;
        });

        return {
            sale: { id: sale.id, code: sale.code },
            ticket,
            table: withTable ? await this.getTable(tableId) : null,
        };
    }

    private async currentShiftId(): Promise<string | null> {
        const shift = await (this.prisma as any).cashShift.findFirst({
            where: { status: 'OPEN' },
            orderBy: { openingTime: 'desc' },
            select: { id: true },
        });
        return shift?.id || null;
    }

    async payGuest(tableId: string, guestId: string, dto: any, settle = true) {
        if (dto.items?.length) {
            await this.addItemsToGuest(tableId, guestId, dto, false);
        }
        const open = await (this.prisma as any).sale.findFirst({
            where: this.openSaleWhere({ guestId }),
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                shiftId: true,
                items: { where: { sentToKitchenAt: null }, select: { id: true }, take: 1 },
            },
        });
        if (!open) throw new BadRequestException('Este comensal no tiene cuenta abierta');

        if (open.items.length) {
            try {
                await this.sendGuestToKitchen(tableId, guestId, {}, false);
            } catch (e) {
                if (!(e instanceof BadRequestException)) throw e;
            }
        }

        const shiftId = dto.shiftId || open.shiftId || await this.currentShiftId();
        const paymentMethod = dto.paymentMethod === 'MP' ? 'MERCADO_PAGO' : (dto.paymentMethod || 'CASH');
        const paid = await (this.prisma as any).$transaction(async (tx: any) => {
            const res = await tx.sale.updateMany({
                where: { id: open.id, paymentStatus: 'PENDING' },
                data: { paymentMethod, paymentStatus: 'APPROVED', status: 'CONFIRMED', shiftId: shiftId || undefined },
            });
            if (res.count !== 1) throw new BadRequestException('Esta cuenta ya fue cobrada');
            const sale = await tx.sale.findUnique({
                where: { id: open.id },
                select: {
                    id: true,
                    code: true,
                    total: true,
                    shiftId: true,
                    table: { select: { number: true } },
                    guest: { select: { name: true } },
                },
            });
            if (sale.shiftId) {
                await tx.cashTransaction.create({
                    data: {
                        shiftId: sale.shiftId,
                        type: 'SALE_INCOME',
                        amount: sale.total,
                        description: `Salón ${sale.code} Mesa ${sale.table?.number} ${sale.guest?.name || ''} (${paymentMethod})`,
                        relatedSaleId: sale.id,
                    },
                });
            }
            await tx.$executeRaw`
                UPDATE "TableGuest" SET "isActive" = false, "claimToken" = NULL, "updatedAt" = now()
                WHERE id = ${guestId}`;
            return sale;
        });

        const table = settle ? await this.clearBillRequestIfSettled(tableId, guestId) : null;
        return { sale: paid, table };
    }

    async payAll(tableId: string, dto: any = {}) {
        const { items, discount, discountType, ...payDto } = dto || {};
        const table = await this.getTable(tableId);
        const unpaid = table.guests.filter((g: any) => g.openSale);
        if (!unpaid.length) throw new BadRequestException('La mesa no tiene cuentas abiertas');
        const paid = [];
        for (const guest of unpaid) {
            const result = await this.payGuest(tableId, guest.id, payDto, false);
            paid.push({ guestId: guest.id, name: guest.name, sale: result.sale });
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "DiningTable" SET "billRequest" = NULL WHERE id = $1`,
            tableId,
        );
        return { table: await this.getTable(tableId), paid, grandTotal: table.openTotal };
    }

    async getBill(tableId: string) {
        const table = await this.getTable(tableId);
        return {
            id: table.id,
            number: table.number,
            billRequest: table.billRequest || null,
            grandTotal: table.openTotal,
            guests: table.guests.map((g: any) => ({
                id: g.id,
                name: g.name,
                total: Number(g.openSale?.total || 0),
                items: (g.openSale?.items || []).map((item: any) => ({
                    id: item.id,
                    name: item.sellingProduct?.name || 'Producto',
                    quantity: item.quantity,
                    price: Number(item.priceUnit),
                    sentToKitchen: !!item.sentToKitchenAt,
                    modifiers: item.modifiers || {},
                })),
            })),
        };
    }

    async requestBill(tableId: string, dto: any = {}) {
        const mode = dto.mode === 'GUEST' ? 'GUEST' : 'ALL';
        let guestName: string | null = dto.guestName || null;
        if (dto.guestId) {
            const guest = await (this.prisma as any).tableGuest.findUnique({ where: { id: dto.guestId } });
            guestName = guest?.name || guestName;
        }
        const payload = JSON.stringify({
            mode,
            guestId: dto.guestId || null,
            guestName,
            at: new Date().toISOString(),
        });
        await this.prisma.$executeRawUnsafe(
            `UPDATE "DiningTable" SET "billRequest" = $1::jsonb WHERE id = $2`,
            payload,
            tableId,
        );
        return this.getBill(tableId);
    }

    async findByNumber(number: number) {
        const table = await (this.prisma as any).diningTable.findUnique({ where: { number } });
        if (!table) throw new NotFoundException('Mesa no existe');
        return table;
    }

    async getPublicTable(number: number) {
        const table = await this.findByNumber(number);
        const full = await this.getTable(table.id);
        return {
            id: full.id,
            number: full.number,
            occupied: full.occupied,
            guestCount: full.guestCount,
            openTotal: full.openTotal,
            billRequest: full.billRequest || null,
            guests: full.guests.map((g: any) => ({
                id: g.id,
                name: g.name,
                claimed: !!g.claimed,
                total: Number(g.openSale?.total || 0),
            })),
        };
    }

    async openParty(number: number, names: string[]) {
        const table = await this.findByNumber(number);
        const current = await this.getTable(table.id);
        if (current.guestCount > 0) {
            throw new BadRequestException('Esta mesa ya tiene comensales. Elige tu nombre o agrégate.');
        }
        const clean = (names || []).map((n) => String(n || '').trim()).filter(Boolean);
        if (!clean.length) throw new BadRequestException('Escribe al menos un nombre');
        if (clean.length > 8) throw new BadRequestException('Máximo 8 comensales por mesa');
        const created: any[] = [];
        for (const name of clean) {
            const last = await (this.prisma as any).tableGuest.findFirst({
                where: { tableId: table.id },
                orderBy: { seat: 'desc' },
            });
            const seat = (last?.seat || 0) + 1;
            const guest = await (this.prisma as any).tableGuest.create({
                data: { tableId: table.id, seat, name, isActive: true },
            });
            created.push({ id: guest.id, name: guest.name, claimToken: null, seat });
        }
        return { table: await this.getPublicTable(number), guests: created };
    }

    async claimGuest(number: number, guestId: string, dto: { currentToken?: string; force?: boolean } = {}) {
        const table = await this.findByNumber(number);
        const guest = await (this.prisma as any).tableGuest.findFirst({
            where: { id: guestId, tableId: table.id, isActive: true },
        });
        if (!guest) throw new NotFoundException('Comensal no encontrado');
        const rows: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT "claimToken" FROM "TableGuest" WHERE id = $1`,
            guest.id,
        );
        const existing = rows[0]?.claimToken;
        if (existing && dto.currentToken && dto.currentToken === existing) {
            return { id: guest.id, name: guest.name, claimToken: existing, alreadyClaimed: false };
        }
        if (existing && !dto.force) {
            return { id: guest.id, name: guest.name, claimToken: null, alreadyClaimed: true };
        }
        const token = crypto.randomUUID();
        await this.prisma.$executeRawUnsafe(
            `UPDATE "TableGuest" SET "claimToken" = $1 WHERE id = $2`,
            token,
            guest.id,
        );
        return { id: guest.id, name: guest.name, claimToken: token, alreadyClaimed: false };
    }

    async joinGuest(number: number, name: string) {
        const table = await this.findByNumber(number);
        const added = await this.addGuest(table.id, { name });
        const newest = added.guests[added.guests.length - 1];
        return this.claimGuest(number, newest.id, { force: true });
    }

    async publicSession(guestId: string, claimToken: string) {
        const guest = await (this.prisma as any).tableGuest.findUnique({
            where: { id: guestId },
            include: { table: true },
        });
        if (!guest) return { valid: false, reason: 'GONE' };
        if (!guest.isActive) {
            return { valid: false, reason: 'PAID', name: guest.name, tableNumber: guest.table?.number };
        }
        const rows: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT "claimToken" FROM "TableGuest" WHERE id = $1`,
            guestId,
        );
        if (!claimToken || rows[0]?.claimToken !== claimToken) {
            return { valid: false, reason: 'REPLACED', name: guest.name, tableNumber: guest.table?.number };
        }
        return {
            valid: true,
            name: guest.name,
            tableNumber: guest.table?.number,
            tableId: guest.tableId,
        };
    }

    private async clearBillRequestIfSettled(tableId: string, guestId?: string) {
        const table = await this.getTable(tableId);
        const remaining = table.guests.filter((g: any) => g.openSale);
        const req = table.billRequest;
        const forThisGuest = !!(req && guestId && req.guestId === guestId);
        if (req && (!remaining.length || forThisGuest)) {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DiningTable" SET "billRequest" = NULL WHERE id = $1`,
                tableId,
            );
            return { ...table, billRequest: null };
        }
        return table;
    }

    async assertClaim(guestId: string, claimToken: string) {
        const guest = await (this.prisma as any).tableGuest.findFirst({
            where: { id: guestId, isActive: true },
            include: { table: true },
        });
        if (!guest) throw new NotFoundException('Comensal no encontrado');
        const rows: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT "claimToken" FROM "TableGuest" WHERE id = $1`,
            guestId,
        );
        if (!claimToken || rows[0]?.claimToken !== claimToken) {
            throw new BadRequestException('Este celular no está asociado a ese comensal');
        }
        return guest;
    }

    private publicItemsOnly(dto: any = {}) {
        return { items: Array.isArray(dto?.items) ? dto.items : undefined, note: dto?.note };
    }

    async publicAddItems(guestId: string, claimToken: string, dto: any) {
        const guest = await this.assertClaim(guestId, claimToken);
        return this.addItemsToGuest(guest.tableId, guestId, this.publicItemsOnly(dto));
    }

    async publicSendKitchen(guestId: string, claimToken: string, dto: any = {}) {
        const guest = await this.assertClaim(guestId, claimToken);
        return this.sendGuestToKitchen(guest.tableId, guestId, this.publicItemsOnly(dto));
    }

    async publicRequestBill(number: number, dto: any = {}) {
        const table = await this.findByNumber(number);
        return this.requestBill(table.id, dto);
    }

    async publicBill(number: number) {
        const table = await this.findByNumber(number);
        return this.getBill(table.id);
    }
}
