<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import { computed, ref, watch } from 'vue';
import { describeApiError } from '@/shared/api';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import { usePagination } from '@/shared/composables/usePagination';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import AppSearchFilter from '@/shared/ui/AppSearchFilter.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { formatDateTime, formatInteger } from '@/shared/utils/format';
import { useChangeBusinessPlan, usePlatformBusinesses, usePlatformPlans, useSetBusinessStatus } from '../composables/usePlatform';
import type { PlatformBusiness } from '../types';

const notify = useNotify();
const confirm = useConfirmAction();
const search = ref('');
const pagination = usePagination();
watch(search, () => pagination.reset());

const query = computed(() => ({
  search: search.value || undefined,
  page: pagination.page.value,
  pageSize: pagination.pageSize.value,
}));

const businesses = usePlatformBusinesses(query);
const plans = usePlatformPlans();
const setStatus = useSetBusinessStatus();
const changePlan = useChangeBusinessPlan();
const listError = computed(() => (businesses.error.value ? describeApiError(businesses.error.value) : null));

const planTarget = ref<PlatformBusiness | null>(null);
const planCode = ref<string | null>(null);
const planVisible = computed({
  get: () => planTarget.value !== null,
  set: (open: boolean) => {
    if (!open) {
      planTarget.value = null;
    }
  },
});

function openPlan(row: PlatformBusiness): void {
  planTarget.value = row;
  planCode.value = row.plan.code;
}

async function savePlan(): Promise<void> {
  if (!planTarget.value || !planCode.value) {
    return;
  }
  try {
    await changePlan.mutateAsync({ businessId: planTarget.value.id, planCode: planCode.value });
    notify.success('Plan actualizado', planTarget.value.name);
    planTarget.value = null;
  } catch (error) {
    notify.error(error);
  }
}

async function toggleActive(row: PlatformBusiness): Promise<void> {
  const activate = !row.isActive;
  const accepted = await confirm({
    title: activate ? 'Activar negocio' : 'Suspender negocio',
    message: activate
      ? `"${row.name}" volverá a poder iniciar sesión.`
      : `"${row.name}" quedará suspendido y sus usuarios no podrán entrar.`,
    acceptLabel: activate ? 'Activar' : 'Suspender',
    danger: !activate,
  });
  if (!accepted) {
    return;
  }
  try {
    await setStatus.mutateAsync({ businessId: row.id, isActive: activate });
    notify.success(activate ? 'Negocio activado' : 'Negocio suspendido', row.name);
  } catch (error) {
    notify.error(error);
  }
}
</script>

<template>
  <div>
    <div class="card">
      <h4 class="m-0 mb-4">Negocios</h4>
      <Toolbar class="mb-6">
        <template #end>
          <AppSearchFilter v-model="search" placeholder="Buscar..." label="Buscar negocios" />
        </template>
      </Toolbar>

      <AppDataTable
        :value="businesses.data.value?.items ?? []"
        data-key="id"
        :loading="businesses.isFetching.value"
        :error="listError"
        :total-records="businesses.data.value?.total ?? 0"
        :first="pagination.first.value"
        :rows="pagination.pageSize.value"
        table-label="Negocios de la plataforma"
        :empty-title="search ? 'Sin coincidencias' : 'Sin negocios registrados'"
        @page="pagination.onPage"
        @retry="businesses.refetch()"
      >
        <Column field="name" header="Negocio" sortable style="min-width: 12rem" />
        <Column header="Plan" style="min-width: 8rem">
          <template #body="{ data }"><Tag :value="data.plan.name" severity="secondary" /></template>
        </Column>
        <Column header="Usuarios" style="min-width: 7rem">
          <template #body="{ data }">{{ formatInteger(data.activeUsers) }}</template>
        </Column>
        <Column header="Estado" style="min-width: 8rem">
          <template #body="{ data }"><AppStatusBadge :status="data.isActive" /></template>
        </Column>
        <Column header="Alta" style="min-width: 10rem">
          <template #body="{ data }">{{ formatDateTime(data.createdAt) }}</template>
        </Column>
        <Column :exportable="false" style="min-width: 10rem">
          <template #body="{ data }">
            <Button icon="pi pi-star" text rounded severity="secondary" :aria-label="`Cambiar plan de ${data.name}`" @click="openPlan(data)" />
            <Button
              :icon="data.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
              text
              rounded
              :severity="data.isActive ? 'danger' : 'success'"
              :aria-label="`${data.isActive ? 'Suspender' : 'Activar'} ${data.name}`"
              @click="toggleActive(data)"
            />
          </template>
        </Column>
      </AppDataTable>
    </div>

    <AppDialog v-model:visible="planVisible" title="Cambiar plan" :busy="changePlan.isPending.value">
      <AppFormField id="business-plan" label="Plan">
        <template #default="{ id }">
          <Select
            v-model="planCode"
            :input-id="id"
            :options="plans.data.value ?? []"
            option-label="name"
            option-value="code"
            fluid
          />
        </template>
      </AppFormField>
      <template #footer>
        <Button label="Cancelar" severity="secondary" outlined :disabled="changePlan.isPending.value" @click="planTarget = null" />
        <Button label="Guardar" icon="pi pi-check" :loading="changePlan.isPending.value" :disabled="!planCode" @click="savePlan" />
      </template>
    </AppDialog>
  </div>
</template>
