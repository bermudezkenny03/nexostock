<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import { useForm } from 'vee-validate';
import { computed, watch } from 'vue';
import { z } from 'zod';
import { strongPasswordSchema } from '@/modules/auth';
import { toApiError } from '@/shared/api';
import { useNotify } from '@/shared/composables/useNotify';
import AppDialog from '@/shared/ui/AppDialog.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import { useCreateUser, useRoles, useUpdateUser } from '../composables/useUsers';
import type { UserListItem } from '../types';

const props = defineProps<{ user: UserListItem | null }>();
const visible = defineModel<boolean>('visible', { required: true });
const notify = useNotify();
const roles = useRoles();
const createUser = useCreateUser();
const updateUser = useUpdateUser();
const isEdit = computed(() => props.user !== null);

const schema = z
  .object({
    email: z.string().trim().min(1, 'Ingresa el correo').email('Correo no válido').max(254),
    firstName: z.string().trim().min(1, 'Ingresa el nombre').max(120),
    lastName: z.string().trim().min(1, 'Ingresa el apellido').max(120),
    phone: z.string().max(30),
    roleId: z.string().uuid('Selecciona un rol'),
    password: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.password && !isEdit.value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa una contraseña', path: ['password'] });
      return;
    }
    if (value.password) {
      const parsed = strongPasswordSchema.safeParse(value.password);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: parsed.error.issues[0]?.message ?? 'Contraseña no válida',
          path: ['password'],
        });
      }
    }
  });

const { defineField, errors, handleSubmit, isSubmitting, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { email: '', firstName: '', lastName: '', phone: '', roleId: '', password: '' },
});

const [email, emailAttrs] = defineField('email');
const [firstName, firstNameAttrs] = defineField('firstName');
const [lastName, lastNameAttrs] = defineField('lastName');
const [phone, phoneAttrs] = defineField('phone');
const [roleId, roleAttrs] = defineField('roleId');
const [password, passwordAttrs] = defineField('password');

watch(visible, (open) => {
  if (open) {
    resetForm({
      values: {
        email: props.user?.email ?? '',
        firstName: props.user?.firstName ?? '',
        lastName: props.user?.lastName ?? '',
        phone: '',
        roleId: props.user?.roleId ?? '',
        password: '',
      },
    });
  }
});

const busy = computed(() => isSubmitting.value || createUser.isPending.value || updateUser.isPending.value);

const onSubmit = handleSubmit(async (values) => {
  try {
    if (props.user) {
      await updateUser.mutateAsync({
        id: props.user.id,
        payload: {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone.trim() ? values.phone.trim() : null,
          roleId: values.roleId,
          ...(values.password ? { password: values.password } : {}),
        },
      });
      notify.success('Usuario actualizado', values.email);
    } else {
      await createUser.mutateAsync({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        roleId: values.roleId,
        password: values.password,
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      });
      notify.success('Usuario creado', values.email);
    }
    visible.value = false;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) {
      setFieldError('email', apiError.message);
    } else {
      notify.error(apiError, 'No se pudo guardar el usuario');
    }
  }
});
</script>

<template>
  <AppDialog v-model:visible="visible" :title="isEdit ? 'Editar usuario' : 'Nuevo usuario'" :busy="busy">
    <form id="user-form" class="flex flex-col gap-4" novalidate @submit="onSubmit">
      <AppFormField id="user-email" label="Correo" :error="errors.email" required>
        <template #default="{ id, invalid, describedBy }">
          <InputText :id="id" v-model="email" v-bind="emailAttrs" type="email" :invalid="invalid" :aria-describedby="describedBy" fluid />
        </template>
      </AppFormField>
      <div class="grid gap-4 md:grid-cols-2">
        <AppFormField id="user-first" label="Nombre" :error="errors.firstName" required>
          <template #default="{ id, invalid }">
            <InputText :id="id" v-model="firstName" v-bind="firstNameAttrs" :invalid="invalid" maxlength="120" fluid />
          </template>
        </AppFormField>
        <AppFormField id="user-last" label="Apellido" :error="errors.lastName" required>
          <template #default="{ id, invalid }">
            <InputText :id="id" v-model="lastName" v-bind="lastNameAttrs" :invalid="invalid" maxlength="120" fluid />
          </template>
        </AppFormField>
      </div>
      <AppFormField id="user-phone" label="Teléfono" :error="errors.phone">
        <template #default="{ id, invalid }">
          <InputText :id="id" v-model="phone" v-bind="phoneAttrs" :invalid="invalid" maxlength="30" fluid />
        </template>
      </AppFormField>
      <AppFormField id="user-role" label="Rol" :error="errors.roleId" required>
        <template #default="{ id, invalid }">
          <Select
            v-model="roleId"
            v-bind="roleAttrs"
            :input-id="id"
            :options="roles.data.value ?? []"
            option-label="name"
            option-value="id"
            placeholder="Selecciona un rol"
            :invalid="invalid"
            :loading="roles.isPending.value"
            fluid
          />
        </template>
      </AppFormField>
      <AppFormField
        id="user-password"
        :label="isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'"
        :error="errors.password"
        :required="!isEdit"
      >
        <template #default="{ id, invalid }">
          <Password v-model="password" v-bind="passwordAttrs" :input-id="id" :feedback="false" toggle-mask :invalid="invalid" fluid autocomplete="new-password" />
        </template>
      </AppFormField>
    </form>
    <template #footer>
      <Button label="Cancelar" severity="secondary" outlined :disabled="busy" @click="visible = false" />
      <Button type="submit" form="user-form" :label="isEdit ? 'Guardar cambios' : 'Crear usuario'" icon="pi pi-check" :loading="busy" />
    </template>
  </AppDialog>
</template>
