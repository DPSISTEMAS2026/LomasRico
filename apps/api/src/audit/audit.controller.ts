import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { MANAGER_ROLES } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

@Controller('audit')
@Roles(...MANAGER_ROLES)
export class AuditController {
    constructor(private readonly audit: AuditService) { }

    @Get()
    list(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('take') take?: string,
    ) {
        return this.audit.list({ from, to, action, take: Number(take) || undefined });
    }
}
