// Tests for player.arrange
import { describe, it, expect, beforeAll } from 'vitest';
import { Player } from '../player';
let player;
const letters = 'CONCENTRATEFORLETTERPRESS';
const colors = 'B5B5BW3RR5R5';
const word = 'AFTERCOOLER';
const scores: Map<number, number> = new Map<number, number>();
beforeAll(async () => {
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   player = new Player(undefined, undefined, wordList);
   player.concentrate(letters, '', '', '');
   const s = player.convertBoardScore(colors);
   player.arrange(letters, word, s, scores);
   console.log(scores);
});
describe('Player.arrange ' + letters + ' ' + colors, () => {
   it('there are 24 ways to play AFTERCOOLER from board CONCENTRATEFORLETTERPRESS color B5B5BW3RR5R5', () => {
      expect([...scores.keys()].length).toEqual(24);
   });
});
