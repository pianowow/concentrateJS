/// <reference types="vite/client" />
declare global {
   interface Window {
      player: import('./src/ts/player').Player;
   }
}
export {};
