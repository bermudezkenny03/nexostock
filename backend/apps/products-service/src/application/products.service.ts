import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode, type JwtPayload } from '@nexostock/common';
import { UniqueConstraintError, type Product, type ProductPage, type ProductQuote } from '../domain/catalog';
import { PlanLimitReached, assertProductSlot } from '../domain/plan-limit';
import {
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
  type CategoryRepository,
  type ProductRepository,
} from '../domain/repositories';

export const AUTH_PORT = Symbol('AuthPort');
export const INVENTORY_PORT = Symbol('InventoryPort');

export interface BusinessPlanStatus {
  isActive: boolean;
  planName: string;
  maxProducts: number | null;
}

export interface AuthPort {
  status(businessId: string): Promise<BusinessPlanStatus>;
}

export interface InventoryPort {
  ensure(productId: string, accessToken: string, minQuantity?: number): Promise<void>;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: string;
  minQuantity?: number;
}

export interface UpdateProductInput {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string | null;
  price?: string;
  isActive?: boolean;
  minQuantity?: number;
}

export interface ListProductsInput {
  search?: string;
  categoryId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface QuoteProductsInput {
  productIds: string[];
  includeInactive?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(AUTH_PORT) private readonly authClient: AuthPort,
    @Inject(INVENTORY_PORT) private readonly inventoryClient: InventoryPort,
  ) {}

  list(businessId: string, query: ListProductsInput): Promise<ProductPage> {
    return this.products.search({
      businessId,
      includeInactive: query.includeInactive,
      categoryId: query.categoryId,
      search: query.search,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async findOne(id: string, businessId: string): Promise<Product> {
    const row = await this.products.findInBusiness(id, businessId);
    if (!row) {
      throw new NotFoundException('Producto no encontrado');
    }
    return row;
  }

  async create(
    actor: JwtPayload,
    dto: CreateProductInput,
    accessToken: string,
  ): Promise<Product> {
    const status = await this.authClient.status(actor.businessId);
    if (!status.isActive) {
      throw new ForbiddenException({
        message: 'El negocio está suspendido',
        code: ErrorCode.BUSINESS_INACTIVE,
      });
    }
    const activeProducts = await this.products.countActive(actor.businessId);
    try {
      assertProductSlot(activeProducts, status.maxProducts, status.planName);
    } catch (error) {
      this.rethrowPlanLimit(error);
    }
    if (dto.categoryId) {
      await this.requireCategory(dto.categoryId, actor.businessId);
    }

    let created: Product;
    try {
      created = await this.products.create({
        businessId: actor.businessId,
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        categoryId: dto.categoryId,
        price: dto.price,
      });
    } catch (error) {
      this.rethrowConflict(error);
    }

    try {
      await this.inventoryClient.ensure(created.id, accessToken, dto.minQuantity);
    } catch (error) {
      await this.products.delete(created.id).catch(() => undefined);
      throw error;
    }
    return created;
  }

  async update(
    id: string,
    actor: JwtPayload,
    dto: UpdateProductInput,
    accessToken: string,
  ): Promise<Product> {
    const current = await this.products.findInBusiness(id, actor.businessId);
    if (!current) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (dto.isActive === true && !current.isActive) {
      const status = await this.authClient.status(actor.businessId);
      const activeProducts = await this.products.countActive(actor.businessId);
      try {
        assertProductSlot(activeProducts, status.maxProducts, status.planName);
      } catch (error) {
        this.rethrowPlanLimit(error);
      }
    }
    if (dto.categoryId) {
      await this.requireCategory(dto.categoryId, actor.businessId);
    }

    try {
      const row = await this.products.update(id, {
        sku: dto.sku?.trim().toUpperCase(),
        name: dto.name?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description.trim() || null,
        price: dto.price,
        isActive: dto.isActive,
        categoryId: dto.categoryId,
      });
      if (dto.minQuantity !== undefined) {
        await this.inventoryClient.ensure(row.id, accessToken, dto.minQuantity);
      }
      return row;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  quote(businessId: string, dto: QuoteProductsInput): Promise<ProductQuote[]> {
    return this.products.quote(businessId, dto.productIds, dto.includeInactive === true);
  }

  summary(businessId: string): Promise<{ active: number; total: number }> {
    return this.products.summary(businessId);
  }

  private async requireCategory(id: string, businessId: string): Promise<void> {
    const category = await this.categories.findActive(id, businessId);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }

  private rethrowConflict(error: unknown): never {
    if (error instanceof UniqueConstraintError) {
      throw new ConflictException('Ya existe un producto con ese SKU');
    }
    throw error;
  }

  private rethrowPlanLimit(error: unknown): never {
    if (error instanceof PlanLimitReached) {
      throw new ForbiddenException({
        message: error.message,
        code: ErrorCode.PLAN_LIMIT_REACHED,
      });
    }
    throw error;
  }
}
