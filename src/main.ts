import { createApp } from 'vue';
import { router } from './router/index.ts'
import { createPinia } from 'pinia';

import App from './App.vue';
import './styles/global.css'; // global reset

const app = createApp(App);
const pinia = createPinia();
app.use(router);
app.use(pinia);
app.mount('#app');
