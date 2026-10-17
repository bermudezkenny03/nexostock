<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { computed, ref } from 'vue';
import { describeApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import AppPageHeader from '@/shared/ui/AppPageHeader.vue';
import { formatInteger, formatPlanPrice } from '@/shared/utils/format';
import { usePlatformPlans, useUpdatePlatformPlan } from '../composables/usePlatform';
import type { PlatformPlan } from '../types';

const notify = useNotify();
const plans = usePlatformPlans();
const updatePlan = useUpdatePlatformPlan();
const listError = computed(() => (plans.error.value ? describeApiError(plans.error.value) : null));

const visible = ref(false);
const editing = ref<PlatformPlan | null>(null);
const name = ref('');
const description = ref('');
const maxUsers = ref('');
const maxProducts = ref('');
const monthlyPrice = ref('');
const formError = ref<string | null>(null);

function limitText(value: number | null): string {
  return value === null ? 'Ilimitado' : formatInteger(value);
}

function open(plan: PlatformPlan): void {
  editing.value = plan;
  name.value = plan.name;
  description.value = plan.description ?? '';
  maxUsers.value = plan.maxUsers === null ? '' : String(plan.maxUsers);
  maxProducts.value = plan.maxProducts === null ? '' : String(plan.maxProducts);
  monthlyPrice.value = plan.monthlyPrice ?? '';
  formError.value = null;
  visible.value = true;
}

function parseLimit(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new Error(`${label} debe ser un entero mayor que cero, o vacío si no hay límite.`);
  }
  return Number(trimmed);
}

function parsePrice(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('El precio mensual usa hasta dos decimales, o queda vacío si no se publica.');
  }
  return trimmed;
}

async function save(): Promise<void> {
  if (!editing.value) {
    return;
  }
  formError.value = null;
  const trimmedName = name.value.trim();
  if (!trimmedName) {
    formError.value = 'El nombre es obligatorio.';
    return;
  }
  let users: number | null;
  let products: number | null;
  let price: string | null;
  try {
    users = parseLimit(maxUsers.value, 'Usuarios');
    products = parseLimit(maxProducts.value, 'Productos');
    price = parsePrice(monthlyPrice.value);
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Revisa los datos.';
    return;
  }
  try {
    await updatePlan.mutateAsync({
      code: editing.value.code,
      body: {
        name: trimmedName,
        description: description.value.trim() || null,
        maxUsers: users,
        maxProducts: products,
        monthlyPrice: price,
      },
    });
    visible.value = false;
    notify.success('Plan actualizado', trimmedName);
  } catch (error) {
    formError.value = describeApiError(error);
  }
}
</script>

<template>
  <div>
    <AppPageHeader
      title="Planes"
      subtitle="Nombre, descripción, límites y precio mensual. El código no cambia. El precio vacío significa que todavía no se publica."
    />

    <div class="card">
      <AppDataTable
        :value="plans.data.value ?? []"
        data-key="code"
        :loading="plans.isPending.value"
        :error="listError"
        :paginator="false"
        table-label="Catálogo de planes"
        empty-title="No hay planes"
        @retry="plans.refetch()"
      >
        <Column field="name" header="Plan" />
        <Column field="code" header="Código" />
        <Column header="Precio">
          <template #body="{ data }">{{ formatPlanPrice(data.monthlyPrice) }}</template>
        </Column>
        <Column header="Usuarios">
          <template #body="{ data }">{{ limitText(data.maxUsers) }}</template>
        </Column>
        <Column header="Productos">
          <template #body="{ data }">{{ limitText(data.maxProducts) }}</template>
        </Column>
        <Column header="" style="width: 6rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded aria-label="Editar plan" @click="open(data)" />
          </template>
        </Column>
      </AppDataTable>
    </div>

    <AppDialog v-model:visible="visible" :title="editing ? `Editar ${editing.code}` : 'Editar plan'" :busy="updatePlan.isPending.value">
      <form id="plan-form" class="flex flex-col gap-4" @submit.prevent="save">
        <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>
        <AppFormField id="plan-name" label="Nombre" required>
          <template #default="{ id }">
            <InputText :id="id" v-model="name" maxlength="80" fluid />
          </template>
        </AppFormField>
        <AppFormField id="plan-description" label="Descripción">
          <template #default="{ id }">
            <Textarea :id="id" v-model="description" rows="3" maxlength="300" auto-resize fluid />
          </template>
        </AppFormField>
        <div class="grid gap-4 md:grid-cols-2">
          <AppFormField id="plan-users" label="Usuarios" hint="Vacío = sin límite">
            <template #default="{ id, describedBy }">
              <InputText :id="id" v-model="maxUsers" inputmode="numeric" :aria-describedby="describedBy" fluid />
            </template>
          </AppFormField>
          <AppFormField id="plan-products" label="Productos" hint="Vacío = sin límite">
            <template #default="{ id, describedBy }">
              <InputText :id="id" v-model="maxProducts" inputmode="numeric" :aria-describedby="describedBy" fluid />
            </template>
          </AppFormField>
        </div>
        <AppFormField id="plan-price" label="Precio mensual" hint="Vacío = sin publicar. 0 = gratis.">
          <template #default="{ id, describedBy }">
            <InputText :id="id" v-model="monthlyPrice" inputmode="decimal" :aria-describedby="describedBy" fluid />
          </template>
        </AppFormField>
      </form>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text :disabled="updatePlan.isPending.value" @click="visible = false" />
        <Button type="submit" form="plan-form" label="Guardar" icon="pi pi-check" :loading="updatePlan.isPending.value" />
      </template>
    </AppDialog>
  </div>
</template>
