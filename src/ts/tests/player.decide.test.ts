// Tests for player.decide
import { describe, it, expect, beforeAll } from 'vitest';
import { Player, Play } from '../player';
let player: Player;
let decideResults: Play[];
beforeAll(async () => {
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   player = new Player(undefined, undefined, wordList);
});
describe('Player.decide ', () => {
   it('there are 24 ways to play AFTERCOOLER on ?board=CONCENTRATEFORLETTERPRESS&colors=B5B5BW3RR5R5', () => {
      const letters = 'CONCENTRATEFORLETTERPRESS';
      const colors = 'B5B5BW3RR5R5';
      decideResults = player.decide(letters, colors, '', '', 1);
      expect(decideResults.filter((val: Play) => val.word == 'AFTERCOOLER').length).toEqual(24);
   });
   it('there are 122694 unique plays on ?board=CONCENTRATEFORLETTERPRESS&colors=B5B5BW3RR5R5', () => {
      const letters = 'CONCENTRATEFORLETTERPRESS';
      const colors = 'B5B5BW3RR5R5';
      decideResults = player.decide(letters, colors, '', '', 1);
      expect(decideResults.length).toEqual(122694);
   });
   it('best score is 23000 for ?board=NDAUNHWIWSTATCAOSTXHNMRDD&colors=B3RRBBBBWWWRRWWRBBBRWB4', () => {
      const letters = 'NDAUNHWIWSTATCAOSTXHNMRDD';
      const colors = 'B3RRBBBBWWWRRWWRBBBRWB4'; //too many characters
      player.concentrate(letters, '', '', '');
      decideResults = player.decide(letters, colors, '', '', 1);
      decideResults.sort((a, b) => b.score - a.score);
      expect(decideResults.reduce((a, b) => (a.score < b.score ? b : a)).score).toEqual(23000);
   });
});
