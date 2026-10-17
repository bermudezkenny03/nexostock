<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';
import Textarea from 'primevue/textarea';
import { useForm } from 'vee-validate';
import { computed, watch } from 'vue';
import { useProductStock } from '@/modules/inventory';
import { ApiErrorCode, toApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import { useCreateProduct, useUpdateProduct } from '../composables/useProducts';
import {
  emptyProductForm,
  MIN_QUANTITY_MAX,
  PRICE_MAX,
  productFormSchema,
  productToForm,
  toCreatePayload,
  toUpdatePayload,
} from '../schemas/product.schemas';
import type { Category, Product } from '../types';

const props = defineProps<{
  product: Product | null;
  categories: Category[];
}>();

const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ saved: [product: Product] }>();

const notify = useNotify();
const createProduct = useCreateProduct();
const updateProduct = useUpdateProduct();

const isEdit = computed(() => props.product !== null);
const stock = useProductStock(() => (visible.value && props.product ? props.product.id : null));
const previousMinQuantity = computed(() => stock.data.value?.minQuantity ?? null);

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setFieldError, setFieldValue, isFieldDirty } =
  useForm({ validationSchema: toTypedSchema(productFormSchema), initialValues: emptyProductForm() });

const [sku, skuAttrs] = defineField('sku');
const [name, nameAttrs] = defineField('name');
const [description, descriptionAttrs] = defineField('description');
const [categoryId, categoryAttrs] = defineField('categoryId');
const [price, priceAttrs] = defineField('price');
const [minQuantity, minQuantityAttrs] = defineField('minQuantity');

watch(visible, (open) => {
  if (open) {
    resetForm({
      values: props.product ? productToForm(props.product, previousMinQuantity.value) : emptyProductForm(),
    });
  }
});

watch(previousMinQuantity, (value) => {
  if (visible.value && isEdit.value && !isFieldDirty('minQuantity')) {
    setFieldValue('minQuantity', value);
  }
});

/** Active categories, plus the current one if it was deactivated after assignment. */
const categoryOptions = computed(() =>
  props.categories.filter((category) => category.isActive || category.id === props.product?.category?.id),
);

const busy = computed(() => isSubmitting.value || createProduct.isPending.value || updateProduct.isPending.value);

const onSubmit = handleSubmit(async (values) => {
  try {
    const saved = props.product
      ? await updateProduct.mutateAsync({
          id: props.product.id,
          payload: toUpdatePayload(values, previousMinQuantity.value),
        })
      : await createProduct.mutateAsync(toCreatePayload(values));
    notify.success(isEdit.value ? 'Producto actualizado' : 'Producto creado', saved.name);
    emit('saved', saved);
    visible.value = false;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) {
      setFieldError('sku', apiError.message);
    } else if (apiError.code === ApiErrorCode.PLAN_LIMIT_REACHED) {
      notify.warn('Límite del plan alcanzado', apiError.message);
    } else if (apiError.status === 404 && values.categoryId) {
      setFieldError('categoryId', 'La categoría ya no está disponible');
    } else {
      notify.error(apiError, 'No se pudo guardar el producto');
    }
  }
});
</script>

<template>
  <AppDialog v-model:visible="visible" :title="isEdit ? 'Editar producto' : 'Nuevo producto'" :busy="busy" size="lg">
    <form id="product-form" class="grid gap-5 md:grid-cols-2" novalidate @submit="onSubmit">
      <AppFormField
        id="product-sku"
        label="SKU"
        :error="errors.sku"
        hint="Se guarda en mayúsculas y debe ser único."
        required
      >
        <template #default="{ id, invalid, describedBy }">
          <InputText
            :id="id"
            v-model="sku"
            v-bind="skuAttrs"
            :invalid="invalid"
            :aria-describedby="describedBy"
            maxlength="64"
            class="uppercase"
            fluid
          />
        </template>
      </AppFormField>

      <AppFormField id="product-name" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <InputText
            :id="id"
            v-model="name"
            v-bind="nameAttrs"
            :invalid="invalid"
            :aria-describedby="describedBy"
            maxlength="160"
            fluid
          />
        </template>
      </AppFormField>

      <AppFormField id="product-price" label="Precio" :error="errors.price" required>
        <template #default="{ id, invalid }">
          <InputNumber
            v-model="price"
            v-bind="priceAttrs"
            :input-id="id"
            mode="decimal"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :min="0"
            :max="PRICE_MAX"
            prefix="$ "
            locale="es-MX"
            :invalid="invalid"
            fluid
          />
        </template>
      </AppFormField>

      <AppFormField id="product-category" label="Categoría" :error="errors.categoryId">
        <template #default="{ id, invalid }">
          <Select
            v-model="categoryId"
            v-bind="categoryAttrs"
            :label-id="id"
            :options="categoryOptions"
            option-label="name"
            option-value="id"
            placeholder="Sin categoría"
            show-clear
            filter
            :invalid="invalid"
            fluid
          />
        </template>
      </AppFormField>

      <AppFormField
        id="product-min-quantity"
        label="Stock mínimo"
        :error="errors.minQuantity"
        hint="Genera una alerta cuando la existencia llega a este valor."
      >
        <template #default="{ id, invalid }">
          <Skeleton v-if="isEdit && stock.isPending.value" height="2.5rem" />
          <InputNumber
            v-else
            v-model="minQuantity"
            v-bind="minQuantityAttrs"
            :input-id="id"
            :min="0"
            :max="MIN_QUANTITY_MAX"
            :use-grouping="false"
            :invalid="invalid"
            fluid
          />
        </template>
      </AppFormField>

      <AppFormField id="product-description" label="Descripción" :error="errors.description" class="md:col-span-2">
        <template #default="{ id, invalid, describedBy }">
          <Textarea
            :id="id"
            v-model="description"
            v-bind="descriptionAttrs"
            rows="3"
            maxlength="2000"
            auto-resize
            :invalid="invalid"
            :aria-describedby="describedBy"
            fluid
          />
        </template>
      </AppFormField>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" outlined :disabled="busy" @click="visible = false" />
      <Button
        type="submit"
        form="product-form"
        :label="isEdit ? 'Guardar cambios' : 'Crear producto'"
        icon="pi pi-check"
        :loading="busy"
      />
    </template>
  </AppDialog>
</template>
