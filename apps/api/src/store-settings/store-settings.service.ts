import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { isWebOrdersEnabledFromEnv, storeStatus } from '../config/flags';

const SETTINGS_ID = 'default';

export type StoreSettingsDto = {
  webOrdersEnabled: boolean;
  webHours: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  status: ReturnType<typeof storeStatus> & { ordersEnabled: boolean; envKillSwitch: boolean };
};

@Injectable()
export class StoreSettingsService implements OnModuleInit {
  private cache: { webOrdersEnabled: boolean; webHours: string | null } | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureRow();
    await this.refreshCache();
  }

  private async ensureRow() {
    await (this.prisma as any).storeSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, webOrdersEnabled: true, webHours: null },
      update: {},
    });
  }

  private async refreshCache() {
    const row = await (this.prisma as any).storeSettings.findUnique({ where: { id: SETTINGS_ID } });
    this.cache = {
      webOrdersEnabled: row?.webOrdersEnabled !== false,
      webHours: row?.webHours ?? null,
    };
  }

  private async cached() {
    if (!this.cache) await this.refreshCache();
    return this.cache!;
  }

  /** Env false siempre gana; si env true, manda el panel (DB). */
  async isWebOrdersEnabled(): Promise<boolean> {
    if (!isWebOrdersEnabledFromEnv()) return false;
    const c = await this.cached();
    return c.webOrdersEnabled;
  }

  async getStatus(now = new Date()) {
    const c = await this.cached();
    const hours = storeStatus(now, c.webHours);
    const ordersEnabled = await this.isWebOrdersEnabled();
    return { ...hours, ordersEnabled, envKillSwitch: !isWebOrdersEnabledFromEnv() };
  }

  async getAdmin(): Promise<StoreSettingsDto> {
    await this.ensureRow();
    const row = await (this.prisma as any).storeSettings.findUnique({ where: { id: SETTINGS_ID } });
    const status = await this.getStatus();
    return {
      webOrdersEnabled: row?.webOrdersEnabled !== false,
      webHours: row?.webHours ?? null,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      updatedBy: row?.updatedBy ?? null,
      status,
    };
  }

  async update(input: { webOrdersEnabled?: boolean; webHours?: string | null }, updatedBy?: string) {
    const data: Record<string, unknown> = {};
    if (typeof input.webOrdersEnabled === 'boolean') data.webOrdersEnabled = input.webOrdersEnabled;
    if (input.webHours !== undefined) {
      const raw = input.webHours === null || input.webHours === '' ? null : String(input.webHours).trim();
      if (raw && !/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(raw)) {
        throw new BadRequestException('Horario inválido. Usa formato 11:00-22:00');
      }
      data.webHours = raw;
    }
    if (updatedBy) data.updatedBy = updatedBy;

    const row = await (this.prisma as any).storeSettings.update({
      where: { id: SETTINGS_ID },
      data,
    });
    await this.refreshCache();

    // #region agent log
    fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'store-settings',hypothesisId:'ST1',location:'store-settings.service.ts:update',message:'store settings updated',data:{webOrdersEnabled:row.webOrdersEnabled,webHours:row.webHours,updatedBy},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return this.getAdmin();
  }
}
