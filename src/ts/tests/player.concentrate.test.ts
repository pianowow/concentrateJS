// Tests for player.decide
import { describe, it, expect, beforeAll } from 'vitest';
import { Player } from '../player';
let player;
const letters = 'CONCENTRATEFORLETTERPRESS';
let concentrateList: string[];
beforeAll(async () => {
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   player = new Player(undefined, undefined, wordList);
   concentrateList = player.concentrate(letters, '', '', '');
});
describe('Player.concentrate ' + letters + ' ', () => {
   it('there are 7888 unique playable words', () => {
      expect(concentrateList.length).toEqual(7888);
   });
});
