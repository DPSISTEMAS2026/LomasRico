import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get(':userId/addresses')
    async getAddresses(@Param('userId') userId: string) {
        return this.usersService.getAddresses(userId);
    }

    @Post(':userId/addresses')
    async addAddress(
        @Param('userId') userId: string,
        @Body() dto: CreateAddressDto,
    ) {
        return this.usersService.addAddress(userId, dto);
    }

    @Get(':userId/orders')
    async getOrders(@Param('userId') userId: string) {
        return this.usersService.getOrders(userId);
    }

    @Get('customers/list')
    async findAllCustomers(@Query('search') search?: string) {
        return this.usersService.findAllCustomers(search);
    }
}
