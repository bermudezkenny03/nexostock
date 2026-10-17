import { http, type Page } from '@/shared/api';
import { compactParams, newIdempotencyKey } from '@/shared/utils/query';
import type { CreateMovementPayload, Movement, StockListQuery, StockView, UpdateMinQuantityPayload } from '../types';

export const stockApi = {
  async list(query: StockListQuery = {}): Promise<Page<StockView>> {
    const { data } = await http.get<Page<StockView>>('/inventory/stock', { params: compactParams(query) });
    return data;
  },

  async get(productId: string): Promise<StockView> {
    const { data } = await http.get<StockView>(`/inventory/stock/${encodeURIComponent(productId)}`);
    return data;
  },

  async updateMin(productId: string, payload: UpdateMinQuantityPayload): Promise<StockView> {
    const { data } = await http.patch<StockView>(`/inventory/stock/${encodeURIComponent(productId)}`, payload);
    return data;
  },

  async alerts(): Promise<StockView[]> {
    const { data } = await http.get<StockView[]>('/inventory/alerts');
    return data;
  },

  async movements(query: StockListQuery = {}): Promise<Page<Movement>> {
    const { data } = await http.get<Page<Movement>>('/inventory/movements', { params: compactParams(query) });
    return data;
  },

  async move(payload: CreateMovementPayload): Promise<unknown> {
    const { data } = await http.post('/inventory/movements', payload, {
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    });
    return data;
  },
};
