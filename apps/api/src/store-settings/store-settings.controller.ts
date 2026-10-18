import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { MANAGER_ROLES, Public } from '../auth/access';
import { Roles } from '../auth/roles.decorator';
import { StoreSettingsService } from './store-settings.service';

@Controller('store')
export class StoreSettingsController {
  constructor(private readonly store: StoreSettingsService) {}

  /** Público: usado por la web para saber si se puede pedir. */
  @Public()
  @Get('status')
  status() {
    return this.store.getStatus();
  }

  @Roles(...MANAGER_ROLES)
  @Get('settings')
  settings() {
    return this.store.getAdmin();
  }

  @Roles(...MANAGER_ROLES)
  @Patch('settings')
  update(
    @Body() body: { webOrdersEnabled?: boolean; webHours?: string | null },
    @Req() req: any,
  ) {
    return this.store.update(body, req.user?.userId || req.user?.email || req.user?.name);
  }
}
