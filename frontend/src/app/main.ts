import '@/shared/styles/main.css';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createQueryClient } from '@/shared/api';
import { useTheme } from '@/shared/composables/useTheme';
import App from './App.vue';
import { installPrimeVue } from './providers/primevue';
import { installSession } from './providers/session';
import { createAppRouter } from './router';

const app = createApp(App);
const pinia = createPinia();
const router = createAppRouter();
const queryClient = createQueryClient();

app.use(pinia);
app.use(VueQueryPlugin, { queryClient });
installPrimeVue(app);
installSession(app, { pinia, router, queryClient });
app.use(router);
useTheme().sync();

void router.isReady().then(() => app.mount('#app'));
