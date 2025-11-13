import { createApp } from 'vue';
// https://www.ag-grid.com/vue-data-grid/getting-started/
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

import App from './App.vue';
const app = createApp(App);
app.mount('#app');
