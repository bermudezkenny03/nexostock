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
  <form novalidate @submit="onSubmit">
    <Message v-if="reasonMessage && !submitError" :severity="reasonMessage.severity" class="mb-4" :closable="false">
      {{ reasonMessage.text }}
    </Message>
    <Message v-if="submitError" severity="error" class="mb-4" :closable="false" role="alert">
      {{ submitError }}
    </Message>
    <p v-if="errors.email" id="login-email-error" class="text-red-500 mb-2" role="alert">{{ errors.email }}</p>
    <p v-if="errors.password" id="login-password-error" class="text-red-500 mb-2" role="alert">{{ errors.password }}</p>

    <label for="login-email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Correo electrónico</label>
    <InputText
      id="login-email"
      v-model="email"
      v-bind="emailAttrs"
      type="email"
      placeholder="Correo electrónico"
      autocomplete="username"
      class="w-full md:w-[30rem] mb-8"
      :invalid="Boolean(errors.email)"
      :aria-describedby="errors.email ? 'login-email-error' : undefined"
      :disabled="isSubmitting"
      fluid
      autofocus
    />

    <label for="login-password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Contraseña</label>
    <Password
      v-model="password"
      v-bind="passwordAttrs"
      input-id="login-password"
      placeholder="Contraseña"
      :feedback="false"
      toggle-mask
      autocomplete="current-password"
      class="mb-4"
      :invalid="Boolean(errors.password)"
      :disabled="isSubmitting"
      fluid
    />

    <Button type="submit" label="Ingresar" class="w-full" :loading="isSubmitting" />
    <p class="text-center mt-6 mb-0">
      <span class="text-muted-color">¿Aún no tienes negocio?</span>
      <router-link :to="{ name: 'register' }" class="text-primary font-medium ml-2">Ver los planes</router-link>
    </p>
  </form>
</template>

<style scoped>
.pi-eye {
  transform: scale(1.6);
  margin-right: 1rem;
}

.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>
