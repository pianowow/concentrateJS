import { createRouter, createWebHistory } from 'vue-router';

import InterfaceView from '../components/InterfaceView.vue';
import ArenaView from '../components/ArenaView.vue';

const routes = [
   { path: '/', component: InterfaceView },
   { path: '/arena', component: ArenaView },
];

export const router = createRouter({
   history: createWebHistory('/concentrate/'),
   routes,
});
