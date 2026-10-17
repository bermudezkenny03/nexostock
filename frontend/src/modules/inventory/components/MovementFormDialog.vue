<script setup lang="ts">
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, ref, watch } from 'vue';
import { useProductLookup } from '@/modules/products';
import { toApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import { useCreateMovement } from '../composables/useStock';
import type { MovementType } from '../types';

const visible = defineModel<boolean>('visible', { required: true });
const notify = useNotify();
const createMovement = useCreateMovement();
const products = useProductLookup();

const productId = ref<string | null>(null);
const type = ref<MovementType>('IN');
const quantity = ref(1);
const reason = ref('');

const types: { label: string; value: MovementType }[] = [
  { label: 'Entrada', value: 'IN' },
  { label: 'Salida', value: 'OUT' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
];

watch(visible, (open) => {
  if (open) {
    productId.value = null;
    type.value = 'IN';
    quantity.value = 1;
    reason.value = '';
  }
});

const canSubmit = computed(() => Boolean(productId.value) && quantity.value >= 0 && !createMovement.isPending.value);

async function onSubmit(): Promise<void> {
  if (!productId.value) {
    return;
  }
  try {
    await createMovement.mutateAsync({
      productId: productId.value,
      type: type.value,
      quantity: quantity.value,
      ...(reason.value.trim() ? { reason: reason.value.trim() } : {}),
    });
    notify.success('Movimiento registrado');
    visible.value = false;
  } catch (error) {
    notify.error(toApiError(error), 'No se pudo registrar el movimiento');
  }
}
</script>

<template>
  <AppDialog v-model:visible="visible" title="Nuevo movimiento" :busy="createMovement.isPending.value">
    <form id="movement-form" class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <AppFormField id="movement-product" label="Producto" required>
        <template #default="{ id }">
          <Select
            v-model="productId"
            :input-id="id"
            :options="products.data.value?.items ?? []"
            option-label="name"
            option-value="id"
            placeholder="Selecciona un producto"
            filter
            :loading="products.isPending.value"
            fluid
          />
        </template>
      </AppFormField>
      <AppFormField id="movement-type" label="Tipo" required>
        <template #default="{ id }">
          <Select v-model="type" :input-id="id" :options="types" option-label="label" option-value="value" fluid />
        </template>
      </AppFormField>
      <AppFormField id="movement-qty" label="Cantidad" required>
        <template #default="{ id }">
          <InputNumber v-model="quantity" :input-id="id" :min="0" :max="1000000" :use-grouping="false" fluid />
        </template>
      </AppFormField>
      <AppFormField id="movement-reason" label="Motivo">
        <template #default="{ id }">
          <Textarea :id="id" v-model="reason" rows="2" maxlength="300" auto-resize fluid />
        </template>
      </AppFormField>
    </form>
    <template #footer>
      <Button label="Cancelar" severity="secondary" outlined :disabled="createMovement.isPending.value" @click="visible = false" />
      <Button type="submit" form="movement-form" label="Registrar" icon="pi pi-check" :loading="createMovement.isPending.value" :disabled="!canSubmit" />
    </template>
  </AppDialog>
</template>
