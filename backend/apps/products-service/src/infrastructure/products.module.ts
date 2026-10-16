import { Module } from '@nestjs/common';
import { AUTH_PORT, INVENTORY_PORT } from '../application/products.service';
import { CategoriesService } from '../application/categories.service';
import { ProductsService } from '../application/products.service';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from '../domain/repositories';
import { AuthClient, InventoryClient } from './clients/catalog.clients';
import {
  CategoriesController,
  ProductsController,
  ProductsInternalController,
} from './http/products.controller';
import {
  PrismaCategoryRepository,
  PrismaProductRepository,
} from './persistence/prisma-catalog.repository';

@Module({
  controllers: [CategoriesController, ProductsController, ProductsInternalController],
  providers: [
    CategoriesService,
    ProductsService,
    AuthClient,
    InventoryClient,
    PrismaCategoryRepository,
    PrismaProductRepository,
    { provide: CATEGORY_REPOSITORY, useExisting: PrismaCategoryRepository },
    { provide: PRODUCT_REPOSITORY, useExisting: PrismaProductRepository },
    { provide: AUTH_PORT, useExisting: AuthClient },
    { provide: INVENTORY_PORT, useExisting: InventoryClient },
  ],
})
export class ProductsModule {}
