<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import { useForm } from 'vee-validate';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { describeApiError } from '@/shared/api';
import AppFormField from '@/shared/ui/AppFormField.vue';
import { loginSchema, safeRedirect } from '../schemas/auth.schemas';
import { useSessionStore } from '../stores/session';
import type { SessionEndReason } from '../types';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const REASON_MESSAGES: Record<SessionEndReason, { severity: 'warn' | 'error' | 'info'; text: string }> = {
  expired: { severity: 'warn', text: 'Tu sesión expiró. Inicia sesión nuevamente.' },
  suspended: { severity: 'error', text: 'El negocio está suspendido. Contacta al administrador de la plataforma.' },
  'password-changed': { severity: 'info', text: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' },
};

const reasonMessage = computed(() => {
  const reason = route.query.reason;
  return typeof reason === 'string' && reason in REASON_MESSAGES
    ? REASON_MESSAGES[reason as SessionEndReason]
    : null;
});

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '' },
});
const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');
const submitError = ref<string | null>(null);

const onSubmit = handleSubmit(async (values) => {
  submitError.value = null;
  try {
    await session.login(values);
    const redirect = safeRedirect(route.query.redirect);
    await router.replace(redirect ?? { name: 'home' });
  } catch (error) {
    submitError.value = describeApiError(error);
  }
});
</script>

<template>
  <div class="login">
    <h1 class="login__title">Inicia sesión</h1>
    <p class="login__subtitle">Accede al panel de tu negocio en NexoStock.</p>

    <Message v-if="reasonMessage && !submitError" :severity="reasonMessage.severity" class="mb-4" :closable="false">
      {{ reasonMessage.text }}
    </Message>
    <Message v-if="submitError" severity="error" class="mb-4" :closable="false" role="alert">
      {{ submitError }}
    </Message>

    <form class="flex flex-col gap-5" novalidate @submit="onSubmit">
      <AppFormField id="login-email" label="Correo electrónico" :error="errors.email" required>
        <template #default="{ id, invalid, describedBy }">
          <InputText
            :id="id"
            v-model="email"
            v-bind="emailAttrs"
            type="email"
            autocomplete="username"
            :invalid="invalid"
            :aria-describedby="describedBy"
            :disabled="isSubmitting"
            fluid
            autofocus
          />
        </template>
      </AppFormField>

      <AppFormField id="login-password" label="Contraseña" :error="errors.password" required>
        <template #default="{ id, invalid }">
          <Password
            v-model="password"
            v-bind="passwordAttrs"
            :input-id="id"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            :invalid="invalid"
            :disabled="isSubmitting"
            fluid
          />
        </template>
      </AppFormField>

      <Button type="submit" label="Ingresar" icon="pi pi-sign-in" :loading="isSubmitting" fluid />
    </form>
  </div>
</template>

<style scoped>
.login__title {
  margin: 0;
  font-size: var(--ns-text-2xl);
  font-weight: 700;
}

.login__subtitle {
  margin: var(--ns-space-2) 0 var(--ns-space-6);
  color: var(--ns-text-muted);
}
</style>
