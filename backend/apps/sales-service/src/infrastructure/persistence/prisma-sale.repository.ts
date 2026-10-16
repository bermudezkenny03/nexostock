import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isPrismaKnownError } from '@nexostock/common';
import type { DateWindow, SaleListCriteria, SaleRepository } from '../../domain/repositories';
import {
  DuplicateSaleKey,
  type NewSale,
  type SalePage,
  type SaleRecord,
  type SalesSeriesPoint,
  type SalesSummary,
  type TopProduct,
} from '../../domain/sale';
import { PrismaService } from './prisma.service';

const saleInclude = { lines: true } as const;

type SaleRow = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

function asSale(row: SaleRow): SaleRecord {
  return {
    id: row.id,
    status: row.status,
    total: row.total.toFixed(2),
    note: row.note,
    createdBy: row.createdBy,
    requestHash: row.requestHash,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lines: row.lines.map((line) => ({
      productId: line.productId,
      sku: line.sku,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice.toFixed(2),
      lineTotal: line.lineTotal.toFixed(2),
    })),
  };
}

@Injectable()
export class PrismaSaleRepository implements SaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: SaleListCriteria): Promise<SalePage> {
    const where = {
      businessId: criteria.businessId,
      ...(criteria.status ? { status: criteria.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy: { createdAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return {
      items: rows.map((row) => {
        const sale = asSale(row);
        return {
          id: sale.id,
          status: sale.status,
          total: sale.total,
          note: sale.note,
          createdBy: sale.createdBy,
          failureCode: sale.failureCode,
          failureReason: sale.failureReason,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          lines: sale.lines,
        };
      }),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  async findOwned(id: string, businessId: string): Promise<SaleRecord | null> {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: saleInclude,
    });
    return sale ? asSale(sale) : null;
  }

  async findByIdempotency(
    businessId: string,
    idempotencyKey: string,
  ): Promise<SaleRecord | null> {
    const sale = await this.prisma.sale.findUnique({
      where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      include: saleInclude,
    });
    return sale ? asSale(sale) : null;
  }

  async createPending(data: NewSale): Promise<SaleRecord> {
    try {
      const sale = await this.prisma.sale.create({
        data: {
          businessId: data.businessId,
          status: 'PENDING',
          total: data.total,
          note: data.note,
          createdBy: data.createdBy,
          idempotencyKey: data.idempotencyKey,
          requestHash: data.requestHash,
          lines: {
            create: data.lines.map((line) => ({
              businessId: data.businessId,
              productId: line.productId,
              sku: line.sku,
              productName: line.productName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: saleInclude,
      });
      return asSale(sale);
    } catch (error) {
      if (isPrismaKnownError(error) && error.code === 'P2002') {
        throw new DuplicateSaleKey();
      }
      throw error;
    }
  }

  async markFailed(id: string, failureCode: string, failureReason: string): Promise<void> {
    await this.prisma.sale.update({
      where: { id },
      data: { status: 'FAILED', failureCode, failureReason },
    });
  }

  async markConfirmed(id: string): Promise<SaleRecord> {
    const sale = await this.prisma.sale.update({
      where: { id },
      data: { status: 'CONFIRMED', failureCode: null, failureReason: null },
      include: saleInclude,
    });
    return asSale(sale);
  }

  async markCancelled(id: string): Promise<SaleRecord> {
    const sale = await this.prisma.sale.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: saleInclude,
    });
    return asSale(sale);
  }

  async summary(businessId: string, range: DateWindow): Promise<SalesSummary> {
    const rows = await this.prisma.$queryRaw<{ count: number; total: Prisma.Decimal }[]>`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
      FROM "sales"."sales"
      WHERE business_id = ${businessId}::uuid
        AND status = 'CONFIRMED'
        AND created_at >= ${range.from}
        AND created_at < ${range.to}
    `;
    const row = rows[0];
    return {
      count: Number(row?.count ?? 0),
      total: Number(row?.total ?? 0).toFixed(2),
    };
  }

  async series(businessId: string, range: DateWindow): Promise<SalesSeriesPoint[]> {
    const rows = await this.prisma.$queryRaw<{ day: Date; count: number; total: Prisma.Decimal }[]>`
      SELECT date_trunc('day', created_at) AS day,
             COUNT(*)::int AS count,
             COALESCE(SUM(total), 0) AS total
      FROM "sales"."sales"
      WHERE business_id = ${businessId}::uuid
        AND status = 'CONFIRMED'
        AND created_at >= ${range.from}
        AND created_at < ${range.to}
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((row) => ({
      day: row.day.toISOString(),
      count: Number(row.count),
      total: Number(row.total).toFixed(2),
    }));
  }

  async topProducts(businessId: string, range: DateWindow, limit: number): Promise<TopProduct[]> {
    const rows = await this.prisma.$queryRaw<
      {
        product_id: string;
        sku: string;
        product_name: string;
        quantity: number;
        total: Prisma.Decimal;
      }[]
    >`
      SELECT l.product_id, l.sku, l.product_name,
             SUM(l.quantity)::int AS quantity,
             COALESCE(SUM(l.line_total), 0) AS total
      FROM "sales"."sale_lines" l
      JOIN "sales"."sales" s ON s.id = l.sale_id
      WHERE s.business_id = ${businessId}::uuid
        AND s.status = 'CONFIRMED'
        AND s.created_at >= ${range.from}
        AND s.created_at < ${range.to}
      GROUP BY l.product_id, l.sku, l.product_name
      ORDER BY quantity DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({
      productId: row.product_id,
      sku: row.sku,
      productName: row.product_name,
      quantity: Number(row.quantity),
      total: Number(row.total).toFixed(2),
    }));
  }
}
