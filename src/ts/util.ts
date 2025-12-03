/**
 * Rounds a number to a fixed number of decimal places.
 * @param num - the value to round.
 * @param decimalPlaces - How many decimal places to keep.
 * @returns The rounded value.
 * @example
 * roundTo(1.2345,2) // => 1.23
 */
export function roundTo(num: number, decimalPlaces: number) {
   const factor = Math.pow(10, decimalPlaces);
   return Math.round(num * factor) / factor;
}

/**
 * Throws error if condition is false
 * @param condition - Must be true, otherwise an error is thrown.
 * @param message - Optional error message.
 */
export function assert(condition: boolean, message = 'Assertion failed') {
   if (!condition) {
      throw new Error(message);
   }
}

export class Vector {
   x: number = 2;
   y: number = 2;
   constructor(x = 2, y = 2) {
      this.x = x;
      this.y = y;
   }
}

export function vectorDiff(v1: Vector, v2: Vector) {
   return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
}

/**
 *  Packs two (at most 25 bit) numbers into a single key for use in a Map.
 */
export function packKey(n1: number, n2: number) {
   return n1 * 2 ** 25 + n2;
}

/**
 * Unpacks two (at most 25 bit) numbers from a given Map key
 */
export function unpackKey(key: number) {
   return [Math.floor(key / 2 ** 25), key % 2 ** 25];
}

export interface ScoreBarData {
   bluePercent: number;
   redPercent: number;
   isWin: boolean;
}

/**
 * Computes the score bar fill percentages for blue and red
 * For wins: based on actual tile counts (score / 1000 = margin, total = 25)
 * For in-progress: only winning color extends from center
 */
export function computeScoreBar(score: number): ScoreBarData {
   const isWin = Math.abs(score) >= 1000;

   if (isWin) {
      // Score is margin * 1000, e.g., 5000 means won by 5 (like 15-10)
      // margin = winner - loser, and winner + loser = 25
      // So: winner = (25 + margin) / 2, loser = (25 - margin) / 2
      const margin = Math.floor(Math.abs(score) / 1000);
      const winner = (25 + margin) / 2;
      const loser = (25 - margin) / 2;

      if (score > 0) {
         return {
            bluePercent: (winner / 25) * 100,
            redPercent: (loser / 25) * 100,
            isWin: true,
         };
      } else {
         return {
            bluePercent: (loser / 25) * 100,
            redPercent: (winner / 25) * 100,
            isWin: true,
         };
      }
   }

   if (Math.abs(score) < 1) {
      return { bluePercent: 0, redPercent: 0, isWin: false };
   }

   // Logarithmic scale from 1 to 100 -> 0% to 100% of half the bar
   const absScore = Math.min(Math.abs(score), 100);
   const percent = (Math.log10(absScore) / 2) * 100;

   if (score > 0) {
      return {
         bluePercent: percent,
         redPercent: 0,
         isWin: false,
      };
   } else {
      return {
         bluePercent: 0,
         redPercent: percent,
         isWin: false,
      };
   }
}
