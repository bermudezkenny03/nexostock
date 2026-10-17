import { z } from 'zod';
import type { CreateProductPayload, Product, UpdateProductPayload } from '../types';

/** Limits mirror products-service DTOs and the Decimal(12,2) price column. */
export const PRICE_MAX = 9_999_999_999.99;
export const MIN_QUANTITY_MAX = 1_000_000;

export const productFormSchema = z.object({
  sku: z.string().trim().min(1, 'Ingresa el SKU').max(64, 'Máximo 64 caracteres'),
  name: z.string().trim().min(1, 'Ingresa el nombre').max(160, 'Máximo 160 caracteres'),
  description: z.string().max(2000, 'Máximo 2000 caracteres'),
  categoryId: z.string().uuid().nullable(),
  price: z
    .number({ required_error: 'Ingresa el precio', invalid_type_error: 'Ingresa el precio' })
    .min(0, 'El precio no puede ser negativo')
    .max(PRICE_MAX, 'Precio demasiado alto'),
  minQuantity: z
    .number({ invalid_type_error: 'Ingresa un número entero' })
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .max(MIN_QUANTITY_MAX, `Máximo ${MIN_QUANTITY_MAX.toLocaleString('es-MX')}`)
    .nullable(),
});

export type ProductForm = z.infer<typeof productFormSchema>;

export function emptyProductForm(): ProductForm {
  return { sku: '', name: '', description: '', categoryId: null, price: 0, minQuantity: 0 };
}

export function productToForm(product: Product, minQuantity: number | null): ProductForm {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    categoryId: product.category?.id ?? null,
    price: Number(product.price),
    minQuantity,
  };
}

/** The API expects money as a string with at most two decimals. */
export function toMoney(value: number): string {
  return value.toFixed(2);
}

export function toCreatePayload(form: ProductForm): CreateProductPayload {
  const description = form.description.trim();
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    price: toMoney(form.price),
    ...(description ? { description } : {}),
    ...(form.categoryId ? { categoryId: form.categoryId } : {}),
    ...(form.minQuantity !== null ? { minQuantity: form.minQuantity } : {}),
  };
}

/** `minQuantity` is only sent when it changed: the backend forwards it to inventory-service. */
export function toUpdatePayload(form: ProductForm, previousMinQuantity: number | null): UpdateProductPayload {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId,
    price: toMoney(form.price),
    ...(form.minQuantity !== null && form.minQuantity !== previousMinQuantity
      ? { minQuantity: form.minQuantity }
      : {}),
  };
}

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre').max(80, 'Máximo 80 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres'),
});

export type CategoryForm = z.infer<typeof categoryFormSchema>;
