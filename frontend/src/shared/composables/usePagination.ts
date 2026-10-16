import { computed, ref } from 'vue';
import { DEFAULT_PAGE_SIZE } from '../constants/config';

export interface PageChange {
  page: number;
  pageSize: number;
}

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE) {
  const page = ref(1);
  const pageSize = ref(initialPageSize);

  return {
    page,
    pageSize,
    /** Zero-based index of the first row, as PrimeVue DataTable expects. */
    first: computed(() => (page.value - 1) * pageSize.value),
    onPage(change: PageChange) {
      page.value = change.page;
      pageSize.value = change.pageSize;
    },
    reset() {
      page.value = 1;
    },
  };
}
