import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MANAGER_ROLES } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

@Controller('stats')
@UseGuards(JwtAuthGuard)
@Roles(...MANAGER_ROLES)
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('dashboard')
    getDashboard() {
        return this.statsService.getDashboardStats();
    }

    @Get('report')
    getReport() {
        return this.statsService.getMonthReport();
    }

    @Get('range')
    getRange(@Query('from') from?: string, @Query('to') to?: string) {
        return this.statsService.getRangeReport(from, to);
    }

    @Get('top-products')
    getTopProducts(@Query('from') from?: string, @Query('to') to?: string) {
        return this.statsService.getTopProducts(from, to);
    }

    @Get('peak-hours')
    getPeakHours(@Query('from') from?: string, @Query('to') to?: string) {
        return this.statsService.getPeakHours(from, to);
    }

    @Get('tips')
    getTips(@Query('days') days?: string) {
        return this.statsService.getTipsReport(Number(days) || 30);
    }
}
