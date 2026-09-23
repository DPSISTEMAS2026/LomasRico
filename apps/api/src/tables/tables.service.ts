import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecipeResolverService } from '../recipe-engineering/recipe-resolver.service';

const TABLE_COUNT = 5;

@Injectable()
export class TablesService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private recipeResolver: RecipeResolverService,
    ) {}

    async onModuleInit() {
        await this.ensureTables();
    }

    private saleInclude() {
        return {
            items: {
                include: {
                    sellingProduct: true,
                    productVariant: true,
                    recipeSnapshot: true,
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
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'salon-guests',hypothesisId:'G1',location:'tables.service.ts:ensureTables',message:'dining tables ready',data:{count:TABLE_COUNT},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
        const tables = await (this.prisma as any).diningTable.findMany({
            where: { isActive: true },
            orderBy: { number: 'asc' },
            include: {
                guests: {
                    where: { isActive: true },
                    orderBy: { seat: 'asc' },
                },
            },
        });
        const openSales = await (this.prisma as any).sale.findMany({
            where: this.openSaleWhere({ tableId: { in: tables.map((t: any) => t.id) } }),
            include: this.saleInclude(),
        });
        const extras = await this.loadQrExtras(tables.map((t: any) => t.id));
        return tables.map((table: any) => this.decorateTable(table, openSales, extras));
    }

    async getTable(tableId: string) {
        const table = await (this.prisma as any).diningTable.findUnique({
            where: { id: tableId },
            include: {
                guests: {
                    where: { isActive: true },
                    orderBy: { seat: 'asc' },
                },
            },
        });
        if (!table) throw new NotFoundException('Mesa no existe');
        const openSales = await (this.prisma as any).sale.findMany({
            where: this.openSaleWhere({ tableId }),
            include: this.saleInclude(),
        });
        const extras = await this.loadQrExtras([tableId]);
        return this.decorateTable(table, openSales, extras);
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
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'H1',location:'tables.service.ts:loadQrExtras',message:'qr extras loaded',data:{tableCount:tableIds.length,billFlags:billRows.filter((r:any)=>r.billRequest).length,claimed:claims.size},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e: any) {
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'H1',location:'tables.service.ts:loadQrExtras',message:'qr extras failed',data:{error:String(e?.message||e)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        }
        return { bills, claims };
    }

    private decorateTable(table: any, openSales: any[], extras: { bills: Map<string, any>; claims: Map<string, string> }) {
        const guests = (table.guests || []).map((guest: any) => {
            const openSale = openSales.find((s) => s.guestId === guest.id) || null;
            const { claimToken, ...safeGuest } = guest;
            return { ...safeGuest, openSale, claimed: !!(claimToken || extras.claims.get(guest.id)) };
        });
        const openTotal = guests.reduce((sum: number, g: any) => sum + Number(g.openSale?.total || 0), 0);
        return {
            ...table,
            billRequest: extras.bills.get(table.id) || table.billRequest || null,
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
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'salon-guests',hypothesisId:'G2',location:'tables.service.ts:addGuest',message:'guest added',data:{tableNumber:table.number,seat,guestId:guest.id,hasName:!!dto.name?.trim(),nameLen:(dto.name||'').trim().length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
            include: this.saleInclude(),
        });
    }

    private async nextSaleCode() {
        for (let attempt = 0; attempt < 5; attempt++) {
            const lastSale = await (this.prisma as any).sale.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { code: true },
            });
            let nextNumber = 1;
            if (lastSale?.code) {
                const match = String(lastSale.code).match(/\d+/);
                if (match) nextNumber = parseInt(match[0], 10) + 1 + attempt;
            }
            const code = `#${nextNumber.toString().padStart(4, '0')}`;
            const exists = await (this.prisma as any).sale.findUnique({ where: { code } });
            if (!exists) return code;
        }
        return `#${Date.now().toString().slice(-6)}`;
    }

    private async createOpenSale(guest: any, extras: any = {}) {
        const code = await this.nextSaleCode();
        return (this.prisma as any).sale.create({
            data: {
                code,
                channel: 'POS',
                status: 'PENDING',
                total: 0,
                paymentStatus: 'PENDING',
                fulfillmentType: 'DINE_IN',
                tableId: guest.tableId,
                guestId: guest.id,
                shiftId: extras.shiftId || undefined,
                userId: extras.userId || undefined,
                note: extras.note || guest.name,
            },
            include: this.saleInclude(),
        });
    }

    private async appendItems(saleId: string, items: any[]) {
        for (const itemDto of items || []) {
            if (!itemDto.sellingProductId) {
                throw new BadRequestException('Cada ítem necesita sellingProductId');
            }
            const product = await this.prisma.sellingProduct.findUnique({
                where: { id: itemDto.sellingProductId },
            });
            if (!product) throw new BadRequestException(`Producto no encontrado: ${itemDto.sellingProductId}`);

            const price = Number(product.price);
            const saleItem = await (this.prisma as any).saleItem.create({
                data: {
                    saleId,
                    sellingProductId: product.id,
                    quantity: itemDto.quantity || 1,
                    priceUnit: price,
                    modifiers: itemDto.modifiers || undefined,
                },
            });

            try {
                const bom = await this.recipeResolver.resolveBom(product.id, itemDto.modifiers || {}, false);
                await (this.prisma as any).recipeSnapshot.create({
                    data: {
                        saleItemId: saleItem.id,
                        resolvedBoM: JSON.parse(JSON.stringify(bom)),
                        costSnapshot: 0,
                        priceSnapshot: price,
                        costBreakdown: {},
                    },
                });
            } catch {
                // Receta opcional mientras el inventario está en pausa
            }
        }
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
            include: this.saleInclude(),
        });
    }

    async addItemsToGuest(tableId: string, guestId: string, dto: any) {
        const guest = await this.requireGuest(tableId, guestId);
        let sale = await this.getOpenSaleForGuest(guestId);
        if (!sale) sale = await this.createOpenSale(guest, dto);
        if (dto.items?.length) await this.appendItems(sale.id, dto.items);
        return this.recalcTotal(sale.id, dto.discount, dto.discountType);
    }

    async sendGuestToKitchen(tableId: string, guestId: string, dto: any = {}) {
        if (dto.items?.length) {
            await this.addItemsToGuest(tableId, guestId, dto);
        }
        const sale = await this.getOpenSaleForGuest(guestId);
        if (!sale) throw new BadRequestException('Este comensal no tiene platos');

        const unsent = sale.items.filter((item: any) => !item.sentToKitchenAt);
        if (!unsent.length) throw new BadRequestException('No hay platos nuevos para enviar a cocina');

        const guest = sale.guest;
        const batchNumber = (sale.kitchenTickets?.length || 0) + 1;
        const label = `MESA ${sale.table?.number ?? ''} · ${guest?.name || 'Comensal'}`;
        const ticket = await (this.prisma as any).kitchenTicket.create({
            data: {
                saleId: sale.id,
                batchNumber,
                label,
                itemIds: unsent.map((item: any) => item.id),
                status: 'PREPARING',
                startTime: new Date(),
            },
        });

        await (this.prisma as any).saleItem.updateMany({
            where: { id: { in: unsent.map((item: any) => item.id) } },
            data: { sentToKitchenAt: new Date(), kitchenTicketId: ticket.id },
        });

        if (sale.status === 'PENDING') {
            await (this.prisma as any).sale.update({
                where: { id: sale.id },
                data: { status: 'PREPARING' },
            });
        }

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-flow',hypothesisId:'K5',location:'tables.service.ts:sendGuestToKitchen',message:'mesa ticket skips preparar',data:{label,itemCount:unsent.length,status:'PREPARING'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return { sale: await this.getSale(sale.id), ticket, table: await this.getTable(tableId) };
    }

    async payGuest(tableId: string, guestId: string, dto: any) {
        if (dto.items?.length) {
            await this.addItemsToGuest(tableId, guestId, dto);
        }
        let sale = await this.getOpenSaleForGuest(guestId);
        if (!sale) throw new BadRequestException('Este comensal no tiene cuenta abierta');

        if (sale.items.some((item: any) => !item.sentToKitchenAt)) {
            await this.sendGuestToKitchen(tableId, guestId, {});
            sale = await this.getOpenSaleForGuest(guestId);
        }

        const paymentMethod = dto.paymentMethod === 'MP' ? 'MERCADO_PAGO' : (dto.paymentMethod || 'CASH');
        const paid = await (this.prisma as any).sale.update({
            where: { id: sale.id },
            data: {
                paymentMethod,
                paymentStatus: 'APPROVED',
                status: 'CONFIRMED',
                shiftId: dto.shiftId || sale.shiftId,
            },
            include: this.saleInclude(),
        });

        if (paid.shiftId) {
            await (this.prisma as any).cashTransaction.create({
                data: {
                    shiftId: paid.shiftId,
                    type: 'SALE_INCOME',
                    amount: paid.total,
                    description: `Salón ${paid.code} Mesa ${sale.table?.number} ${sale.guest?.name || ''} (${paymentMethod})`,
                    relatedSaleId: paid.id,
                },
            });
        }

        await (this.prisma as any).tableGuest.update({
            where: { id: guestId },
            data: { isActive: false },
        });
        await this.prisma.$executeRawUnsafe(
            `UPDATE "TableGuest" SET "claimToken" = NULL WHERE id = $1`,
            guestId,
        );
        await this.clearBillRequestIfSettled(tableId, guestId);

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'salon-bill',hypothesisId:'H-PAY',location:'tables.service.ts:payGuest',message:'guest paid and qr revoked',data:{tableId,guestId,saleCode:paid.code,total:Number(paid.total)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return { sale: paid, table: await this.getTable(tableId) };
    }

    async payAll(tableId: string, dto: any = {}) {
        const table = await this.getTable(tableId);
        const unpaid = table.guests.filter((g: any) => g.openSale);
        if (!unpaid.length) throw new BadRequestException('La mesa no tiene cuentas abiertas');
        const paid = [];
        for (const guest of unpaid) {
            const result = await this.payGuest(tableId, guest.id, dto);
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
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'H5',location:'tables.service.ts:requestBill',message:'bill requested',data:{mode,hasGuestId:!!dto.guestId},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'H2',location:'tables.service.ts:getPublicTable',message:'public table ready',data:{number:full.number,occupied:full.occupied,guestCount:full.guestCount,hasBillRequest:!!full.billRequest},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'Q1',location:'tables.service.ts:openParty',message:'qr party opened',data:{tableNumber:number,guestCount:created.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'salon-bill',hypothesisId:'H-CLAIM',location:'tables.service.ts:claimGuest',message:'guest claimed',data:{forced:!!dto.force,hadExisting:!!existing},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
        if (!remaining.length || forThisGuest) {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DiningTable" SET "billRequest" = NULL WHERE id = $1`,
                tableId,
            );
        }
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

    async publicAddItems(guestId: string, claimToken: string, dto: any) {
        const guest = await this.assertClaim(guestId, claimToken);
        return this.addItemsToGuest(guest.tableId, guestId, dto);
    }

    async publicSendKitchen(guestId: string, claimToken: string, dto: any = {}) {
        const guest = await this.assertClaim(guestId, claimToken);
        return this.sendGuestToKitchen(guest.tableId, guestId, dto);
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
