import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('dashboard')
    getDashboard() {
        return this.statsService.getDashboardStats();
    }

    @Get('top-products')
    getTopProducts() {
        return this.statsService.getTopProducts();
    }

    @Get('peak-hours')
    getPeakHours() {
        return this.statsService.getPeakHours();
    }
}
