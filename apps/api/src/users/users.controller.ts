import { Controller, Get, Post, Body, Param, Query, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { Roles } from '../auth/roles.decorator';
import { ANY_USER_ROLES, CASH_ROLES } from '../auth/access';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * GET /users/customers/list
     * Protected: only OWNER and ADMIN can list all customers
     * IMPORTANT: This must be BEFORE :userId routes to avoid parameter collision
     */
    @Roles(...CASH_ROLES)
    @Get('customers/list')
    async findAllCustomers(@Query('search') search?: string) {
        return this.usersService.findAllCustomers(search);
    }

    /**
     * GET /users/:userId/addresses
     * Protected: user can only see their own addresses, unless OWNER/ADMIN
     */
    @Roles(...ANY_USER_ROLES)
    @Get(':userId/addresses')
    async getAddresses(@Param('userId') userId: string, @Request() req: any) {
        this.assertOwnershipOrAdmin(req.user, userId);
        return this.usersService.getAddresses(userId);
    }

    /**
     * POST /users/:userId/addresses
     * Protected: user can only add to their own addresses, unless OWNER/ADMIN
     */
    @Roles(...ANY_USER_ROLES)
    @Post(':userId/addresses')
    async addAddress(
        @Param('userId') userId: string,
        @Body() dto: CreateAddressDto,
        @Request() req: any,
    ) {
        this.assertOwnershipOrAdmin(req.user, userId);
        return this.usersService.addAddress(userId, dto);
    }

    /**
     * GET /users/:userId/orders
     * Protected: user can only see their own orders, unless OWNER/ADMIN
     */
    @Roles(...ANY_USER_ROLES)
    @Get(':userId/orders')
    async getOrders(@Param('userId') userId: string, @Request() req: any) {
        this.assertOwnershipOrAdmin(req.user, userId);
        return this.usersService.getOrders(userId);
    }

    // ── Helpers ──

    /**
     * Verifies the authenticated user is either accessing their own data
     * or has an elevated role (OWNER/ADMIN).
     */
    private assertOwnershipOrAdmin(user: { userId: string; role: string }, targetUserId: string) {
        const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
        if (user.userId !== targetUserId && !isAdmin) {
            throw new ForbiddenException('No tienes permiso para acceder a datos de otro usuario');
        }
    }
}
