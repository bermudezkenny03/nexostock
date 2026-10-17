import { http, type Page } from '@/shared/api';
import { compactParams, newIdempotencyKey } from '@/shared/utils/query';
import type { CreateSalePayload, Sale, SaleListQuery } from '../types';

export const salesApi = {
  async list(query: SaleListQuery = {}): Promise<Page<Sale>> {
    const { data } = await http.get<Page<Sale>>('/sales', { params: compactParams(query) });
    return data;
  },

  async get(id: string): Promise<Sale> {
    const { data } = await http.get<Sale>(`/sales/${encodeURIComponent(id)}`);
    return data;
  },

  async create(payload: CreateSalePayload): Promise<Sale> {
    const { data } = await http.post<Sale>('/sales', payload, {
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    });
    return data;
  },

  async cancel(id: string): Promise<Sale> {
    const { data } = await http.post<Sale>(`/sales/${encodeURIComponent(id)}/cancel`);
    return data;
  },
};
