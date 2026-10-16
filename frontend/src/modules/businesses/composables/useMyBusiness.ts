import { useQuery } from '@tanstack/vue-query';
import { businessApi } from '../api/businessApi';

export const businessKeys = {
  all: ['business'] as const,
  mine: () => [...businessKeys.all, 'me'] as const,
};

export function useMyBusiness() {
  return useQuery({
    queryKey: businessKeys.mine(),
    queryFn: businessApi.getMine,
  });
}
