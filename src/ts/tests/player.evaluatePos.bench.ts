import { bench, describe } from 'vitest';
import { Player } from '../player';
import { Score, convertBoardScore } from '../board';

describe('Player.evaluatePos bench', async () => {
   const letters = 'TNMHINIAZILIDOYLBPUAPNSQR';
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   const p = new Player(undefined, undefined, wordList);
   p.possible(letters);

   const samples: Score[] = [
      convertBoardScore('wwwwwwwwwwwwwwwwwwwwwwwww'.toUpperCase()),
      convertBoardScore('wrRrRwrrwrwrwrRwwwwrwwrwr'.toUpperCase()),
      convertBoardScore('wrrbrwbrbbwrbbrwwwbbwwbBB'.toUpperCase()),
      convertBoardScore('wrRRrrRRrbrRrrrwrwbrwwrbb'.toUpperCase()),
      convertBoardScore('wrRrbbrrbBrrbBBwrwbBwbrbB'.toUpperCase()),
      convertBoardScore('wrRRrrRRrbrRrbBwrwbBwrrrb'.toUpperCase()),
      convertBoardScore('wbrrbbrrbBrrbBBwbwbBwrbBB'.toUpperCase()),
      convertBoardScore('wrRrrrRrbbRRrbBrrwbBwrrbB'.toUpperCase()),
      convertBoardScore('wbrbBbrbBBrrbBBbbwbBwrbBB'.toUpperCase()),
      convertBoardScore('wrRrbrRrbBRRrbBrRrbBwrrbB'.toUpperCase()),
      convertBoardScore('BbrbBbrrbBrrbBBrRrbBbrbBB'.toUpperCase()),
      convertBoardScore('wwwrRwrrRRrwwrrwwrrwwwrrw'.toUpperCase()),
      convertBoardScore('BBBbrBbbrrbwwbbwbrbwwwrrw'.toUpperCase()),
      convertBoardScore('BbbrRbrrrRbrwbrrRrrwRRRRr'.toUpperCase()),
      convertBoardScore('BBBbrBBBbrBbbbbbrrrbrRRrb'.toUpperCase()),
      convertBoardScore('RRrwwRRrwwRrwwwrwrwwRrwww'.toUpperCase()),
      convertBoardScore('RRrwwRRrwbrrwbwbbbBbrbBBB'.toUpperCase()),
      convertBoardScore('RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      convertBoardScore('RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase()),
      convertBoardScore('RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      convertBoardScore('RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase()),
      convertBoardScore('RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      convertBoardScore('RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase()),
      convertBoardScore('RrbwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase()),
      convertBoardScore('rbbwwRrbwbrbwrwRrbbbrbBBB'.toUpperCase()),
      convertBoardScore('rbbwwRrrwrRrwrwRRrrrRrbbb'.toUpperCase()),
      convertBoardScore('rbBbwrbbwrrbwbwRrbBbrbBBB'.toUpperCase()),
      convertBoardScore('rbbrRrbrRrRrwrwRRrbbRrbBB'.toUpperCase()),
      convertBoardScore('BBbrrbbbrbrrbbBRrbBBrbBBB'.toUpperCase()),
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
