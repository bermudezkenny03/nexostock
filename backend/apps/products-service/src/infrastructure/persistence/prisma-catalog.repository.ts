import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  UniqueConstraintError,
  type Category,
  type CategoryChanges,
  type NewCategory,
  type NewProduct,
  type Product,
  type ProductChanges,
  type ProductListCriteria,
  type ProductPage,
  type ProductQuote,
} from '../../domain/catalog';
import type { CategoryRepository, ProductRepository } from '../../domain/repositories';
import { PrismaService } from './prisma.service';

const productInclude = { category: true } as const;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function asProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: row.price.toFixed(2),
    isActive: row.isActive,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function asCategory(row: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rethrowUnique(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  ) {
    throw new UniqueConstraintError();
  }
  throw error;
}

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => asCategory(row));
  }

  async findInBusiness(id: string, businessId: string): Promise<Category | null> {
    const row = await this.prisma.category.findFirst({ where: { id, businessId } });
    return row ? asCategory(row) : null;
  }

  async findActive(id: string, businessId: string): Promise<Category | null> {
    const row = await this.prisma.category.findFirst({
      where: { id, businessId, isActive: true },
    });
    return row ? asCategory(row) : null;
  }

  async create(data: NewCategory): Promise<Category> {
    try {
      const row = await this.prisma.category.create({ data });
      return asCategory(row);
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async update(id: string, changes: CategoryChanges): Promise<Category> {
    try {
      const row = await this.prisma.category.update({ where: { id }, data: changes });
      return asCategory(row);
    } catch (error) {
      rethrowUnique(error);
    }
  }
}

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: ProductListCriteria): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      businessId: criteria.businessId,
      ...(criteria.includeInactive ? {} : { isActive: true }),
      ...(criteria.categoryId ? { categoryId: criteria.categoryId } : {}),
      ...(criteria.search
        ? {
            OR: [
              { name: { contains: criteria.search, mode: 'insensitive' } },
              { sku: { contains: criteria.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { name: 'asc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map((row) => asProduct(row)),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  async findInBusiness(id: string, businessId: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({
      where: { id, businessId },
      include: productInclude,
    });
    return row ? asProduct(row) : null;
  }

  countActive(businessId: string): Promise<number> {
    return this.prisma.product.count({ where: { businessId, isActive: true } });
  }

  async create(data: NewProduct): Promise<Product> {
    try {
      const row = await this.prisma.product.create({
        data,
        include: productInclude,
      });
      return asProduct(row);
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async update(id: string, changes: ProductChanges): Promise<Product> {
    try {
      const row = await this.prisma.product.update({
        where: { id },
        data: changes,
        include: productInclude,
      });
      return asProduct(row);
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  async quote(
    businessId: string,
    productIds: string[],
    includeInactive: boolean,
  ): Promise<ProductQuote[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        businessId,
        id: { in: productIds },
        ...(includeInactive ? {} : { isActive: true }),
      },
    });
    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      price: row.price.toFixed(2),
      isActive: row.isActive,
    }));
  }

  async summary(businessId: string): Promise<{ active: number; total: number }> {
    const [active, total] = await Promise.all([
      this.prisma.product.count({ where: { businessId, isActive: true } }),
      this.prisma.product.count({ where: { businessId } }),
    ]);
    return { active, total };
  }
}
