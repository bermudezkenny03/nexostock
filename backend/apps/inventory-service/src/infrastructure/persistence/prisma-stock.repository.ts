import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isPrismaKnownError } from '@nexostock/common';
import type {
  QuantitySnapshot,
  StockListCriteria,
  StockRepository,
} from '../../domain/repositories';
import {
  IdempotencyRace,
  type IdempotencySnapshot,
  type MovementRecord,
  type Page,
  type StockMutation,
  type StockRow,
  type StockView,
} from '../../domain/stock';
import { PrismaService } from './prisma.service';

function asView(row: {
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: Date;
}): StockView {
  return {
    productId: row.productId,
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    updatedAt: row.updatedAt,
  };
}

function asRow(row: {
  id: string;
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: Date;
}): StockRow {
  return { id: row.id, ...asView(row) };
}

class PrismaStockMutation implements StockMutation {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findIdempotency(businessId: string, key: string): Promise<IdempotencySnapshot | null> {
    const existing = await this.tx.idempotencyRecord.findUnique({
      where: { businessId_key: { businessId, key } },
    });
    if (!existing) {
      return null;
    }
    return { requestHash: existing.requestHash, responseBody: existing.responseBody };
  }

  async saveIdempotency(input: {
    businessId: string;
    key: string;
    requestHash: string;
    responseBody: unknown;
  }): Promise<void> {
    await this.tx.idempotencyRecord.create({
      data: {
        businessId: input.businessId,
        key: input.key,
        requestHash: input.requestHash,
        statusCode: 200,
        responseBody: input.responseBody as Prisma.InputJsonValue,
      },
    });
  }

  async applyQuantityChange(input: {
    businessId: string;
    productId: string;
    direction: 'IN' | 'OUT';
    quantity: number;
  }): Promise<number> {
    const updated = await this.tx.stockItem.updateMany({
      where: {
        businessId: input.businessId,
        productId: input.productId,
        ...(input.direction === 'OUT' ? { quantity: { gte: input.quantity } } : {}),
      },
      data: {
        quantity:
          input.direction === 'OUT'
            ? { decrement: input.quantity }
            : { increment: input.quantity },
      },
    });
    return updated.count;
  }

  async requireStock(businessId: string, productId: string): Promise<StockRow> {
    const item = await this.tx.stockItem.findFirstOrThrow({
      where: { businessId, productId },
    });
    return asRow(item);
  }

  async recordMovement(input: {
    businessId: string;
    stockItemId: string;
    productId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    stockAfter: number;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy: string;
  }): Promise<void> {
    await this.tx.movement.create({
      data: {
        businessId: input.businessId,
        stockItemId: input.stockItemId,
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        stockAfter: input.stockAfter,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy,
      },
    });
  }

  async findForAdjust(businessId: string, productId: string): Promise<StockRow | null> {
    const item = await this.tx.stockItem.findUnique({
      where: { businessId_productId: { businessId, productId } },
    });
    return item ? asRow(item) : null;
  }

  async compareAndSetQuantity(id: string, expected: number, next: number): Promise<number> {
    const updated = await this.tx.stockItem.updateMany({
      where: { id, quantity: expected },
      data: { quantity: next },
    });
    return updated.count;
  }
}

@Injectable()
export class PrismaStockRepository implements StockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: StockListCriteria): Promise<Page<StockView>> {
    const where = {
      businessId: criteria.businessId,
      ...(criteria.productId ? { productId: criteria.productId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.stockItem.count({ where }),
    ]);
    return {
      items: rows.map((row) => asView(row)),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  async findOne(businessId: string, productId: string): Promise<StockView | null> {
    const row = await this.prisma.stockItem.findUnique({
      where: { businessId_productId: { businessId, productId } },
    });
    return row ? asView(row) : null;
  }

  async updateMin(businessId: string, productId: string, minQuantity: number): Promise<number> {
    const updated = await this.prisma.stockItem.updateMany({
      where: { businessId, productId },
      data: { minQuantity },
    });
    return updated.count;
  }

  async listForBusiness(businessId: string): Promise<StockView[]> {
    const rows = await this.prisma.stockItem.findMany({
      where: { businessId },
      orderBy: { quantity: 'asc' },
    });
    return rows.map((row) => asView(row));
  }

  async quantities(businessId: string): Promise<QuantitySnapshot[]> {
    return this.prisma.stockItem.findMany({
      where: { businessId },
      select: { quantity: true, minQuantity: true },
    });
  }

  async movements(criteria: StockListCriteria): Promise<Page<MovementRecord>> {
    const where = {
      businessId: criteria.businessId,
      ...(criteria.productId ? { productId: criteria.productId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.movement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.movement.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        stockItemId: row.stockItemId,
        productId: row.productId,
        type: row.type,
        quantity: row.quantity,
        stockAfter: row.stockAfter,
        reason: row.reason,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
      })),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  async ensure(input: {
    businessId: string;
    productId: string;
    minQuantity?: number;
  }): Promise<StockView> {
    const row = await this.prisma.stockItem.upsert({
      where: {
        businessId_productId: {
          businessId: input.businessId,
          productId: input.productId,
        },
      },
      create: {
        businessId: input.businessId,
        productId: input.productId,
        quantity: 0,
        minQuantity: input.minQuantity ?? 0,
      },
      update: input.minQuantity === undefined ? {} : { minQuantity: input.minQuantity },
    });
    return asView(row);
  }

  async findIdempotency(businessId: string, key: string): Promise<IdempotencySnapshot | null> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { businessId_key: { businessId, key } },
    });
    if (!existing) {
      return null;
    }
    return { requestHash: existing.requestHash, responseBody: existing.responseBody };
  }

  async transaction<T>(work: (tx: StockMutation) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction((tx) => work(new PrismaStockMutation(tx)));
    } catch (error) {
      if (isPrismaKnownError(error) && error.code === 'P2002') {
        throw new IdempotencyRace();
      }
      throw error;
    }
  }
}
