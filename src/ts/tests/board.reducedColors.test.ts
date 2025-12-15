// Tests for player.endgameCheck
import { describe, it, expect } from 'vitest';
import { reducedColors, type Score, convertBoardScore, mapsToColors } from '../board';
describe('defendedMap', () => {
   const cases: [string, string][] = [
      ['rrrrrrrrrrrrrrrrrrrrrrrrr', 'r9r9r7'],
      ['rrrrrbbbbbrrrrrbbbbbrrrrr', 'r5b5r5b5r5'],
      ['rbbrrrbbbbrrrrrbbbbbbrrrr', 'rbbr3b4r5b6r4'],
   ];
   const randomCases: string[] = [
      'bwrbwrbbwbwbwrbwrbwrbwrbw',
      'bbrbrbrbwrbwbrbrbrbbrwbrb',
      'bbbwwbbbbbbwbwwwwwbbbwbrw',
      'rrrrrrrbrrrrrrwrwrrrrrrrr',
      'bwwwwwwwwwwwwwwwwwwwrrrrr',
      'bbbbbbbbbbbwwwrrrrrrrrrrr',
   ];
   for (const [input, output] of cases) {
      it(`returns ${output} for input ${input}`, () => {
         expect(reducedColors(input)).toBe(output);
      });
   }
   for (const colors of randomCases) {
      it(`converts round trip ${colors}`, () => {
         const reduced = reducedColors(colors);
         const s: Score = convertBoardScore(reduced);
         expect(mapsToColors(s.blue, s.red).toLowerCase()).toEqual(colors);
      });
   }
});
