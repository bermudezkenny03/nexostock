<script setup lang="ts" generic="T extends object">
import Button from 'primevue/button';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import { PAGE_SIZE_OPTIONS } from '../constants/config';
import type { PageChange } from '../composables/usePagination';
import AppEmptyState from './AppEmptyState.vue';
import AppLoadingState from './AppLoadingState.vue';

const props = withDefaults(
  defineProps<{
    value: T[];
    dataKey: string;
    loading?: boolean;
    error?: string | null;
    /** Server-side pagination when set; otherwise the table paginates client-side. */
    totalRecords?: number;
    first?: number;
    rows?: number;
    paginator?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    /** Accessible name of the table element. */
    tableLabel: string;
  }>(),
  {
    loading: false,
    error: null,
    totalRecords: undefined,
    first: 0,
    rows: 20,
    paginator: true,
    emptyTitle: 'Sin resultados',
    emptyDescription: undefined,
  },
);

const emit = defineEmits<{
  page: [change: PageChange];
  retry: [];
}>();

function onPage(event: DataTablePageEvent): void {
  emit('page', { page: event.page + 1, pageSize: event.rows });
}

const isLazy = () => props.totalRecords !== undefined;
</script>

<template>
  <div class="app-data-table">
    <AppEmptyState v-if="error" variant="error" title="No se pudo cargar la información" :description="error">
      <Button label="Reintentar" icon="pi pi-refresh" severity="secondary" outlined @click="emit('retry')" />
    </AppEmptyState>
    <AppLoadingState v-else-if="loading && value.length === 0" variant="table" />
    <DataTable
      v-else
      :value="value"
      :data-key="dataKey"
      :loading="loading"
      :lazy="isLazy()"
      :total-records="totalRecords"
      :first="first"
      :rows="rows"
      :paginator="paginator && (isLazy() ? (totalRecords ?? 0) > rows : value.length > rows)"
      :rows-per-page-options="PAGE_SIZE_OPTIONS"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      current-page-report-template="{first}–{last} de {totalRecords}"
      row-hover
      responsive-layout="scroll"
      scrollable
      :table-props="{ 'aria-label': tableLabel }"
      @page="onPage"
    >
      <slot />
      <template #empty>
        <AppEmptyState :title="emptyTitle" :description="emptyDescription">
          <slot name="empty-actions" />
        </AppEmptyState>
      </template>
    </DataTable>
  </div>
</template>
