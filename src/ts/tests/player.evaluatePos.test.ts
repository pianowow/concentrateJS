import { describe, it, expect } from 'vitest';
import { Player, Score } from '../player';
import { roundTo } from '../util';

describe('Player.evaluatePos', async () => {
   const letters = 'SHHLTBZZRLUKOOOXEIJKNIOQR';
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   const p = new Player(undefined, undefined, wordList);
   p.possible(letters);

   let s = p.convertBoardScore('BbbBBbwwbBwwwwbwbwwwwwwww'.toUpperCase());
   console.log(p.cache[letters][2])
   console.log(p.cache[letters][3])
   it('evaluatePos: ', () => {
      expect(roundTo(p.evaluatePos(letters, s),3)).toEqual(35.385);
   });
});
