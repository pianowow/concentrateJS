// Tests for player.endgameCheck
import { describe, it, expect } from 'vitest';
import { defendedMap } from '../board';
describe('defendedMap', () => {
   const cases: [number, number][] = [
      [0, 0],
      [33554431, 33554431],
      [2734099, 0],
      [10801194, 0],
      [11293290, 0],
      [14700913, 0],
      [19598526, 4],
      [20847326, 20],
      [2150173, 536],
      [9358398, 1024],
      [19627578, 16400],
      [22804072, 49152],
      [23032643, 679936],
      [24561557, 1049088],
      [31816366, 8388612],
      [32885908, 11567104],
      [25967372, 16777216],
      [30279693, 25165824],
   ];

   for (const [input, output] of cases) {
      it(`returns ${output} for input ${input}`, () => {
         expect(defendedMap(input)).toBe(output);
      });
   }
});
