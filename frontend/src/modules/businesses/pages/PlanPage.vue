<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useProductList } from '@/modules/products';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import { usePermissions } from '@/shared/composables/usePermissions';
import { Permission } from '@/shared/constants/permissions';
import { formatInteger, formatPlanPrice } from '@/shared/utils/format';
import { useMyBusiness, useMyPlanRequest, usePublicPlans, useRequestPlanChange } from '../composables/useMyBusiness';

const PERMISSION_LABELS: Record<string, string> = {
  [Permission.DASHBOARD_VIEW]: 'Ver panel',
  [Permission.DASHBOARD_MANAGE]: 'Administrar panel',
  [Permission.PRODUCTS_VIEW]: 'Ver productos',
  [Permission.PRODUCTS_MANAGE]: 'Administrar productos',
  [Permission.INVENTORY_VIEW]: 'Ver inventario',
  [Permission.INVENTORY_MANAGE]: 'Administrar inventario',
  [Permission.SALES_VIEW]: 'Ver ventas',
  [Permission.SALES_MANAGE]: 'Registrar ventas',
  [Permission.REPORTS_VIEW]: 'Ver reportes',
  [Permission.REPORTS_MANAGE]: 'Administrar reportes',
  [Permission.USERS_MANAGE]: 'Administrar usuarios',
  [Permission.ROLES_MANAGE]: 'Administrar roles',
  [Permission.BUSINESS_MANAGE]: 'Administrar el negocio',
  [Permission.MODULES_VIEW]: 'Ver módulos',
  [Permission.PLATFORM_MANAGE]: 'Administrar la plataforma',
};

const route = useRoute();
const notify = useNotify();
const confirm = useConfirmAction();
const { can } = usePermissions();
const canManageBusiness = computed(() => can(Permission.BUSINESS_MANAGE));
const simulatedPlan = computed(() => (typeof route.query.simulado === 'string' ? route.query.simulado : null));
const assignedPlan = computed(() => (typeof route.query.asignado === 'string' ? route.query.asignado : null));
const business = useMyBusiness();
const planRequest = useMyPlanRequest();
const catalog = usePublicPlans();
const requestPlan = useRequestPlanChange();
const canCountProducts = computed(() => can([Permission.PRODUCTS_VIEW, Permission.SALES_VIEW]));
const products = useProductList(computed(() => ({ page: 1, pageSize: 1 })), canCountProducts);

const profile = computed(() => business.data.value);
const plan = computed(() => profile.value?.plan);
const planPrice = computed(() => {
  const price = (plan.value as { monthlyPrice?: string | null } | undefined)?.monthlyPrice;
  return price === undefined ? null : formatPlanPrice(price);
});
const error = computed(() => (business.error.value ? describeApiError(business.error.value) : null));

const activeProducts = computed(() => (canCountProducts.value ? (products.data.value?.total ?? null) : null));

const tones = {
  blue: { wrap: 'bg-blue-100 dark:bg-blue-400/10', icon: 'text-blue-500' },
  orange: { wrap: 'bg-orange-100 dark:bg-orange-400/10', icon: 'text-orange-500' },
};

const usages = computed(() => {
  if (!plan.value || !profile.value) {
    return [];
  }
  return [
    { label: 'Usuarios activos', used: profile.value.activeUsers, limit: plan.value.maxUsers, icon: 'pi pi-users', tone: 'blue' as const, pending: false },
    {
      label: 'Productos activos',
      used: activeProducts.value,
      limit: plan.value.maxProducts,
      icon: 'pi pi-box',
      tone: 'orange' as const,
      pending: canCountProducts.value && products.isPending.value,
    },
  ];
});

function limitLabel(limit: number | null): string {
  return limit === null ? 'Ilimitado' : formatInteger(limit);
}

function percent(used: number | null, limit: number | null): number {
  if (used === null || limit === null || limit === 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / limit) * 100));
}

function permissionLabel(code: string): string {
  return PERMISSION_LABELS[code] ?? code;
}

const otherPlans = computed(() => (catalog.data.value ?? []).filter((item) => item.code !== plan.value?.code));

async function askPlanChange(planCode: string, planName: string): Promise<void> {
  const accepted = await confirm({
    title: 'Solicitar cambio de plan',
    message: `Se pedirá pasar a ${planName}. No se cobra nada. El administrador de la plataforma confirma el cambio.`,
    acceptLabel: 'Solicitar',
  });
  if (!accepted) {
    return;
  }
  try {
    await requestPlan.mutateAsync(planCode);
    notify.success('Solicitud enviada', planName);
  } catch (error) {
    notify.error(error, 'No se pudo solicitar el cambio');
  }
}
</script>

<template>
  <div>
    <Message v-if="simulatedPlan" severity="info" :closable="false" class="mb-4">
      El pago de {{ simulatedPlan }} fue una simulación. El plan que ves aquí es el que devolvió el servidor.
    </Message>
    <Message v-else-if="assignedPlan && plan && plan.code === assignedPlan" severity="success" :closable="false" class="mb-4">
      El pago fue una simulación. El plan {{ plan.name }} sí quedó asignado.
    </Message>

    <Message v-if="error" severity="error" :closable="false" class="mb-4">
      {{ error }}
      <Button label="Reintentar" icon="pi pi-refresh" text size="small" class="ml-2" @click="business.refetch()" />
    </Message>

    <div class="grid grid-cols-12 gap-8">
      <div class="col-span-12">
        <div class="card mb-0">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span class="block text-muted-color font-medium mb-2">Plan del negocio</span>
              <div v-if="business.isPending.value" class="text-muted-color">Cargando…</div>
              <template v-else-if="profile && plan">
                <div class="text-surface-900 dark:text-surface-0 font-medium text-3xl mb-2">{{ plan.name }}</div>
                <p v-if="planPrice" class="text-surface-900 dark:text-surface-0 m-0 mb-2">{{ planPrice }}</p>
                <p class="text-muted-color m-0">{{ profile.name }}</p>
                <p v-if="plan.description" class="text-muted-color mt-3 mb-0">{{ plan.description }}</p>
              </template>
            </div>
            <Tag v-if="plan" :value="plan.code" icon="pi pi-star" />
          </div>
        </div>
      </div>

      <div v-for="usage in usages" :key="usage.label" class="col-span-12 lg:col-span-6">
        <div class="card mb-0">
          <div class="flex justify-between mb-4">
            <div>
              <span class="block text-muted-color font-medium mb-4">{{ usage.label }}</span>
              <Skeleton v-if="business.isPending.value || usage.pending" width="8rem" height="1.5rem" />
              <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ usage.used === null ? '—' : formatInteger(usage.used) }}
                <span class="text-muted-color text-base font-normal"> / {{ limitLabel(usage.limit) }}</span>
              </div>
            </div>
            <div class="flex items-center justify-center rounded-border" :class="tones[usage.tone].wrap" style="width: 2.5rem; height: 2.5rem">
              <i :class="[usage.icon, tones[usage.tone].icon, 'text-xl!']" />
            </div>
          </div>
          <ProgressBar
            v-if="usage.limit !== null && usage.used !== null"
            :value="percent(usage.used, usage.limit)"
            :show-value="false"
            style="height: 0.5rem"
            :aria-label="`${usage.label}: ${percent(usage.used, usage.limit)}% del límite`"
          />
          <p v-else-if="usage.limit === null && usage.used !== null" class="text-muted-color m-0">Sin límite en este plan.</p>
          <p v-else-if="usage.label.startsWith('Productos') && !canCountProducts" class="text-muted-color m-0">
            Tu rol no incluye el listado de productos.
          </p>
        </div>
      </div>

      <div v-if="plan" class="col-span-12">
        <div class="card mb-0">
          <div class="font-semibold text-xl mb-4">Incluye</div>
          <div v-if="plan.permissions.length === 0" class="text-muted-color">Este plan no declara permisos.</div>
          <div v-else class="flex flex-wrap gap-2">
            <Tag v-for="code in plan.permissions" :key="code" :value="permissionLabel(code)" severity="secondary" />
          </div>
          <p v-if="!canManageBusiness" class="text-muted-color mt-4 mb-0">El cambio de plan lo pide quien administra el negocio.</p>
          <div v-else class="mt-4">
            <Message v-if="planRequest.data.value" severity="info" :closable="false">
              Hay una solicitud para pasar a {{ planRequest.data.value.requestedPlanName }}. El administrador de la plataforma la revisa.
            </Message>
            <template v-else-if="otherPlans.length > 0">
              <p class="text-muted-color mt-0 mb-3">Pide otro plan. No se cobra; la plataforma lo confirma.</p>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="option in otherPlans"
                  :key="option.code"
                  :label="`Solicitar ${option.name}`"
                  icon="pi pi-star"
                  severity="secondary"
                  outlined
                  :loading="requestPlan.isPending.value"
                  @click="askPlanChange(option.code, option.name)"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
