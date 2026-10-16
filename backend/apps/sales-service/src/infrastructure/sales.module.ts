import { Module } from '@nestjs/common';
import { CATALOG_PORT, INVENTORY_PORT, SalesService } from '../application/sales.service';
import { SALE_REPOSITORY } from '../domain/repositories';
import { CatalogClient, InventoryClient } from './clients/sales.clients';
import { SalesController, SalesInternalController } from './http/sales.controller';
import { PrismaSaleRepository } from './persistence/prisma-sale.repository';

@Module({
  controllers: [SalesController, SalesInternalController],
  providers: [
    SalesService,
    CatalogClient,
    InventoryClient,
    PrismaSaleRepository,
    { provide: SALE_REPOSITORY, useExisting: PrismaSaleRepository },
    { provide: CATALOG_PORT, useExisting: CatalogClient },
    { provide: INVENTORY_PORT, useExisting: InventoryClient },
  ],
})
export class SalesModule {}
