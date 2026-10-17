import '@/assets/sakai/tailwind.css';
import '@/assets/styles.scss';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createQueryClient } from '@/shared/api';
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

void router.isReady().then(() => app.mount('#app'));
