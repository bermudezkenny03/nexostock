import { describe, expect, it } from 'vitest';
import {
  productFormSchema,
  toCreatePayload,
  toUpdatePayload,
  type ProductForm,
} from '@/modules/products/schemas/product.schemas';

const form: ProductForm = {
  sku: ' agua-600 ',
  name: ' Agua 600 ml ',
  description: '  ',
  categoryId: null,
  price: 1.5,
  minQuantity: 5,
};

describe('productFormSchema', () => {
  it('accepts a valid form', () => {
    expect(productFormSchema.safeParse(form).success).toBe(true);
  });

  it('rejects empty sku, negative price and fractional min quantity', () => {
    const result = productFormSchema.safeParse({ ...form, sku: '  ', price: -1, minQuantity: 1.5 });

    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['sku', 'price', 'minQuantity']));
  });

  it('rejects a missing price', () => {
    expect(productFormSchema.safeParse({ ...form, price: null }).success).toBe(false);
  });
});

describe('payload mappers', () => {
  it('builds a create payload with money as string and without empty optionals', () => {
    expect(toCreatePayload(form)).toEqual({ sku: 'agua-600', name: 'Agua 600 ml', price: '1.50', minQuantity: 5 });
  });

  it('matches the backend money pattern', () => {
    expect(toCreatePayload({ ...form, price: 1234.5 }).price).toMatch(/^\d+(\.\d{1,2})?$/);
  });

  it('clears category and description on update, and skips unchanged min quantity', () => {
    expect(toUpdatePayload({ ...form, minQuantity: 5 }, 5)).toEqual({
      sku: 'agua-600',
      name: 'Agua 600 ml',
      description: '',
      categoryId: null,
      price: '1.50',
    });
    expect(toUpdatePayload({ ...form, minQuantity: 8 }, 5)).toMatchObject({ minQuantity: 8 });
  });
});
