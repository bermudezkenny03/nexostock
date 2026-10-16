<script setup lang="ts">
import Button from 'primevue/button';
import { RouterView } from 'vue-router';
import { useTheme } from '@/shared/composables/useTheme';

const theme = useTheme();
</script>

<template>
  <div class="auth-layout">
    <section class="auth-layout__brand" aria-hidden="true">
      <div class="auth-layout__brand-inner">
        <span class="layout-topbar-logo auth-layout__logo">N</span>
        <p class="auth-layout__name">NexoStock</p>
        <p class="auth-layout__tagline">Inventario, productos y ventas de tu negocio en un solo lugar.</p>
      </div>
    </section>
    <main class="auth-layout__main">
      <Button
        class="auth-layout__theme"
        :icon="theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        severity="secondary"
        :aria-label="theme.isDark.value ? 'Activar modo claro' : 'Activar modo oscuro'"
        @click="theme.toggle"
      />
      <div class="auth-layout__card ns-card">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 1fr;
}

.auth-layout__brand {
  display: none;
  background:
    radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--p-primary-400) 45%, transparent), transparent 55%),
    linear-gradient(135deg, var(--p-primary-800), var(--p-primary-950));
  color: #fff;
}

.auth-layout__brand-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  max-width: 28rem;
  margin: 0 auto;
  padding: var(--ns-space-8);
}

.auth-layout__logo {
  width: 3rem;
  height: 3rem;
  background: rgb(255 255 255 / 0.15);
  color: #fff;
  font-size: var(--ns-text-xl);
}

.auth-layout__name {
  margin: var(--ns-space-6) 0 var(--ns-space-2);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.auth-layout__tagline {
  margin: 0;
  font-size: var(--ns-text-lg);
  opacity: 0.85;
}

.auth-layout__main {
  position: relative;
  display: grid;
  place-items: center;
  padding: var(--ns-space-6);
}

.auth-layout__theme {
  position: absolute;
  top: var(--ns-space-4);
  right: var(--ns-space-4);
}

.auth-layout__card {
  width: 100%;
  max-width: 26rem;
  padding: var(--ns-space-8);
}

@media (min-width: 992px) {
  .auth-layout {
    grid-template-columns: 1fr 1fr;
  }

  .auth-layout__brand {
    display: block;
  }
}
</style>
