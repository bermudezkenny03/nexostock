<!--
  Markup from Sakai Vue RecentSalesWidget (DataTable, mark, price, view).
  Rows come from GET /sales. No product photos are invented.
  Sakai Vue © PrimeTek, MIT License.
-->
<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { useRouter } from 'vue-router';
import type { Sale } from '@/modules/sales';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatMoney, initials, shortId } from '@/shared/utils/format';

defineProps<{
  items: Sale[];
  loading: boolean;
}>();

const router = useRouter();

function title(sale: Sale): string {
  const first = sale.lines[0]?.productName;
  if (!first) {
    return `Venta ${shortId(sale.id)}`;
  }
  const extra = sale.lines.length - 1;
  return extra > 0 ? `${first} +${extra}` : first;
}

function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <div class="card">
    <div class="font-semibold text-xl mb-4">Ventas recientes</div>
    <DataTable :value="items" :rows="5" :paginator="items.length > 5" :loading="loading" data-key="id" row-hover responsive-layout="scroll">
      <Column header="" style="width: 15%">
        <template #body="{ data }">
          <div
            class="flex items-center justify-center rounded-border bg-blue-100 font-semibold text-blue-500 shadow-sm dark:bg-blue-400/10"
            style="width: 3rem; height: 3rem"
            aria-hidden="true"
          >
            {{ initials(title(data)) }}
          </div>
        </template>
      </Column>
      <Column header="Venta" style="width: 40%">
        <template #body="{ data }">
          <span class="text-surface-900 dark:text-surface-0 font-medium">{{ title(data) }}</span>
          <div class="mt-1 text-muted-color">{{ when(data.createdAt) }}</div>
        </template>
      </Column>
      <Column header="Total" style="width: 20%">
        <template #body="{ data }">{{ formatMoney(data.total) }}</template>
      </Column>
      <Column header="Estado" style="width: 15%">
        <template #body="{ data }"><AppStatusBadge :status="data.status" /></template>
      </Column>
      <Column style="width: 10%">
        <template #body="{ data }">
          <Button
            icon="pi pi-search"
            type="button"
            text
            rounded
            :aria-label="`Ver venta ${shortId(data.id)}`"
            @click="router.push({ name: 'sales', query: { id: data.id } })"
          />
        </template>
      </Column>
      <template #empty>
        <div class="text-muted-color py-4">Aún no hay ventas registradas.</div>
      </template>
    </DataTable>
  </div>
</template>
