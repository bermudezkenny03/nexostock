<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header class="app-page-header">
    <div class="min-w-0">
      <h1 class="app-page-header__title">{{ title }}</h1>
      <p v-if="subtitle || $slots.subtitle" class="app-page-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="app-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.app-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--ns-space-4);
  margin-bottom: var(--ns-space-6);
}

.app-page-header__title {
  margin: 0;
  font-size: var(--ns-text-2xl);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.app-page-header__subtitle {
  margin: var(--ns-space-1) 0 0;
  color: var(--ns-text-muted);
}

.app-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ns-space-2);
}
</style>
