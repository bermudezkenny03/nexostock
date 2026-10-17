<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { useForm } from 'vee-validate';
import { computed, watch } from 'vue';
import { z } from 'zod';
import { toApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import { useCreateRole, usePermissionCatalog, useRoleDetail, useUpdateRole } from '../composables/useUsers';
import type { RoleListItem } from '../types';

const props = defineProps<{ role: RoleListItem | null }>();
const visible = defineModel<boolean>('visible', { required: true });
const notify = useNotify();
const permissions = usePermissionCatalog();
const createRole = useCreateRole();
const updateRole = useUpdateRole();
const isEdit = computed(() => props.role !== null);
const detail = useRoleDetail(() => (visible.value && props.role ? props.role.id : null));

const schema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre').max(120),
  code: z.string().trim().max(64),
  description: z.string().max(500),
  permissionIds: z.array(z.string().uuid()),
});

const { defineField, errors, handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { name: '', code: '', description: '', permissionIds: [] as string[] },
});

const [name, nameAttrs] = defineField('name');
const [code, codeAttrs] = defineField('code');
const [description, descriptionAttrs] = defineField('description');
const [permissionIds, permissionAttrs] = defineField('permissionIds');

watch(visible, (open) => {
  if (open) {
    resetForm({
      values: {
        name: props.role?.name ?? '',
        code: props.role?.code ?? '',
        description: props.role?.description ?? '',
        permissionIds: [],
      },
    });
  }
});

watch(
  () => detail.data.value,
  (value) => {
    if (visible.value && value) {
      resetForm({
        values: {
          name: value.name,
          code: value.code,
          description: value.description ?? '',
          permissionIds: [...value.permissionIds],
        },
      });
    }
  },
);

const busy = computed(() => isSubmitting.value || createRole.isPending.value || updateRole.isPending.value || (isEdit.value && detail.isPending.value));

const onSubmit = handleSubmit(async (values) => {
  try {
    if (props.role) {
      await updateRole.mutateAsync({
        id: props.role.id,
        payload: {
          name: values.name,
          description: values.description.trim() ? values.description.trim() : null,
          permissionIds: values.permissionIds,
        },
      });
      notify.success('Rol actualizado', values.name);
    } else {
      await createRole.mutateAsync({
        name: values.name,
        ...(values.code.trim() ? { code: values.code.trim().toUpperCase() } : {}),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        permissionIds: values.permissionIds,
      });
      notify.success('Rol creado', values.name);
    }
    visible.value = false;
  } catch (error) {
    notify.error(toApiError(error), 'No se pudo guardar el rol');
  }
});
</script>

<template>
  <AppDialog v-model:visible="visible" :title="isEdit ? 'Editar rol' : 'Nuevo rol'" :busy="busy" size="lg">
    <form id="role-form" class="flex flex-col gap-4" novalidate @submit="onSubmit">
      <div class="grid gap-4 md:grid-cols-2">
        <AppFormField id="role-name" label="Nombre" :error="errors.name" required>
          <template #default="{ id, invalid }">
            <InputText :id="id" v-model="name" v-bind="nameAttrs" :invalid="invalid" maxlength="120" fluid />
          </template>
        </AppFormField>
        <AppFormField id="role-code" label="Código" :error="errors.code" hint="Si lo dejas vacío se genera a partir del nombre.">
          <template #default="{ id, invalid }">
            <InputText :id="id" v-model="code" v-bind="codeAttrs" :invalid="invalid" :disabled="isEdit" maxlength="64" class="uppercase" fluid />
          </template>
        </AppFormField>
      </div>
      <AppFormField id="role-description" label="Descripción" :error="errors.description">
        <template #default="{ id, invalid }">
          <Textarea :id="id" v-model="description" v-bind="descriptionAttrs" rows="2" maxlength="500" auto-resize :invalid="invalid" fluid />
        </template>
      </AppFormField>
      <AppFormField id="role-permissions" label="Permisos" :error="errors.permissionIds">
        <template #default="{ id }">
          <MultiSelect
            v-model="permissionIds"
            v-bind="permissionAttrs"
            :input-id="id"
            :options="permissions.data.value ?? []"
            option-label="name"
            option-value="id"
            filter
            display="chip"
            placeholder="Selecciona permisos"
            :loading="permissions.isPending.value"
            class="w-full"
          />
        </template>
      </AppFormField>
    </form>
    <template #footer>
      <Button label="Cancelar" severity="secondary" outlined :disabled="busy" @click="visible = false" />
      <Button type="submit" form="role-form" :label="isEdit ? 'Guardar cambios' : 'Crear rol'" icon="pi pi-check" :loading="busy" />
    </template>
  </AppDialog>
</template>
