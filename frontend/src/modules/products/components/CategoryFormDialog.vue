<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { useForm } from 'vee-validate';
import { computed, watch } from 'vue';
import { toApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import { useCreateCategory, useUpdateCategory } from '../composables/useProducts';
import { categoryFormSchema } from '../schemas/product.schemas';
import type { Category } from '../types';

const props = defineProps<{ category: Category | null }>();
const visible = defineModel<boolean>('visible', { required: true });

const notify = useNotify();
const createCategory = useCreateCategory();
const updateCategory = useUpdateCategory();
const isEdit = computed(() => props.category !== null);

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(categoryFormSchema),
  initialValues: { name: '', description: '' },
});
const [name, nameAttrs] = defineField('name');
const [description, descriptionAttrs] = defineField('description');

watch(visible, (open) => {
  if (open) {
    resetForm({ values: { name: props.category?.name ?? '', description: props.category?.description ?? '' } });
  }
});

const busy = computed(() => isSubmitting.value || createCategory.isPending.value || updateCategory.isPending.value);

const onSubmit = handleSubmit(async (values) => {
  const payload = { name: values.name.trim(), description: values.description.trim() };
  try {
    const saved = props.category
      ? await updateCategory.mutateAsync({ id: props.category.id, payload })
      : await createCategory.mutateAsync({
          name: payload.name,
          ...(payload.description ? { description: payload.description } : {}),
        });
    notify.success(isEdit.value ? 'Categoría actualizada' : 'Categoría creada', saved.name);
    visible.value = false;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) {
      setFieldError('name', apiError.message);
    } else {
      notify.error(apiError, 'No se pudo guardar la categoría');
    }
  }
});
</script>

<template>
  <AppDialog v-model:visible="visible" :title="isEdit ? 'Editar categoría' : 'Nueva categoría'" :busy="busy">
    <form id="category-form" class="flex flex-col gap-5" novalidate @submit="onSubmit">
      <AppFormField id="category-name" label="Nombre" :error="errors.name" required>
        <template #default="{ id, invalid, describedBy }">
          <InputText
            :id="id"
            v-model="name"
            v-bind="nameAttrs"
            maxlength="80"
            :invalid="invalid"
            :aria-describedby="describedBy"
            fluid
          />
        </template>
      </AppFormField>
      <AppFormField id="category-description" label="Descripción" :error="errors.description">
        <template #default="{ id, invalid, describedBy }">
          <Textarea
            :id="id"
            v-model="description"
            v-bind="descriptionAttrs"
            rows="3"
            maxlength="500"
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
        form="category-form"
        :label="isEdit ? 'Guardar cambios' : 'Crear categoría'"
        icon="pi pi-check"
        :loading="busy"
      />
    </template>
  </AppDialog>
</template>
