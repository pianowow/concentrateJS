/// <reference types="vite/client" />

declare module '*.vue' {
   import type { DefineComponent } from 'vue';
   const component: DefineComponent<object, object, object>;
   export default component;
}

declare global {
   interface Window {
      player: import('./src/ts/player').Player;
   }
}
export {};
