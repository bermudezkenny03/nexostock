import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '@nexostock/common';
import type { Category } from '../domain/catalog';
import { UniqueConstraintError } from '../domain/catalog';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../domain/repositories';

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  list(businessId: string): Promise<Category[]> {
    return this.categories.list(businessId);
  }

  async create(actor: JwtPayload, dto: CreateCategoryInput): Promise<Category> {
    try {
      return await this.categories.create({
        businessId: actor.businessId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      });
    } catch (error) {
      this.rethrowConflict(error, 'Ya existe una categoría con ese nombre');
    }
  }

  async update(id: string, actor: JwtPayload, dto: UpdateCategoryInput): Promise<Category> {
    const current = await this.categories.findInBusiness(id, actor.businessId);
    if (!current) {
      throw new NotFoundException('Categoría no encontrada');
    }
    try {
      return await this.categories.update(id, {
        name: dto.name?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description.trim() || null,
        isActive: dto.isActive,
      });
    } catch (error) {
      this.rethrowConflict(error, 'Ya existe una categoría con ese nombre');
    }
  }

  private rethrowConflict(error: unknown, message: string): never {
    if (error instanceof UniqueConstraintError) {
      throw new ConflictException(message);
    }
    throw error;
  }
}
