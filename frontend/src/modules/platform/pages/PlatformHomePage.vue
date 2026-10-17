<script setup lang="ts">
import { useQueries } from '@tanstack/vue-query';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Menu from 'primevue/menu';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import AppStatCard from '@/shared/ui/AppStatCard.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatDateTime, formatInteger, formatPlanPrice } from '@/shared/utils/format';
import { platformApi } from '../api/platformApi';
import { platformKeys, useDecidePlanRequest, usePlanRequests, usePlatformBusinesses, usePlatformPlans } from '../composables/usePlatform';

const router = useRouter();
const notify = useNotify();
const confirm = useConfirmAction();
const requests = usePlanRequests();
const decideRequest = useDecidePlanRequest();
const menu = ref<{ toggle: (event: Event) => void } | null>(null);
const planActions = [
  { label: 'Editar catálogo', icon: 'pi pi-pencil', command: () => router.push({ name: 'platform-plans' }) },
  { label: 'Ver negocios', icon: 'pi pi-building', command: () => router.push({ name: 'platform-businesses' }) },
];

const allBusinesses = usePlatformBusinesses({ page: 1, pageSize: 1 });
const activeBusinesses = usePlatformBusinesses({ page: 1, pageSize: 1, isActive: true });
const recent = usePlatformBusinesses({ page: 1, pageSize: 5 });
const plans = usePlatformPlans();

const planCounts = useQueries({
  queries: computed(() =>
    (plans.data.value ?? []).map((plan) => ({
      queryKey: platformKeys.businesses({ page: 1, pageSize: 1, planCode: plan.code }),
      queryFn: () => platformApi.listBusinesses({ page: 1, pageSize: 1, planCode: plan.code }),
    })),
  ),
});

const recentError = computed(() => (recent.error.value ? describeApiError(recent.error.value) : null));
const suspended = computed(() => {
  if (!allBusinesses.data.value || !activeBusinesses.data.value) {
    return null;
  }
  return Math.max(0, allBusinesses.data.value.total - activeBusinesses.data.value.total);
});

const barColors = ['bg-orange-500', 'bg-cyan-500', 'bg-pink-500', 'bg-green-500', 'bg-purple-500', 'bg-teal-500'] as const;
const textColors = ['text-orange-500', 'text-cyan-500', 'text-pink-500', 'text-primary', 'text-purple-500', 'text-teal-500'] as const;

const shares = computed(() => {
  const results = planCounts.value;
  if (results.length === 0 || results.some((query) => query.isPending)) {
    return null;
  }
  const counts = results.map((query) => query.data?.total ?? 0);
  const sum = counts.reduce((total, count) => total + count, 0);
  return counts.map((count) => (sum === 0 ? 0 : Math.round((count / sum) * 100)));
});

function openBusinesses(): void {
  void router.push({ name: 'platform-businesses' });
}

async function resolveRequest(id: string, businessName: string, approve: boolean): Promise<void> {
  const accepted = await confirm({
    title: approve ? 'Confirmar plan' : 'Rechazar solicitud',
    message: approve
      ? `${businessName} pasará al plan solicitado.`
      : `${businessName} se queda en su plan actual.`,
    acceptLabel: approve ? 'Confirmar' : 'Rechazar',
    danger: !approve,
  });
  if (!accepted) {
    return;
  }
  try {
    await decideRequest.mutateAsync({ id, approve });
    notify.success(approve ? 'Plan actualizado' : 'Solicitud rechazada', businessName);
  } catch (error) {
    notify.error(error);
  }
}
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <AppStatCard
        label="Negocios registrados"
        icon="pi pi-building"
        tone="blue"
        :loading="allBusinesses.isPending.value"
        :value="allBusinesses.data.value ? formatInteger(allBusinesses.data.value.total) : null"
        hint="en la plataforma"
      />
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <AppStatCard
        label="Negocios activos"
        icon="pi pi-check-circle"
        tone="cyan"
        :loading="activeBusinesses.isPending.value"
        :value="activeBusinesses.data.value ? formatInteger(activeBusinesses.data.value.total) : null"
        hint="pueden operar"
      />
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <AppStatCard
        label="Negocios suspendidos"
        icon="pi pi-ban"
        tone="orange"
        :loading="allBusinesses.isPending.value || activeBusinesses.isPending.value"
        :value="suspended === null ? null : formatInteger(suspended)"
        hint="sin acceso"
      />
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <AppStatCard
        label="Planes"
        icon="pi pi-star"
        tone="purple"
        :loading="plans.isPending.value"
        :value="plans.data.value ? formatInteger(plans.data.value.length) : null"
        hint="en el catálogo"
      />
    </div>

    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <div class="font-semibold text-xl">Negocios recientes</div>
          <Button icon="pi pi-arrow-right" text rounded severity="secondary" aria-label="Ver negocios" @click="openBusinesses" />
        </div>
        <p v-if="recentError" class="text-red-500">{{ recentError }}</p>
        <DataTable
          :value="recent.data.value?.items ?? []"
          data-key="id"
          :loading="recent.isPending.value"
          :rows="5"
          row-hover
          responsive-layout="scroll"
        >
          <Column header="Negocio" style="width: 45%">
            <template #body="{ data }">
              <span class="text-surface-900 dark:text-surface-0 font-medium">{{ data.name }}</span>
              <div class="mt-1 text-muted-color">{{ data.activeUsers === 1 ? '1 usuario' : `${formatInteger(data.activeUsers)} usuarios` }} · {{ formatDateTime(data.createdAt) }}</div>
            </template>
          </Column>
          <Column header="Plan" style="width: 25%">
            <template #body="{ data }"><Tag :value="data.plan.name" severity="secondary" /></template>
          </Column>
          <Column header="Estado" style="width: 20%">
            <template #body="{ data }"><AppStatusBadge :status="data.isActive" /></template>
          </Column>
          <Column style="width: 10%">
            <template #body="{ data }">
              <Button icon="pi pi-search" text rounded :aria-label="`Ver ${data.name}`" @click="openBusinesses" />
            </template>
          </Column>
          <template #empty>
            <div class="text-muted-color py-4">Sin negocios registrados.</div>
          </template>
        </DataTable>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <div class="font-semibold text-xl">Planes</div>
          <div>
            <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" aria-label="Acciones de planes" @click="menu?.toggle($event)" />
            <Menu ref="menu" :model="planActions" popup class="min-w-40!" />
          </div>
        </div>
        <p v-if="plans.isPending.value" class="text-muted-color">Cargando…</p>
        <p v-else-if="(plans.data.value ?? []).length === 0" class="text-muted-color m-0">No hay planes en el catálogo.</p>
        <ul v-else class="list-none p-0 m-0">
          <li v-for="(plan, index) in plans.data.value" :key="plan.code" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <span class="text-surface-900 dark:text-surface-0 font-medium mr-2">{{ plan.name }}</span>
              <div class="mt-1 text-muted-color">
                {{ plan.code }} · {{ formatPlanPrice(plan.monthlyPrice) }} · Usuarios {{ plan.maxUsers === null ? 'ilimitados' : formatInteger(plan.maxUsers) }}
              </div>
            </div>
            <div class="mt-2 md:mt-0 flex shrink-0 items-center">
              <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-24" style="height: 8px">
                <div class="h-full" :class="barColors[index % barColors.length]" :style="{ width: `${shares?.[index] ?? 0}%` }" />
              </div>
              <span class="ml-4 font-medium" :class="textColors[index % textColors.length]">
                {{ shares ? `%${shares[index] ?? 0}` : '…' }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="col-span-12">
      <div class="card mb-0">
        <div class="font-semibold text-xl mb-4">Solicitudes de plan</div>
        <p v-if="requests.isPending.value" class="text-muted-color m-0">Cargando…</p>
        <p v-else-if="(requests.data.value ?? []).length === 0" class="text-muted-color m-0">No hay solicitudes pendientes.</p>
        <ul v-else class="m-0 list-none p-0">
          <li
            v-for="request in requests.data.value"
            :key="request.id"
            class="flex flex-wrap items-center justify-between gap-3 border-b border-surface py-3 last:border-b-0"
          >
            <div>
              <span class="font-medium text-surface-900 dark:text-surface-0">{{ request.businessName }}</span>
              <div class="mt-1 text-muted-color">
                {{ request.currentPlanName }} → {{ request.requestedPlanName }} · {{ formatDateTime(request.createdAt) }}
              </div>
            </div>
            <div class="flex gap-2">
              <Button
                label="Rechazar"
                severity="secondary"
                outlined
                :disabled="decideRequest.isPending.value"
                @click="resolveRequest(request.id, request.businessName, false)"
              />
              <Button
                label="Confirmar"
                icon="pi pi-check"
                :loading="decideRequest.isPending.value"
                @click="resolveRequest(request.id, request.businessName, true)"
              />
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
