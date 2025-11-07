// Tests for player.decide
import { describe, it, expect, beforeAll } from 'vitest';
import { Player, Play } from '../player';
let player;
const letters = 'CONCENTRATEFORLETTERPRESS';
const colors = 'B5B5BW3RR5R5';
let decideResults: Play[];
beforeAll(async () => {
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   player = new Player(undefined, undefined, wordList);
   decideResults = player.decide(letters, colors, '', '', 1);
});
describe('Player.decide ' + letters + ' ' + colors, () => {
   it('there are 24 ways to play AFTERCOOLER', () => {
      expect(decideResults.filter((val: Play) => val.word == 'AFTERCOOLER').length).toEqual(24);
   });
   it('there are 122694 unique plays', () => {
      expect(decideResults.length).toEqual(122694);
   });
});
