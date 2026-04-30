import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('modifiers')
export class ModifiersController {
    constructor(private readonly modifiersService: ModifiersService) {}

    // ============ GROUPS (Lectura pública, escritura protegida) ============

    @Get('groups')
    findAllGroups() {
        return this.modifiersService.findAllGroups();
    }

    @Get('groups/:id')
    findOneGroup(@Param('id') id: string) {
        return this.modifiersService.findOneGroup(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('groups')
    createGroup(
        @Body()
        data: {
            name: string;
            displayName: string;
            type?: 'SINGLE_SELECT' | 'MULTI_SELECT';
            minSelections?: number;
            maxSelections?: number;
            sortOrder?: number;
            options?: { name: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number }[];
        },
    ) {
        return this.modifiersService.createGroup(data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('groups/:id')
    updateGroup(
        @Param('id') id: string,
        @Body()
        data: {
            name?: string;
            displayName?: string;
            type?: 'SINGLE_SELECT' | 'MULTI_SELECT';
            minSelections?: number;
            maxSelections?: number;
            sortOrder?: number;
        },
    ) {
        return this.modifiersService.updateGroup(id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('groups/:id/reorder-options')
    reorderOptions(
        @Param('id') id: string,
        @Body() data: { items: { id: string; sortOrder: number }[] },
    ) {
        return this.modifiersService.reorderOptions(id, data.items);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('groups/:id')
    deleteGroup(@Param('id') id: string) {
        return this.modifiersService.deleteGroup(id);
    }

    // ============ OPTIONS (Todo protegido) ============

    @UseGuards(JwtAuthGuard)
    @Post('groups/:groupId/options')
    addOption(
        @Param('groupId') groupId: string,
        @Body() data: { name: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number; recipeId?: string },
    ) {
        return this.modifiersService.addOption(groupId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('options/:optionId')
    updateOption(
        @Param('optionId') optionId: string,
        @Body() data: { name?: string; priceAdjustment?: number; isDefault?: boolean; isActive?: boolean; sortOrder?: number; recipeId?: string | null },
    ) {
        return this.modifiersService.updateOption(optionId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('options/:optionId')
    deleteOption(@Param('optionId') optionId: string) {
        return this.modifiersService.deleteOption(optionId);
    }

    // ============ PRODUCT ASSIGNMENTS ============

    // GET público — la web del cliente necesita leer los modificadores de un producto
    @Get('product/:productId')
    getProductModifiers(@Param('productId') productId: string) {
        return this.modifiersService.getProductModifiers(productId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('product/:productId/assign')
    assignToProduct(
        @Param('productId') productId: string,
        @Body() data: { modifierGroupId: string; isRequired?: boolean; sortOrder?: number; overrideMin?: number; overrideMax?: number },
    ) {
        return this.modifiersService.assignToProduct(productId, data.modifierGroupId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('product/:productId/remove/:modifierGroupId')
    removeFromProduct(@Param('productId') productId: string, @Param('modifierGroupId') modifierGroupId: string) {
        return this.modifiersService.removeFromProduct(productId, modifierGroupId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('product/:productId/bulk-assign')
    bulkAssignToProduct(
        @Param('productId') productId: string,
        @Body()
        data: {
            assignments: { modifierGroupId: string; isRequired?: boolean; sortOrder?: number; overrideMin?: number; overrideMax?: number }[];
        },
    ) {
        return this.modifiersService.bulkAssignToProduct(productId, data.assignments);
    }
}
