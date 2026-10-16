<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Tag from 'primevue/tag';
import { useForm } from 'vee-validate';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useConfirmAction } from '@/shared/composables/useConfirmAction';
import { useNotify } from '@/shared/composables/useNotify';
import AppFormField from '@/shared/ui/AppFormField.vue';
import AppPageHeader from '@/shared/ui/AppPageHeader.vue';
import { changePasswordSchema } from '../schemas/auth.schemas';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
const router = useRouter();
const notify = useNotify();
const confirm = useConfirmAction();

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(changePasswordSchema),
  initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
});
const [currentPassword, currentAttrs] = defineField('currentPassword');
const [newPassword, newAttrs] = defineField('newPassword');
const [confirmPassword, confirmAttrs] = defineField('confirmPassword');

const onChangePassword = handleSubmit(async ({ currentPassword: current, newPassword: next }) => {
  try {
    await session.changePassword({ currentPassword: current, newPassword: next });
    await router.replace({ name: 'login', query: { reason: 'password-changed' } });
  } catch (error) {
    notify.error(error, 'No se pudo cambiar la contraseña');
  }
});

const closingAll = ref(false);

async function onLogoutAll(): Promise<void> {
  const accepted = await confirm({
    title: 'Cerrar todas las sesiones',
    message: 'Se cerrará la sesión en todos tus dispositivos, incluido este. ¿Continuar?',
    acceptLabel: 'Cerrar sesiones',
    danger: true,
  });
  if (!accepted) {
    return;
  }
  closingAll.value = true;
  try {
    await session.logoutAll();
    await router.replace({ name: 'login' });
  } catch (error) {
    notify.error(error);
  } finally {
    closingAll.value = false;
  }
}
</script>

<template>
  <div>
    <AppPageHeader title="Mi cuenta" subtitle="Datos de tu usuario y seguridad de la sesión." />

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="ns-card" aria-labelledby="account-profile-title">
        <h2 id="account-profile-title" class="mt-0 mb-4 text-lg font-semibold">Perfil</h2>
        <dl class="account-details">
          <dt>Nombre</dt>
          <dd>{{ session.displayName }}</dd>
          <dt>Correo</dt>
          <dd>{{ session.user?.email }}</dd>
          <dt>Negocio</dt>
          <dd>{{ session.user?.businessName }}</dd>
          <dt>Roles</dt>
          <dd class="flex flex-wrap gap-2">
            <Tag v-for="role in session.user?.roles ?? []" :key="role" :value="role" severity="secondary" />
          </dd>
        </dl>
      </section>

      <section class="ns-card" aria-labelledby="account-password-title">
        <h2 id="account-password-title" class="mt-0 mb-4 text-lg font-semibold">Cambiar contraseña</h2>
        <form class="flex flex-col gap-4" novalidate @submit="onChangePassword">
          <AppFormField id="current-password" label="Contraseña actual" :error="errors.currentPassword" required>
            <template #default="{ id, invalid }">
              <Password
                v-model="currentPassword"
                v-bind="currentAttrs"
                :input-id="id"
                :feedback="false"
                toggle-mask
                autocomplete="current-password"
                :invalid="invalid"
                fluid
              />
            </template>
          </AppFormField>
          <AppFormField
            id="new-password"
            label="Nueva contraseña"
            :error="errors.newPassword"
            hint="De 8 a 72 caracteres, con al menos una letra y un número."
            required
          >
            <template #default="{ id, invalid }">
              <Password
                v-model="newPassword"
                v-bind="newAttrs"
                :input-id="id"
                :feedback="false"
                toggle-mask
                autocomplete="new-password"
                :invalid="invalid"
                fluid
              />
            </template>
          </AppFormField>
          <AppFormField id="confirm-password" label="Confirmar contraseña" :error="errors.confirmPassword" required>
            <template #default="{ id, invalid }">
              <Password
                v-model="confirmPassword"
                v-bind="confirmAttrs"
                :input-id="id"
                :feedback="false"
                toggle-mask
                autocomplete="new-password"
                :invalid="invalid"
                fluid
              />
            </template>
          </AppFormField>
          <p class="ns-muted m-0 text-sm">Al cambiarla se cerrarán todas tus sesiones activas.</p>
          <div>
            <Button type="submit" label="Actualizar contraseña" icon="pi pi-key" :loading="isSubmitting" />
          </div>
        </form>
      </section>

      <section class="ns-card lg:col-span-2" aria-labelledby="account-sessions-title">
        <h2 id="account-sessions-title" class="mt-0 mb-2 text-lg font-semibold">Sesiones</h2>
        <p class="ns-muted mt-0">Cierra la sesión en todos los dispositivos donde hayas ingresado.</p>
        <Button
          label="Cerrar todas las sesiones"
          icon="pi pi-power-off"
          severity="danger"
          outlined
          :loading="closingAll"
          @click="onLogoutAll"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.account-details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--ns-space-3) var(--ns-space-6);
  margin: 0;
}

.account-details dt {
  color: var(--ns-text-muted);
}

.account-details dd {
  margin: 0;
  font-weight: 500;
}
</style>
