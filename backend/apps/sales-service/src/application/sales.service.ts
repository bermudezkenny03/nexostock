import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode, stableHash, type JwtPayload } from '@nexostock/common';
import { InvalidSaleDraft, buildSaleDraft, type ProductQuote } from '../domain/pricing';
import { InvalidDateRange, resolveRange } from '../domain/range';
import { SALE_REPOSITORY, type SaleRepository } from '../domain/repositories';
import {
  DuplicateSaleKey,
  type SaleRecord,
  type SaleView,
} from '../domain/sale';

const KEY = /^[A-Za-z0-9:_-]{8,80}$/;

export const CATALOG_PORT = Symbol('CatalogPort');
export const INVENTORY_PORT = Symbol('InventoryPort');

export interface CatalogPort {
  quote(productIds: string[], accessToken: string): Promise<ProductQuote[]>;
}

export interface StockChange {
  referenceType: 'SALE' | 'SALE_CANCEL';
  referenceId: string;
  lines: { productId: string; quantity: number }[];
}

export interface InventoryPort {
  deduct(accessToken: string, idempotencyKey: string, body: StockChange): Promise<void>;
  release(accessToken: string, idempotencyKey: string, body: StockChange): Promise<void>;
}

export interface CreateSaleInput {
  items: { productId: string; quantity: number }[];
  note?: string;
}

export interface ListSalesInput {
  status?: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  page?: number;
  pageSize?: number;
}

function exceptionCode(error: unknown): string | undefined {
  if (!(error instanceof HttpException)) {
    return undefined;
  }
  const body = error.getResponse();
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function exceptionMessage(error: unknown): string {
  if (!(error instanceof HttpException)) {
    return 'La venta no se pudo registrar';
  }
  const body = error.getResponse();
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return error.message;
}

@Injectable()
export class SalesService {
  constructor(
    @Inject(SALE_REPOSITORY) private readonly sales: SaleRepository,
    @Inject(CATALOG_PORT) private readonly catalog: CatalogPort,
    @Inject(INVENTORY_PORT) private readonly inventory: InventoryPort,
  ) {}

  list(businessId: string, query: ListSalesInput) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.sales.list({
      businessId,
      status: query.status,
      page,
      pageSize,
    });
  }

  async findOne(id: string, businessId: string) {
    const sale = await this.owned(id, businessId);
    return this.toView(sale);
  }

  async create(
    actor: JwtPayload,
    dto: CreateSaleInput,
    accessToken: string,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey && !KEY.test(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key no es válida');
    }
    const requestHash = stableHash({
      items: [...dto.items].sort((left, right) => left.productId.localeCompare(right.productId)),
      note: dto.note ?? null,
    });
    if (idempotencyKey) {
      const existing = await this.sales.findByIdempotency(actor.businessId, idempotencyKey);
      if (existing) {
        return this.resume(existing, requestHash, accessToken);
      }
    }

    const quotes = await this.catalog.quote(
      [...new Set(dto.items.map((item) => item.productId))],
      accessToken,
    );
    const draft = this.draft(dto.items, quotes);
    try {
      const sale = await this.sales.createPending({
        businessId: actor.businessId,
        total: draft.total,
        note: dto.note?.trim() || null,
        createdBy: actor.sub,
        idempotencyKey,
        requestHash,
        lines: draft.lines,
      });
      return this.finish(sale, accessToken);
    } catch (error) {
      if (idempotencyKey && error instanceof DuplicateSaleKey) {
        const existing = await this.sales.findByIdempotency(actor.businessId, idempotencyKey);
        if (existing) {
          return this.resume(existing, requestHash, accessToken);
        }
      }
      throw error;
    }
  }

  async cancel(id: string, actor: JwtPayload, accessToken: string) {
    const sale = await this.owned(id, actor.businessId);
    if (sale.status === 'CANCELLED') {
      return this.toView(sale);
    }
    if (sale.status !== 'CONFIRMED') {
      throw new ConflictException('Solo se puede cancelar una venta confirmada');
    }
    await this.inventory.release(accessToken, `cancel:${sale.id}`, {
      referenceType: 'SALE_CANCEL',
      referenceId: sale.id,
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    });
    const cancelled = await this.sales.markCancelled(sale.id);
    return this.toView(cancelled);
  }

  async summary(businessId: string, from?: string, to?: string) {
    const range = this.range(from, to);
    const row = await this.sales.summary(businessId, range);
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      count: row.count,
      total: row.total,
    };
  }

  async series(businessId: string, from?: string, to?: string) {
    const range = this.range(from, to);
    const items = await this.sales.series(businessId, range);
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      items,
    };
  }

  async topProducts(businessId: string, from?: string, to?: string, limit = 10) {
    const range = this.range(from, to);
    return this.sales.topProducts(businessId, range, limit);
  }

  private draft(
    items: { productId: string; quantity: number }[],
    quotes: ProductQuote[],
  ) {
    try {
      return buildSaleDraft(items, quotes);
    } catch (error) {
      if (error instanceof InvalidSaleDraft) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private range(from?: string, to?: string) {
    try {
      return resolveRange(from, to);
    } catch (error) {
      if (error instanceof InvalidDateRange) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async resume(sale: SaleRecord, requestHash: string, accessToken: string) {
    if (sale.requestHash !== requestHash) {
      throw new ConflictException({
        message: 'La clave de idempotencia ya se usó con otra solicitud',
        code: ErrorCode.IDEMPOTENCY_KEY_REUSED,
      });
    }
    return this.finish(sale, accessToken);
  }

  private async finish(sale: SaleRecord, accessToken: string) {
    if (sale.status === 'CONFIRMED' || sale.status === 'CANCELLED') {
      return this.toView(sale);
    }
    if (sale.status === 'FAILED') {
      throw new ConflictException({
        message: sale.failureReason ?? 'La venta no se pudo registrar',
        code: sale.failureCode ?? 'SALE_FAILED',
      });
    }

    try {
      await this.deductWithRetry(accessToken, sale);
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      const code = exceptionCode(error);
      if (status < 500 && code !== ErrorCode.IDEMPOTENCY_IN_PROGRESS) {
        await this.sales.markFailed(
          sale.id,
          code ?? 'SALE_FAILED',
          exceptionMessage(error),
        );
      }
      throw error;
    }

    const confirmed = await this.sales.markConfirmed(sale.id);
    return this.toView(confirmed);
  }

  private async deductWithRetry(accessToken: string, sale: SaleRecord): Promise<void> {
    const body = {
      referenceType: 'SALE' as const,
      referenceId: sale.id,
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    };
    try {
      await this.inventory.deduct(accessToken, sale.id, body);
    } catch (error) {
      const code = exceptionCode(error);
      if (code !== ErrorCode.UPSTREAM_TIMEOUT && code !== ErrorCode.UPSTREAM_UNAVAILABLE) {
        throw error;
      }
      await this.inventory.deduct(accessToken, sale.id, body);
    }
  }

  private async owned(id: string, businessId: string): Promise<SaleRecord> {
    const sale = await this.sales.findOwned(id, businessId);
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return sale;
  }

  private toView(sale: SaleRecord): SaleView {
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
  }
}
