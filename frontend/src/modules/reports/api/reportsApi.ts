import { http } from '@/shared/api';
import type { DateRange, LowStockItem, ReportsOverview } from '../types';

export const reportsApi = {
  async overview(range: DateRange = {}): Promise<ReportsOverview> {
    const { data } = await http.get<ReportsOverview>('/reports/overview', { params: range });
    return data;
  },

  async lowStock(): Promise<LowStockItem[]> {
    const { data } = await http.get<LowStockItem[]>('/reports/low-stock');
    return data;
  },
};
