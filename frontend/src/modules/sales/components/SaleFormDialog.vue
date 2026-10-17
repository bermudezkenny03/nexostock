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
import { useCreateSale } from '../composables/useSales';

interface LineDraft {
  productId: string | null;
  quantity: number;
}

const visible = defineModel<boolean>('visible', { required: true });
const notify = useNotify();
const createSale = useCreateSale();
const products = useProductLookup();
const lines = ref<LineDraft[]>([{ productId: null, quantity: 1 }]);
const note = ref('');

const activeProducts = computed(() => (products.data.value?.items ?? []).filter((product) => product.isActive));

watch(visible, (open) => {
  if (open) {
    lines.value = [{ productId: null, quantity: 1 }];
    note.value = '';
  }
});

function addLine(): void {
  lines.value.push({ productId: null, quantity: 1 });
}

function removeLine(index: number): void {
  lines.value.splice(index, 1);
  if (lines.value.length === 0) {
    addLine();
  }
}

const canSubmit = computed(
  () => lines.value.some((line) => line.productId && line.quantity > 0) && !createSale.isPending.value,
);

async function onSubmit(): Promise<void> {
  const items = lines.value
    .filter((line): line is { productId: string; quantity: number } => Boolean(line.productId) && line.quantity > 0)
    .map((line) => ({ productId: line.productId, quantity: line.quantity }));
  if (items.length === 0) {
    notify.warn('Agrega al menos un producto');
    return;
  }
  try {
    const saved = await createSale.mutateAsync({
      items,
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    });
    notify.success('Venta registrada', saved.status === 'CONFIRMED' ? 'Confirmada' : saved.status);
    visible.value = false;
  } catch (error) {
    notify.error(toApiError(error), 'No se pudo registrar la venta');
  }
}
</script>

<template>
  <AppDialog v-model:visible="visible" title="Nueva venta" :busy="createSale.isPending.value" size="lg">
    <form id="sale-form" class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div v-for="(line, index) in lines" :key="index" class="grid gap-3 md:grid-cols-12 items-end">
        <AppFormField :id="`sale-product-${index}`" label="Producto" class="md:col-span-8" required>
          <template #default="{ id }">
            <Select
              v-model="line.productId"
              :input-id="id"
              :options="activeProducts"
              option-label="name"
              option-value="id"
              placeholder="Selecciona un producto"
              filter
              fluid
            />
          </template>
        </AppFormField>
        <AppFormField :id="`sale-qty-${index}`" label="Cantidad" class="md:col-span-3" required>
          <template #default="{ id }">
            <InputNumber v-model="line.quantity" :input-id="id" :min="1" :max="1000000" :use-grouping="false" fluid />
          </template>
        </AppFormField>
        <div class="md:col-span-1 pb-1">
          <Button icon="pi pi-times" text rounded severity="secondary" type="button" aria-label="Quitar línea" @click="removeLine(index)" />
        </div>
      </div>
      <div>
        <Button label="Agregar producto" icon="pi pi-plus" severity="secondary" outlined type="button" @click="addLine" />
      </div>
      <AppFormField id="sale-note" label="Nota">
        <template #default="{ id }">
          <Textarea :id="id" v-model="note" rows="2" maxlength="500" auto-resize fluid />
        </template>
      </AppFormField>
    </form>
    <template #footer>
      <Button label="Cancelar" severity="secondary" outlined :disabled="createSale.isPending.value" @click="visible = false" />
      <Button type="submit" form="sale-form" label="Registrar venta" icon="pi pi-check" :loading="createSale.isPending.value" :disabled="!canSubmit" />
    </template>
  </AppDialog>
</template>
