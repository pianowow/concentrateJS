// Tests for player.endgameCheck
import { describe, it, expect } from 'vitest';
import { Player } from '../player.js';
const player = new Player();
describe('Player packKey and unPackKey', () => {
   const cases: [number, number][] = [
      [0, 0],
      [33554431, 0],
      [0, 33554431],
      [32440319, 1114112],
      [33553903, 16],
   ];

   for (const [blue, red] of cases) {
      it(`returns correctly for input ${blue} and ${red}`, () => {
         expect(player.unpackKey(player.packKey(blue, red))).toEqual([blue, red]);
      });
   }
});
