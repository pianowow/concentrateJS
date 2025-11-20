import { bench, describe } from 'vitest';
import { Player, Score } from '../player';

describe('Player.evaluatePos bench', async () => {
   const letters = 'TNMHINIAZILIDOYLBPUAPNSQR';
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   const p = new Player(undefined, undefined, wordList);
   p.possible(letters);

   const samples: Score[] = [
      p.convertBoardScore('wwwwwwwwwwwwwwwwwwwwwwwww'.toUpperCase()),
      p.convertBoardScore('wrRrRwrrwrwrwrRwwwwrwwrwr'.toUpperCase()),
      p.convertBoardScore('wrrbrwbrbbwrbbrwwwbbwwbBB'.toUpperCase()),
      p.convertBoardScore('wrRRrrRRrbrRrrrwrwbrwwrbb'.toUpperCase()),
      p.convertBoardScore('wrRrbbrrbBrrbBBwrwbBwbrbB'.toUpperCase()),
      p.convertBoardScore('wrRRrrRRrbrRrbBwrwbBwrrrb'.toUpperCase()),
      p.convertBoardScore('wbrrbbrrbBrrbBBwbwbBwrbBB'.toUpperCase()),
      p.convertBoardScore('wrRrrrRrbbRRrbBrrwbBwrrbB'.toUpperCase()),
      p.convertBoardScore('wbrbBbrbBBrrbBBbbwbBwrbBB'.toUpperCase()),
      p.convertBoardScore('wrRrbrRrbBRRrbBrRrbBwrrbB'.toUpperCase()),
      p.convertBoardScore('BbrbBbrrbBrrbBBrRrbBbrbBB'.toUpperCase()),
      p.convertBoardScore('wwwrRwrrRRrwwrrwwrrwwwrrw'.toUpperCase()),
      p.convertBoardScore('BBBbrBbbrrbwwbbwbrbwwwrrw'.toUpperCase()),
      p.convertBoardScore('BbbrRbrrrRbrwbrrRrrwRRRRr'.toUpperCase()),
      p.convertBoardScore('BBBbrBBBbrBbbbbbrrrbrRRrb'.toUpperCase()),
      p.convertBoardScore('RRrwwRRrwwRrwwwrwrwwRrwww'.toUpperCase()),
      p.convertBoardScore('RRrwwRRrwbrrwbwbbbBbrbBBB'.toUpperCase()),
      p.convertBoardScore('RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      p.convertBoardScore('RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase()),
      p.convertBoardScore('RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      p.convertBoardScore('RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase()),
      p.convertBoardScore('RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      p.convertBoardScore('RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase()),
      p.convertBoardScore('RrbwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      p.convertBoardScore('rbbwwRrbwbrbwrwRrbbbrbBBB'.toUpperCase()),
      p.convertBoardScore('rbbwwRrrwrRrwrwRRrrrRrbbb'.toUpperCase()),
      p.convertBoardScore('rbBbwrbbwrrbwbwRrbBbrbBBB'.toUpperCase()),
      p.convertBoardScore('rbbrRrbrRrRrwrwRRrbbRrbBB'.toUpperCase()),
      p.convertBoardScore('BBbrrbbbrbrrbbBRrbBBrbBBB'.toUpperCase()),
   ];

   //Accumulator to prevent elimination
   let sink = 0;

   bench(
      'evaluatePos: samples x N',
      () => {
         //One bench iteration runs several evaluatePos calls
         for (let r = 0; r < 500; r++) {
            for (const s of samples) {
               sink += p.evaluatePos(letters, s);
            }
         }
         void sink;
      },
      { time: 5000 }
   );
});
