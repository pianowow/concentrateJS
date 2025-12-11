import { bench, describe } from 'vitest';
import { Player, type Play } from '../player';

describe('Player.decide bench', async () => {
   const letters = 'TNMHINIAZILIDOYLBPUAPNSQR';
   const fs = await import('node:fs/promises');
   const fileUrl = new URL('../../../public/word_lists/en.txt', import.meta.url);
   const text = await fs.readFile(fileUrl, 'utf8');
   const wordList = text.split(/\r?\n/);
   const p = new Player(undefined, undefined, wordList);
   p.possible(letters);

   const samples: string[] = [
      'wwwwwwwwwwwwwwwwwwwwwwwww'.toUpperCase(),
      'wrRrRwrrwrwrwrRwwwwrwwrwr'.toUpperCase(),
      'wrrbrwbrbbwrbbrwwwbbwwbBB'.toUpperCase(),
      'wrRRrrRRrbrRrrrwrwbrwwrbb'.toUpperCase(),
      'wrRrbbrrbBrrbBBwrwbBwbrbB'.toUpperCase(),
      'wrRRrrRRrbrRrbBwrwbBwrrrb'.toUpperCase(),
      'wbrrbbrrbBrrbBBwbwbBwrbBB'.toUpperCase(),
      'wrRrrrRrbbRRrbBrrwbBwrrbB'.toUpperCase(),
      'wbrbBbrbBBrrbBBbbwbBwrbBB'.toUpperCase(),
      'wrRrbrRrbBRRrbBrRrbBwrrbB'.toUpperCase(),
      'BbrbBbrrbBrrbBBrRrbBbrbBB'.toUpperCase(),
      'wwwrRwrrRRrwwrrwwrrwwwrrw'.toUpperCase(),
      'BBBbrBbbrrbwwbbwbrbwwwrrw'.toUpperCase(),
      'BbbrRbrrrRbrwbrrRrrwRRRRr'.toUpperCase(),
      'BBBbrBBBbrBbbbbbrrrbrRRrb'.toUpperCase(),
      'RRrwwRRrwwRrwwwrwrwwRrwww'.toUpperCase(),
      'RRrwwRRrwbrrwbwbbbBbrbBBB'.toUpperCase(),
      'RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase(),
      'RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase(),
      'RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase(),
      'RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase(),
      'RRrwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase(),
      'RrbwwRrbwbrbwbwRrbBbrbBBB'.toUpperCase(),
      'RrbwwRRrwbRrwrwRRrbrRrbBb'.toUpperCase(),
      'rbbwwRrbwbrbwrwRrbbbrbBBB'.toUpperCase(),
      'rbbwwRrrwrRrwrwRRrrrRrbbb'.toUpperCase(),
      'rbBbwrbbwrrbwbwRrbBbrbBBB'.toUpperCase(),
      'rbbrRrbrRrRrwrwRRrbbRrbBB'.toUpperCase(),
      'BBbrrbbbrbrrbbBRrbBBrbBBB'.toUpperCase(),
   ];

   //Accumulator to prevent elimination
   let sink: Play[] = [];

   bench(
      'decide',
      () => {
         //One bench iteration runs several evaluatePos calls
         for (const s of samples) {
            sink = p.decide(letters, s, '', '', 1);
         }
         void sink;
      },
      { time: 5000 }
   );
});
