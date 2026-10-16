<script setup lang="ts">
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { onBeforeUnmount, ref, watch } from 'vue';
import { SEARCH_DEBOUNCE_MS } from '../constants/config';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    label?: string;
    debounceMs?: number;
    maxlength?: number;
  }>(),
  { placeholder: 'Buscar…', label: 'Buscar', debounceMs: SEARCH_DEBOUNCE_MS, maxlength: 160 },
);

/** Debounced value; the input updates immediately, the model after `debounceMs`. */
const model = defineModel<string>({ default: '' });
const draft = ref(model.value);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(draft, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    model.value = value.trim();
  }, props.debounceMs);
});

watch(model, (value) => {
  if (value !== draft.value.trim()) {
    draft.value = value;
  }
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="app-search-filter">
    <IconField class="app-search-filter__input">
      <InputIcon class="pi pi-search" />
      <InputText
        v-model="draft"
        type="search"
        :placeholder="placeholder"
        :aria-label="label"
        :maxlength="maxlength"
        fluid
      />
    </IconField>
    <slot />
  </div>
</template>

<style scoped>
.app-search-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ns-space-3);
  margin-bottom: var(--ns-space-4);
}

.app-search-filter__input {
  flex: 1 1 16rem;
  max-width: 28rem;
}
</style>
