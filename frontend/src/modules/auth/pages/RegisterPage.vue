<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import Tag from 'primevue/tag';
import { useForm } from 'vee-validate';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { describeApiError } from '@/shared/api';
import { formatInteger, formatPlanPrice } from '@/shared/utils/format';
import { authApi } from '../api/authApi';
import { PUBLIC_PLANS, type PublicPlan } from '../constants/plans';
import { registerSchema, type RegisterForm } from '../schemas/auth.schemas';
import { useSessionStore } from '../stores/session';

const TEST_CARD = '4242424242424242';

const router = useRouter();
const session = useSessionStore();
const submitError = ref<string | null>(null);
const catalog = ref<PublicPlan[]>([...PUBLIC_PLANS]);
const plansLive = ref(false);
const selected = ref<PublicPlan>(PUBLIC_PLANS[0]!);
const step = ref<'plans' | 'account'>('plans');
const cardName = ref('');
const cardNumber = ref('');
const cardExpiry = ref('');
const cardCvc = ref('');
const paymentError = ref<string | null>(null);

const needsPayment = computed(() => selected.value.code !== 'FREE');
const submitLabel = computed(() =>
  needsPayment.value ? `Simular pago de ${selected.value.name}` : 'Empezar con el plan Gratis',
);

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(registerSchema),
  initialValues: {
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
});

const [businessName, businessAttrs] = defineField('businessName');
const [firstName, firstAttrs] = defineField('firstName');
const [lastName, lastAttrs] = defineField('lastName');
const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');
const [confirmPassword, confirmAttrs] = defineField('confirmPassword');

onMounted(async () => {
  try {
    const plans = await authApi.listPlans();
    if (plans.length === 0) {
      return;
    }
    catalog.value = plans;
    plansLive.value = true;
    selected.value = plans.find((plan) => plan.code === selected.value.code) ?? plans[0]!;
  } catch {
    plansLive.value = false;
  }
});

function fillTestCard(): void {
  cardName.value = 'Cliente de prueba';
  cardNumber.value = '4242 4242 4242 4242';
  cardExpiry.value = '12/30';
  cardCvc.value = '123';
}

function choose(plan: PublicPlan): void {
  selected.value = plan;
  paymentError.value = null;
  step.value = 'account';
  if (plan.code === 'FREE') {
    cardName.value = '';
    cardNumber.value = '';
    cardExpiry.value = '';
    cardCvc.value = '';
    return;
  }
  fillTestCard();
}

function backToPlans(): void {
  step.value = 'plans';
}

function cardDigits(): string {
  return cardNumber.value.replace(/\D/g, '');
}

type CardBrand = 'visa' | 'mastercard' | null;

const cardBrand = computed<CardBrand>(() => {
  const digits = cardDigits();
  if (/^4/.test(digits)) return 'visa';
  const prefix = Number(digits.slice(0, 4));
  if (/^5[1-5]/.test(digits) || (digits.length >= 4 && prefix >= 2221 && prefix <= 2720)) return 'mastercard';
  return null;
});

const cardBrandLabel = computed(() => (cardBrand.value === 'visa' ? 'Visa' : cardBrand.value === 'mastercard' ? 'Mastercard' : 'Tarjeta'));

function paymentIsValid(): boolean {
  const expiry = /^(\d{2})\/(\d{2})$/.exec(cardExpiry.value.trim());
  const month = expiry ? Number(expiry[1]) : 0;
  return (
    cardName.value.trim().length > 1 &&
    (cardDigits() === TEST_CARD || cardDigits() === '5555555555554444') &&
    month >= 1 &&
    month <= 12 &&
    /^\d{3}$/.test(cardCvc.value.trim())
  );
}

async function createAccount(values: RegisterForm): Promise<void> {
  try {
    await session.register({
      businessName: values.businessName,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      ...(plansLive.value ? { planCode: selected.value.code } : {}),
    });
    cardNumber.value = '';
    cardCvc.value = '';
    await router.replace(
      needsPayment.value
        ? { name: 'business-plan', query: plansLive.value ? { asignado: selected.value.code } : { simulado: selected.value.code } }
        : { name: 'home' },
    );
  } catch (error) {
    const message = describeApiError(error);
    if (needsPayment.value) paymentError.value = message;
    else submitError.value = message;
  }
}

const onSubmit = handleSubmit(async (values) => {
  submitError.value = null;
  paymentError.value = null;
  if (needsPayment.value && !paymentIsValid()) {
    paymentError.value = 'Simulación: Visa 4242 4242 4242 4242 o Mastercard 5555 5555 5555 4444, vencimiento 12/30 y CVC 123.';
    return;
  }
  await createAccount(values);
});

</script>

<template>
  <Transition name="step" mode="out-in">
  <div v-if="step === 'plans'" key="plans">
    <div class="mb-8 text-center">
      <h1 class="mb-2 mt-0 text-3xl font-medium text-surface-900 dark:text-surface-0">Planes</h1>
      <p class="m-0 text-muted-color">
        {{
          plansLive
            ? 'Gratis entra directo. Básico y Pro usan una tarjeta de prueba y el plan queda en el negocio.'
            : 'Gratis entra directo. Básico y Pro pasan por un pago simulado.'
        }}
      </p>
    </div>
    <div class="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
      <article
        v-for="plan in catalog"
        :key="plan.code"
        class="plan-card flex h-full min-h-80 cursor-pointer flex-col rounded-3xl bg-surface-0 p-8 text-center dark:bg-surface-900"
        :class="selected.code === plan.code ? 'ring-2 ring-primary' : 'border border-surface'"
        @click="choose(plan)"
      >
        <span class="text-sm font-semibold tracking-wide text-primary">{{ plan.code }}</span>
        <h2 class="mb-3 mt-4 text-3xl font-medium text-surface-900 dark:text-surface-0">{{ plan.name }}</h2>
        <p class="mb-2 text-2xl font-medium text-surface-900 dark:text-surface-0">{{ formatPlanPrice(plan.monthlyPrice) }}</p>
        <p class="mb-8 min-h-16 text-base leading-7 text-muted-color">{{ plan.description }}</p>
        <ul class="m-0 mb-8 list-none p-0 text-left text-lg text-surface-900 dark:text-surface-0">
          <li class="mb-4 flex items-center gap-3">
            <i class="pi pi-check text-primary" />
            <span>{{ plan.maxUsers === null ? 'Usuarios ilimitados' : `${formatInteger(plan.maxUsers)} usuarios` }}</span>
          </li>
          <li class="flex items-center gap-3">
            <i class="pi pi-check text-primary" />
            <span>{{ plan.maxProducts === null ? 'Productos ilimitados' : `${formatInteger(plan.maxProducts)} productos` }}</span>
          </li>
        </ul>
        <Button
          type="button"
          class="mt-auto w-full"
          size="large"
          :label="plan.code === 'FREE' ? 'Empezar' : 'Elegir y pagar'"
          @click.stop="choose(plan)"
        />
      </article>
    </div>
  </div>
  <form v-else id="registro" key="account" class="mx-auto grid w-full items-start gap-6" :class="needsPayment ? 'max-w-5xl lg:grid-cols-2' : 'max-w-lg'" novalidate @submit="onSubmit">
    <section class="rounded-3xl border border-surface bg-surface-0 p-8 dark:bg-surface-900">
      <Button type="button" label="Planes" severity="secondary" text icon="pi pi-arrow-left" class="mb-2" @click="backToPlans" />
      <h2 class="mb-1 mt-0 text-2xl font-medium text-surface-900 dark:text-surface-0">Datos del negocio</h2>
      <p class="mb-6 mt-0 text-sm text-muted-color">Plan {{ selected.name }}. {{ selected.description }}</p>
      <Message v-if="submitError" severity="error" class="mb-4" :closable="false" role="alert">{{ submitError }}</Message>
      <label for="register-business" class="mb-2 block text-sm font-medium">Negocio</label>
      <p v-if="errors.businessName" id="register-business-error" class="mb-2 text-red-500" role="alert">{{ errors.businessName }}</p>
      <InputText id="register-business" v-model="businessName" v-bind="businessAttrs" class="mb-4 w-full" maxlength="120" :invalid="Boolean(errors.businessName)" :disabled="isSubmitting" fluid autofocus />
      <div class="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label for="register-first" class="mb-2 block text-sm font-medium">Nombre</label>
          <p v-if="errors.firstName" class="mb-2 text-red-500" role="alert">{{ errors.firstName }}</p>
          <InputText id="register-first" v-model="firstName" v-bind="firstAttrs" maxlength="120" :invalid="Boolean(errors.firstName)" :disabled="isSubmitting" fluid />
        </div>
        <div>
          <label for="register-last" class="mb-2 block text-sm font-medium">Apellido</label>
          <p v-if="errors.lastName" class="mb-2 text-red-500" role="alert">{{ errors.lastName }}</p>
          <InputText id="register-last" v-model="lastName" v-bind="lastAttrs" maxlength="120" :invalid="Boolean(errors.lastName)" :disabled="isSubmitting" fluid />
        </div>
      </div>
      <label for="register-email" class="mb-2 block text-sm font-medium">Correo electrónico</label>
      <p v-if="errors.email" class="mb-2 text-red-500" role="alert">{{ errors.email }}</p>
      <InputText id="register-email" v-model="email" v-bind="emailAttrs" type="email" autocomplete="username" class="mb-4 w-full" :invalid="Boolean(errors.email)" :disabled="isSubmitting" fluid />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="register-password" class="mb-2 block text-sm font-medium">Contraseña</label>
          <p v-if="errors.password" class="mb-2 text-red-500" role="alert">{{ errors.password }}</p>
          <Password v-model="password" v-bind="passwordAttrs" input-id="register-password" :feedback="false" toggle-mask autocomplete="new-password" :invalid="Boolean(errors.password)" :disabled="isSubmitting" fluid />
        </div>
        <div>
          <label for="register-confirm" class="mb-2 block text-sm font-medium">Confirmar contraseña</label>
          <p v-if="errors.confirmPassword" class="mb-2 text-red-500" role="alert">{{ errors.confirmPassword }}</p>
          <Password v-model="confirmPassword" v-bind="confirmAttrs" input-id="register-confirm" :feedback="false" toggle-mask autocomplete="new-password" :invalid="Boolean(errors.confirmPassword)" :disabled="isSubmitting" fluid />
        </div>
      </div>
      <template v-if="!needsPayment">
        <Button type="submit" :label="submitLabel" class="mt-6 w-full" :loading="isSubmitting" />
        <p class="mb-0 mt-4 text-center text-sm">
          <span class="text-muted-color">¿Ya tienes cuenta?</span>
          <router-link :to="{ name: 'login' }" class="ml-2 font-medium text-primary">Ingresar</router-link>
        </p>
      </template>
    </section>
    <section v-if="needsPayment" class="rounded-3xl bg-surface-0 p-8 ring-2 ring-primary dark:bg-surface-900">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="m-0 text-2xl font-medium text-surface-900 dark:text-surface-0">Tarjeta de prueba</h2>
        <Tag value="Simulación" severity="secondary" />
      </div>
      <div class="pay-card mb-6">
        <div class="flex items-center justify-between text-sm text-muted-color">
          <span>NexoStock</span>
          <span class="brand" :data-brand="cardBrand ?? 'unknown'">{{ cardBrandLabel }}</span>
        </div>
        <p class="pay-card-number">{{ cardNumber || '•••• •••• •••• ••••' }}</p>
        <div class="mt-6 flex items-end justify-between text-sm">
          <span class="text-surface-900 dark:text-surface-0">{{ cardName || 'Titular' }}</span>
          <span class="text-muted-color">{{ cardExpiry || 'MM/AA' }}</span>
        </div>
      </div>
      <p class="mb-1 mt-0 text-lg font-medium text-surface-900 dark:text-surface-0">{{ formatPlanPrice(selected.monthlyPrice) }}</p>
      <p class="mb-4 mt-0 text-sm text-muted-color">
        {{
          plansLive
            ? 'La tarjeta no se envía ni se cobra. El plan sí se asigna al negocio.'
            : 'No se cobra ni se envía. Este servidor deja el negocio en Gratis.'
        }}
      </p>
      <p v-if="paymentError" class="mb-3 text-sm text-red-500" role="alert">{{ paymentError }}</p>
      <label for="sim-name" class="mb-2 block text-sm font-medium">Titular</label>
      <InputText id="sim-name" v-model="cardName" class="mb-4 w-full" autocomplete="off" fluid />
      <label for="sim-number" class="mb-2 block text-sm font-medium">Número</label>
      <InputText id="sim-number" v-model="cardNumber" class="mb-4 w-full" inputmode="numeric" autocomplete="off" fluid />
      <div class="mb-6 grid grid-cols-2 gap-3">
        <div>
          <label for="sim-expiry" class="mb-2 block text-sm font-medium">Vence</label>
          <InputText id="sim-expiry" v-model="cardExpiry" autocomplete="off" fluid />
        </div>
        <div>
          <label for="sim-cvc" class="mb-2 block text-sm font-medium">CVC</label>
          <InputText id="sim-cvc" v-model="cardCvc" inputmode="numeric" autocomplete="off" maxlength="3" fluid />
        </div>
      </div>
      <Button type="submit" :label="submitLabel" class="w-full" :loading="isSubmitting" />
      <p class="mb-0 mt-4 text-center text-sm">
        <span class="text-muted-color">¿Ya tienes cuenta?</span>
        <router-link :to="{ name: 'login' }" class="ml-2 font-medium text-primary">Ingresar</router-link>
      </p>
    </section>
  </form>
  </Transition>
</template>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.step-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.plan-card {
  border: 1px solid var(--surface-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.plan-card:hover {
  border-color: var(--primary-color);
}

.pay-card {
  border: 1px solid var(--surface-border);
  border-radius: 1rem;
  padding: 1.25rem 1.25rem 1rem;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 18%, transparent), transparent 55%),
    var(--surface-card);
}

.pay-card-number {
  margin: 1.75rem 0 0;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.12em;
  color: var(--text-color);
}

.brand {
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.brand[data-brand='visa'],
.brand[data-brand='mastercard'] {
  padding: 0.15rem 0.45rem;
  border-radius: 0.25rem;
  background: #fff;
}

.brand[data-brand='visa'] {
  color: #1a1f71;
}

.brand[data-brand='mastercard'] {
  color: #eb001b;
}
</style>
