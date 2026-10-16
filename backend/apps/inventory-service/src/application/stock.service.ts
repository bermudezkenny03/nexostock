import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode, stableHash, type JwtPayload } from '@nexostock/common';
import {
  STOCK_REPOSITORY,
  type StockRepository,
} from '../domain/repositories';
import {
  IdempotencyRace,
  type AppliedLine,
  type MovementMeta,
  type StockMutation,
  type StockView,
} from '../domain/stock';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{8,80}$/;

export const CATALOG_PORT = Symbol('CatalogPort');

export interface CatalogPort {
  exists(productId: string, accessToken: string): Promise<boolean>;
}

export interface ListStockInput {
  productId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateMovementInput {
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
}

export interface EnsureStockInput {
  productId: string;
  minQuantity?: number;
}

export interface StockChangeInput {
  referenceType: string;
  referenceId: string;
  lines: { productId: string; quantity: number }[];
}

@Injectable()
export class StockService {
  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stock: StockRepository,
    @Inject(CATALOG_PORT) private readonly productsClient: CatalogPort,
  ) {}

  list(businessId: string, query: ListStockInput) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.stock.list({
      businessId,
      productId: query.productId,
      page,
      pageSize,
    });
  }

  async findOne(businessId: string, productId: string): Promise<StockView> {
    const row = await this.stock.findOne(businessId, productId);
    if (!row) {
      throw new NotFoundException('El producto no tiene inventario');
    }
    return row;
  }

  async updateMin(
    businessId: string,
    productId: string,
    dto: { minQuantity: number },
  ): Promise<StockView> {
    const updated = await this.stock.updateMin(businessId, productId, dto.minQuantity);
    if (updated !== 1) {
      throw new NotFoundException('El producto no tiene inventario');
    }
    return this.findOne(businessId, productId);
  }

  async alerts(businessId: string): Promise<StockView[]> {
    const rows = await this.stock.listForBusiness(businessId);
    return rows.filter((row) => row.quantity <= row.minQuantity);
  }

  async summary(businessId: string) {
    const rows = await this.stock.quantities(businessId);
    return {
      skuCount: rows.length,
      units: rows.reduce((sum, row) => sum + row.quantity, 0),
      lowStock: rows.filter((row) => row.quantity <= row.minQuantity).length,
    };
  }

  movements(businessId: string, query: ListStockInput) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.stock.movements({
      businessId,
      productId: query.productId,
      page,
      pageSize,
    });
  }

  async move(
    actor: JwtPayload,
    dto: CreateMovementInput,
    accessToken: string,
    idempotencyKey?: string,
  ) {
    const known = await this.productsClient.exists(dto.productId, accessToken);
    if (!known) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (dto.type !== 'ADJUSTMENT' && dto.quantity < 1) {
      throw new BadRequestException('La cantidad debe ser mayor que cero');
    }
    const hash = stableHash(dto);
    return this.withIdempotency(actor.businessId, idempotencyKey, hash, async (tx) => {
      if (dto.type === 'ADJUSTMENT') {
        return this.adjust(tx, actor, dto);
      }
      return this.applyDelta(tx, actor.businessId, actor.sub, dto.type, [
        { productId: dto.productId, quantity: dto.quantity },
      ], { reason: dto.reason });
    });
  }

  ensure(actor: JwtPayload, dto: EnsureStockInput) {
    return this.stock.ensure({
      businessId: actor.businessId,
      productId: dto.productId,
      minQuantity: dto.minQuantity,
    });
  }

  async deduct(actor: JwtPayload, dto: StockChangeInput, idempotencyKey?: string) {
    return this.withIdempotency(
      actor.businessId,
      this.requireKey(idempotencyKey),
      stableHash(dto),
      (tx) =>
        this.applyDelta(tx, actor.businessId, actor.sub, 'OUT', dto.lines, {
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          reason: 'Venta',
        }),
    );
  }

  async release(actor: JwtPayload, dto: StockChangeInput, idempotencyKey?: string) {
    return this.withIdempotency(
      actor.businessId,
      this.requireKey(idempotencyKey),
      stableHash(dto),
      (tx) =>
        this.applyDelta(tx, actor.businessId, actor.sub, 'IN', dto.lines, {
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          reason: 'Cancelación de venta',
        }),
    );
  }

  private requireKey(key: string | undefined): string {
    if (!key) {
      throw new BadRequestException('Idempotency-Key es obligatoria');
    }
    return key;
  }

  private async withIdempotency<T>(
    businessId: string,
    key: string | undefined,
    requestHash: string,
    work: (tx: StockMutation) => Promise<T>,
  ): Promise<T> {
    if (key && !IDEMPOTENCY_KEY.test(key)) {
      throw new BadRequestException('Idempotency-Key no es válida');
    }
    try {
      return await this.stock.transaction(async (tx) => {
        if (key) {
          const existing = await tx.findIdempotency(businessId, key);
          if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new ConflictException({
                message: 'La clave de idempotencia ya se usó con otra solicitud',
                code: ErrorCode.IDEMPOTENCY_KEY_REUSED,
              });
            }
            return existing.responseBody as T;
          }
        }
        const result = await work(tx);
        if (key) {
          await tx.saveIdempotency({
            businessId,
            key,
            requestHash,
            responseBody: result,
          });
        }
        return result;
      });
    } catch (error) {
      if (key && error instanceof IdempotencyRace) {
        const existing = await this.stock.findIdempotency(businessId, key);
        if (existing?.requestHash === requestHash) {
          return existing.responseBody as T;
        }
        throw new ConflictException({
          message: 'La clave de idempotencia ya se usó con otra solicitud',
          code: ErrorCode.IDEMPOTENCY_KEY_REUSED,
        });
      }
      throw error;
    }
  }

  private async applyDelta(
    tx: StockMutation,
    businessId: string,
    userId: string,
    direction: 'IN' | 'OUT',
    lines: { productId: string; quantity: number }[],
    meta: MovementMeta,
  ): Promise<{ lines: AppliedLine[] }> {
    const applied: AppliedLine[] = [];
    for (const line of lines) {
      const updated = await tx.applyQuantityChange({
        businessId,
        productId: line.productId,
        direction,
        quantity: line.quantity,
      });
      if (updated !== 1) {
        if (direction === 'IN') {
          throw new NotFoundException('El producto no tiene inventario');
        }
        throw new ConflictException({
          message: 'Existencias insuficientes',
          code: ErrorCode.INSUFFICIENT_STOCK,
        });
      }
      const item = await tx.requireStock(businessId, line.productId);
      await tx.recordMovement({
        businessId,
        stockItemId: item.id,
        productId: line.productId,
        type: direction,
        quantity: line.quantity,
        stockAfter: item.quantity,
        reason: meta.reason,
        referenceType: meta.referenceType,
        referenceId: meta.referenceId,
        createdBy: userId,
      });
      applied.push({
        productId: line.productId,
        quantity: line.quantity,
        stockAfter: item.quantity,
      });
    }
    return { lines: applied };
  }

  private async adjust(
    tx: StockMutation,
    actor: JwtPayload,
    dto: CreateMovementInput,
  ): Promise<{ lines: AppliedLine[] }> {
    const item = await tx.findForAdjust(actor.businessId, dto.productId);
    if (!item) {
      throw new NotFoundException('El producto no tiene inventario');
    }
    const delta = Math.abs(dto.quantity - item.quantity);
    const updated = await tx.compareAndSetQuantity(item.id, item.quantity, dto.quantity);
    if (updated !== 1) {
      throw new ConflictException('El inventario cambió, intenta de nuevo');
    }
    if (delta > 0) {
      await tx.recordMovement({
        businessId: actor.businessId,
        stockItemId: item.id,
        productId: dto.productId,
        type: 'ADJUSTMENT',
        quantity: delta,
        stockAfter: dto.quantity,
        reason: dto.reason,
        createdBy: actor.sub,
      });
    }
    return {
      lines: [
        {
          productId: dto.productId,
          quantity: delta,
          stockAfter: dto.quantity,
        },
      ],
    };
  }
}
