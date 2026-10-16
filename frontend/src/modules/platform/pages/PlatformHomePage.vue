<script setup lang="ts">
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { describeApiError } from '@/shared/api';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppPageHeader from '@/shared/ui/AppPageHeader.vue';
import AppStatCard from '@/shared/ui/AppStatCard.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatDateTime, formatInteger } from '@/shared/utils/format';
import { usePlatformBusinesses, usePlatformPlans } from '../composables/usePlatform';

// No aggregate stats endpoint exists; totals come from the paginated list envelope.
const allBusinesses = usePlatformBusinesses({ page: 1, pageSize: 1 });
const activeBusinesses = usePlatformBusinesses({ page: 1, pageSize: 1, isActive: true });
const recent = usePlatformBusinesses({ page: 1, pageSize: 5 });
const plans = usePlatformPlans();

const recentError = computed(() => (recent.error.value ? describeApiError(recent.error.value) : null));

function limitLabel(limit: number | null): string {
  return limit === null ? 'Ilimitado' : formatInteger(limit);
}
</script>

<template>
  <div>
    <AppPageHeader title="Plataforma" subtitle="Administración global de negocios y planes de NexoStock." />

    <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AppStatCard
        label="Negocios registrados"
        icon="pi pi-building"
        :loading="allBusinesses.isPending.value"
        :value="allBusinesses.data.value ? formatInteger(allBusinesses.data.value.total) : null"
      />
      <AppStatCard
        label="Negocios activos"
        icon="pi pi-check-circle"
        :loading="activeBusinesses.isPending.value"
        :value="activeBusinesses.data.value ? formatInteger(activeBusinesses.data.value.total) : null"
      />
      <AppStatCard
        label="Planes disponibles"
        icon="pi pi-star"
        :loading="plans.isPending.value"
        :value="plans.data.value ? formatInteger(plans.data.value.length) : null"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <section class="ns-card xl:col-span-2" aria-labelledby="recent-businesses-title">
        <h2 id="recent-businesses-title" class="mt-0 mb-4 text-lg font-semibold">Negocios recientes</h2>
        <AppDataTable
          :value="recent.data.value?.items ?? []"
          data-key="id"
          :loading="recent.isPending.value"
          :error="recentError"
          :paginator="false"
          table-label="Negocios recientes"
          empty-title="Sin negocios registrados"
          @retry="recent.refetch()"
        >
          <Column field="name" header="Negocio" />
          <Column header="Plan">
            <template #body="{ data }"><Tag :value="data.plan.name" severity="secondary" /></template>
          </Column>
          <Column field="activeUsers" header="Usuarios" />
          <Column header="Estado">
            <template #body="{ data }"><AppStatusBadge :status="data.isActive" /></template>
          </Column>
          <Column header="Alta">
            <template #body="{ data }">{{ formatDateTime(data.createdAt) }}</template>
          </Column>
        </AppDataTable>
      </section>

      <section class="ns-card" aria-labelledby="plans-title">
        <h2 id="plans-title" class="mt-0 mb-4 text-lg font-semibold">Planes</h2>
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          <li v-for="plan in plans.data.value ?? []" :key="plan.code" class="plan-row">
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ plan.name }}</span>
              <span class="ns-mono ns-muted">{{ plan.code }}</span>
            </div>
            <p class="ns-muted mt-1 mb-0 text-sm">
              Usuarios: {{ limitLabel(plan.maxUsers) }} · Productos: {{ limitLabel(plan.maxProducts) }}
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.plan-row {
  padding: var(--ns-space-3);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-md);
}
</style>
