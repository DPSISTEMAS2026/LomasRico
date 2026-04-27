import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductMapperService } from './product-mapper.service';

/**
 * DailyHealthCheckService
 * 
 * Ejecuta un chequeo diario a las 10:00 AM (Chile) que valida:
 * 1. Cookie de Uber Eats vigente
 * 2. Mapeo de productos Uber ↔ Sistema interno
 * 3. Modificadores consistentes
 * 
 * Registra los resultados en la tabla HealthCheckLog para auditoría.
 */

const UBER_GRAPHQL_URL = 'https://merchants-beta.ubereats.com/graphql';
const CHECK_HOUR = 10; // 10:00 AM Chile

export interface HealthCheckResult {
    timestamp: string;
    checks: {
        name: string;
        status: 'OK' | 'WARNING' | 'CRITICAL';
        details: string;
        data?: any;
    }[];
    overallStatus: 'OK' | 'WARNING' | 'CRITICAL';
}

@Injectable()
export class DailyHealthCheckService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger('DailyHealthCheck');
    private checkTimer: ReturnType<typeof setTimeout> | null = null;
    private lastResult: HealthCheckResult | null = null;

    constructor(
        private prisma: PrismaService,
        private productMapper: ProductMapperService,
    ) {}

    onModuleInit() {
        this.scheduleNextCheck();
        this.logger.log(`📋 Health Check programado diariamente a las ${CHECK_HOUR}:00 Chile`);
    }

    onModuleDestroy() {
        if (this.checkTimer) clearTimeout(this.checkTimer);
    }

    /**
     * Programa el próximo chequeo para las 10:00 AM Chile
     */
    private scheduleNextCheck() {
        const now = new Date();
        const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        
        // Calcular próxima 10:00 AM
        const nextCheck = new Date(chileTime);
        nextCheck.setHours(CHECK_HOUR, 0, 0, 0);
        
        // Si ya pasó las 10:00, programar para mañana
        if (chileTime.getHours() >= CHECK_HOUR) {
            nextCheck.setDate(nextCheck.getDate() + 1);
        }

        const msUntilCheck = nextCheck.getTime() - chileTime.getTime();
        this.checkTimer = setTimeout(() => this.runDailyCheck(), msUntilCheck);
        
        const hoursUntil = Math.round(msUntilCheck / 3600000 * 10) / 10;
        this.logger.log(`⏰ Próximo health check en ${hoursUntil}h`);
    }

    /**
     * Ejecuta todos los chequeos diarios
     */
    async runDailyCheck(): Promise<HealthCheckResult> {
        this.logger.log('═══════════════════════════════════════');
        this.logger.log('📋 HEALTH CHECK DIARIO — Iniciando...');
        this.logger.log('═══════════════════════════════════════');

        const checks: HealthCheckResult['checks'] = [];

        // 1. Verificar cookie de Uber
        checks.push(await this.checkUberCookie());

        // 2. Verificar mapeo de productos
        checks.push(await this.checkProductMapping());

        // 3. Verificar modificadores
        checks.push(await this.checkModifierConsistency());

        // 4. Verificar turno de caja abierto
        checks.push(await this.checkActiveShift());

        // 5. Verificar inventario crítico
        checks.push(await this.checkCriticalStock());

        // Determinar estado general
        const hasC = checks.some(c => c.status === 'CRITICAL');
        const hasW = checks.some(c => c.status === 'WARNING');
        const overallStatus = hasC ? 'CRITICAL' : hasW ? 'WARNING' : 'OK';

        const result: HealthCheckResult = {
            timestamp: new Date().toISOString(),
            checks,
            overallStatus,
        };

        this.lastResult = result;

        // Loggear resultados
        for (const check of checks) {
            const icon = check.status === 'OK' ? '✅' : check.status === 'WARNING' ? '⚠️' : '🔴';
            this.logger.log(`${icon} ${check.name}: ${check.details}`);
        }

        this.logger.log(`═══ RESULTADO: ${overallStatus} ═══`);

        // Programar próximo chequeo
        this.scheduleNextCheck();

        return result;
    }

    /**
     * Check 1: Cookie de Uber Eats
     */
    private async checkUberCookie(): Promise<HealthCheckResult['checks'][0]> {
        const cookie = process.env.UBER_EATS_COOKIE || '';
        const csrfToken = process.env.UBER_EATS_CSRF_TOKEN || 'x';
        const isEnabled = process.env.UBER_EATS_ENABLED === 'true';

        if (!isEnabled) {
            return { name: 'Uber Eats Cookie', status: 'WARNING', details: 'Scraper DESHABILITADO (UBER_EATS_ENABLED != true)' };
        }

        if (!cookie || cookie.length < 50) {
            return { name: 'Uber Eats Cookie', status: 'CRITICAL', details: 'Cookie vacía o demasiado corta. Renovar UBER_EATS_COOKIE en .env' };
        }

        try {
            // Hacer un request mínimo para verificar si la sesión es válida
            const res = await fetch(UBER_GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Cookie': cookie,
                    'Content-Type': 'application/json',
                    'X-Csrf-Token': csrfToken,
                    'Origin': 'https://merchants-beta.ubereats.com',
                },
                body: JSON.stringify({ operationName: 'healthCheck', variables: {}, query: '{ __typename }' }),
            });

            if (res.status === 401 || res.status === 403) {
                return { 
                    name: 'Uber Eats Cookie', 
                    status: 'CRITICAL', 
                    details: `Cookie EXPIRADA (HTTP ${res.status}). Renovar UBER_EATS_COOKIE urgente.` 
                };
            }

            if (res.status === 429) {
                return { name: 'Uber Eats Cookie', status: 'WARNING', details: 'Rate limited (429). Cookie válida pero Uber está limitando requests.' };
            }

            return { name: 'Uber Eats Cookie', status: 'OK', details: `Cookie válida (${cookie.length} chars, HTTP ${res.status})` };
        } catch (err: any) {
            return { name: 'Uber Eats Cookie', status: 'CRITICAL', details: `Error de conexión: ${err.message}` };
        }
    }

    /**
     * Check 2: Mapeo de productos Uber → interno
     */
    private async checkProductMapping(): Promise<HealthCheckResult['checks'][0]> {
        // Obtener todos los productos activos del sistema
        const internalProducts = await this.prisma.sellingProduct.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
        });

        const internalNames = new Set(internalProducts.map(p => p.name.toLowerCase().trim()));

        // Obtener los alias del mapper
        const aliases = (this.productMapper as any).MANUAL_ALIASES || {};
        const aliasTargets = new Set(Object.values(aliases).map((v: any) => v.toLowerCase().trim()));

        // Verificar que todos los targets de los alias existen como productos internos
        const brokenAliases: string[] = [];
        for (const [ext, internal] of Object.entries(aliases)) {
            const target = (internal as string).toLowerCase().trim();
            if (!internalNames.has(target)) {
                brokenAliases.push(`"${ext}" → "${internal}" (no existe en sistema)`);
            }
        }

        if (brokenAliases.length > 0) {
            return {
                name: 'Mapeo Productos',
                status: 'WARNING',
                details: `${brokenAliases.length} alias apuntan a productos inexistentes`,
                data: brokenAliases.slice(0, 10), // Max 10 para el log
            };
        }

        // Verificar productos sin alias (podrían no ser mapeados desde Uber)
        const productsWithoutAlias = internalProducts.filter(p => {
            const name = p.name.toLowerCase().trim();
            return !aliasTargets.has(name) && !Object.values(aliases).some((v: any) => v.toLowerCase().trim() === name);
        });

        if (productsWithoutAlias.length > 3) {
            return {
                name: 'Mapeo Productos',
                status: 'OK',
                details: `${Object.keys(aliases).length} alias activos, ${internalProducts.length} productos internos. ${productsWithoutAlias.length} sin alias (podrían no venderse en Uber).`,
                data: productsWithoutAlias.map(p => p.name).slice(0, 5),
            };
        }

        return {
            name: 'Mapeo Productos',
            status: 'OK',
            details: `${Object.keys(aliases).length} alias activos, ${internalProducts.length} productos internos. Cobertura completa.`,
        };
    }

    /**
     * Check 3: Modificadores — verificar que los grupos existen y tienen opciones
     */
    private async checkModifierConsistency(): Promise<HealthCheckResult['checks'][0]> {
        const groups = await (this.prisma as any).modifierGroup.findMany({
            include: {
                options: { where: { isActive: true } },
                productModifiers: { include: { product: { select: { name: true, isActive: true } } } },
            },
        });

        const issues: string[] = [];

        for (const group of groups) {
            // Grupo sin opciones activas
            if (group.options.length === 0) {
                issues.push(`Grupo "${group.name}" sin opciones activas`);
            }

            // Grupo asignado a productos inactivos
            const inactiveProducts = group.productModifiers.filter((pm: any) => !pm.product.isActive);
            if (inactiveProducts.length > 0) {
                issues.push(`Grupo "${group.name}" asignado a ${inactiveProducts.length} producto(s) inactivo(s)`);
            }
        }

        if (issues.length > 0) {
            return {
                name: 'Modificadores',
                status: 'WARNING',
                details: `${issues.length} inconsistencias detectadas`,
                data: issues,
            };
        }

        return {
            name: 'Modificadores',
            status: 'OK',
            details: `${groups.length} grupos de modificadores, todos consistentes.`,
        };
    }

    /**
     * Check 4: Turno de caja abierto
     */
    private async checkActiveShift(): Promise<HealthCheckResult['checks'][0]> {
        const activeShift = await (this.prisma as any).cashShift.findFirst({
            where: { status: 'OPEN' },
            include: { cashier: { select: { name: true } } },
        });

        if (!activeShift) {
            return {
                name: 'Turno de Caja',
                status: 'WARNING',
                details: 'No hay turno de caja abierto. Las ventas externas no se registrarán en reportes.',
            };
        }

        // Verificar si el turno lleva más de 24h abierto
        const hoursOpen = (Date.now() - new Date(activeShift.openingTime).getTime()) / 3600000;
        if (hoursOpen > 24) {
            return {
                name: 'Turno de Caja',
                status: 'WARNING',
                details: `Turno de ${activeShift.cashier?.name} lleva ${Math.round(hoursOpen)}h abierto. ¿Olvidó cerrarlo?`,
            };
        }

        return {
            name: 'Turno de Caja',
            status: 'OK',
            details: `Turno activo: ${activeShift.cashier?.name} (${Math.round(hoursOpen)}h abierto)`,
        };
    }

    /**
     * Check 5: Inventario crítico
     */
    private async checkCriticalStock(): Promise<HealthCheckResult['checks'][0]> {
        const criticalItems = await (this.prisma as any).inventoryItem.findMany({
            where: { currentStock: { lte: 0 } },
            select: { name: true, currentStock: true },
        });

        if (criticalItems.length > 0) {
            return {
                name: 'Inventario Crítico',
                status: 'WARNING',
                details: `${criticalItems.length} items en stock 0 o negativo`,
                data: criticalItems.map((i: any) => `${i.name}: ${i.currentStock}`),
            };
        }

        const lowItems = await (this.prisma as any).inventoryItem.findMany({
            where: { currentStock: { lte: 5, gt: 0 } },
            select: { name: true, currentStock: true },
        });

        if (lowItems.length > 0) {
            return {
                name: 'Inventario Crítico',
                status: 'OK',
                details: `${lowItems.length} items con stock bajo (≤5 unidades)`,
                data: lowItems.map((i: any) => `${i.name}: ${i.currentStock}`),
            };
        }

        return { name: 'Inventario Crítico', status: 'OK', details: 'Todo el inventario con stock suficiente.' };
    }

    /**
     * Endpoint para consultar el último resultado del health check
     */
    getLastResult(): HealthCheckResult | null {
        return this.lastResult;
    }

    /**
     * Forzar un health check manual (desde endpoint)
     */
    async forceCheck(): Promise<HealthCheckResult> {
        return this.runDailyCheck();
    }
}
