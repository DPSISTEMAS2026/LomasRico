import { Module } from '@nestjs/common';

// Core Modules
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Feature Modules (Ordered by Dependency/Flow)
import { InventoryModule } from './inventory/inventory.module';         // 1. Stock & Items
import { RecipeEngineeringModule } from './recipe-engineering/recipe-engineering.module'; // 2. BoM Logic
import { ShippingModule } from './shipping/shipping.module';             // 3. Logistics
import { PaymentsModule } from './payments/payments.module';             // 4. Payments (Simulated)
import { SalesModule } from './sales/sales.module';                     // 5. Transactions
import { ProductsModule } from './products/products.module';               // 6. Products Management
import { StatsModule } from './stats/stats.module';                     // 7. Business Analytics
import { KitchenModule } from './kitchen/kitchen.module';               // 8. KDS & Production
import { RecipesModule } from './recipes/recipes.module';
import { BotModule } from './bot/bot.module';
import { CashiersModule } from './cashiers/cashiers.module';           // 9. Cashiers Management
import { ShiftsModule } from './shifts/shifts.module';                 // 10. Cash Shifts
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { BannersModule } from './banners/banners.module';
import { BillingModule } from './billing/billing.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ExternalOrdersModule } from './external-orders/external-orders.module';

// App Root
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    InventoryModule,
    RecipeEngineeringModule,
    ShippingModule,
    PaymentsModule,
    ProductsModule,
    StatsModule,
    SalesModule,
    KitchenModule,
    RecipesModule,
    BotModule,
    CashiersModule,
    ShiftsModule,
    WhatsAppModule,
    BannersModule,
    BillingModule,
    ModifiersModule,
    PromotionsModule,
    ExternalOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
