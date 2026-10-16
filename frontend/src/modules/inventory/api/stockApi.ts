import { http } from '@/shared/api';
import type { StockView } from '../types';

export const stockApi = {
  async get(productId: string): Promise<StockView> {
    const { data } = await http.get<StockView>(`/inventory/stock/${encodeURIComponent(productId)}`);
    return data;
  },
};
