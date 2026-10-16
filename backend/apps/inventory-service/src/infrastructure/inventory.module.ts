import { Module } from '@nestjs/common';
import { CATALOG_PORT, StockService } from '../application/stock.service';
import { STOCK_REPOSITORY } from '../domain/repositories';
import { ProductsClient } from './clients/products.client';
import {
  InventoryController,
  InventoryInternalController,
} from './http/inventory.controller';
import { PrismaStockRepository } from './persistence/prisma-stock.repository';

@Module({
  controllers: [InventoryController, InventoryInternalController],
  providers: [
    StockService,
    ProductsClient,
    PrismaStockRepository,
    { provide: STOCK_REPOSITORY, useExisting: PrismaStockRepository },
    { provide: CATALOG_PORT, useExisting: ProductsClient },
  ],
})
export class InventoryModule {}
