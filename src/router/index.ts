import { createRouter, createWebHistory } from 'vue-router';

import AnalysisView from '../components/AnalysisView.vue';
import ArenaView from '../components/ArenaView.vue';

const routes = [
   { path: '/', component: AnalysisView },
   { path: '/arena', component: ArenaView },
];

export const router = createRouter({
   history: createWebHistory('/concentrate/'),
   routes,
});
