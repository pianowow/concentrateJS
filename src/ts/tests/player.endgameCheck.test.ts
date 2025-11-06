// Tests for player.endgameCheck
import { describe, it, expect, beforeAll } from 'vitest';
import { Player, Play } from '../player';
let player;
const words: Record<string, Play> = {};
let top10SearchResults = [];
const letters = 'OXFPALWDWNXMJDGEEPGLGSYST';
const colors = 'B3W2BWRRBRRB3R3WWWR4';
beforeAll(async () => {
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   player = new Player(undefined, undefined, wordList);
   const searchResults = player.search(letters, colors, '', '', 1);
   top10SearchResults = searchResults.slice(0, 10);
   for (const play of top10SearchResults) {
      const [ending, losing] = player.endgameCheck(letters, play.blue_map, play.red_map, 1);
      words[play.word] = {
         word: play.word,
         group_size: play.group_size,
         score: play.score,
         blue_map: play.blue_map,
         red_map: play.red_map,
         ending_soon: ending,
         losing: losing,
      };
      console.log(play.word + ': ' + JSON.stringify(words[play.word]));
   }
   console.log(words);
});
describe('Player.endgameCheck ' + letters + ' ' + colors, () => {
   it('GANGPLOWS wins with score 5000', () => {
      expect(words['GANGPLOWS']!.score).toEqual(5000);
   });
   it('GANGPLOW wins with score 3000', () => {
      expect(words['GANGPLOW']!.score).toEqual(3000);
   });
   it('PLOWGANG wins with score 3000', () => {
      expect(words['PLOWGANG']!.score).toEqual(3000);
   });
   it('SWAMPWEED ending soon', () => {
      expect(words['SWAMPWEED']!.ending_soon).toEqual(true);
   });
   it('STEPPELAND loses', () => {
      expect(words['STEPPELAND']!.losing).toEqual(true);
   });
});
