import { Vector } from './util';

export class LightColorTheme {
   defaultColor = 'rgb(233,232,229)';
   defaultColor2 = 'rgb(230,229,226)';
   blue = 'rgb(120,200,245)';
   red = 'rgb(247,153,141)';
   defendedBlue = 'rgb(0,162,255)';
   defendedRed = 'rgb(255,67,46)';
   defaultText = 'rgb(46,45,45)';
   blueText = 'rgb(24,40,49)';
   defendedBlueText = 'rgb(0,32,51)';
   redText = 'rgb(49,30,28)';
   defendedRedText = 'rgb(51,13,9)';
}

export const BOARD_MASK: number = (1 << 25) - 1;

export class Score {
   blue: number;
   red: number;
   bluedef: number;
   reddef: number;
   constructor(blue = 0, red = 0, bluedef = 0, reddef = 0) {
      this.blue = blue;
      this.red = red;
      this.bluedef = bluedef;
      this.reddef = reddef;
   }
}

// used to have methods/functions to compute these every time, but they're constants so I decided to hard-code them
// neighbors[i] represents the bitmap of all the neighbors of i and itself.  Corner cell has 0th index.
// ex: cell 7 has neighbors 7,2,12,6,8.  Those values bitmapped, i.e., 2^7 + 2^2 + 2^12 + 2^6 + 2^8 add to 4548.
// ex: cell 0 has neighbors 0, 1 and 5.  So 2^0 + 2^1 + 2^5 = 35
export const neighbors: Uint32Array = new Uint32Array([
   35, 71, 142, 284, 536, 1121, 2274, 4548, 9096, 17168, 35872, 72768, 145536, 291072, 549376,
   1147904, 2328576, 4657152, 9314304, 17580032, 3178496, 7405568, 14811136, 29622272, 25690112,
]);

/**
 * Returns a string representing the board colors given bitmaps of blue and red positions
 * @param blue bitmap of blue position
 * @param red bitmap of red position
 */
export function mapsToColors(blue: number, red: number): string {
   //if (!player.value) return 'w'.repeat(25);
   let s: string = '';
   for (let i = 0; i < 25; i++) {
      if ((blue & neighbors[i]!) == neighbors[i]) {
         s += 'B';
      } else if ((red & neighbors[i]!) == neighbors[i]) {
         s += 'R';
      } else if (blue & (1 << i)) {
         s += 'b';
      } else if (red & (1 << i)) {
         s += 'r';
      } else {
         s += 'w';
      }
   }
   return s;
}

/**
 * Returns number of set bits of a number
 * ex.: 5 is 101 in binary, so it would return 2 for the two set 1s.
 * Kerninghan's algorithm
 */
export function bitCount(n: number): number {
   let c = 0;
   n |= 0; //ensure 32-bit
   while (n) {
      n &= n - 1;
      c++;
   }
   return c;
}

export function defendedMap(posmap: number): number {
   const n = neighbors;
   let defmap = 0;
   for (let i = 0; i < 25; i++) {
      if ((posmap & n[i]!) == n[i]) {
         defmap = defmap | (1 << i);
      }
   }
   return defmap;
}
export function convertBoardScore(scoreString: string) {
   // produces bitmaps from a string of characters representing the colors
   let i = 0;
   let prevchar = 'W';
   const s = new Score();
   for (const char of scoreString) {
      if (i < 25) {
         if (char == 'B') {
            s.blue = s.blue | (1 << i);
            prevchar = char;
            i += 1;
         } else if (char == 'R') {
            s.red = s.red | (1 << i);
            prevchar = char;
            i += 1;
         } else if ('0123456789'.includes(char)) {
            const num = parseInt(char);
            for (let d = 1; d < num; d++) {
               if (i < 25) {
                  if (prevchar == 'R') {
                     s.red = s.red | (1 << i);
                  } else if (prevchar == 'B') {
                     s.blue = s.blue | (1 << i);
                  }
               }
               i += 1;
            }
         } else {
            prevchar = 'W';
            i += 1;
         }
      }
   }
   for (i = 0; i < 25; i++) {
      if ((s.blue & neighbors[i]!) == neighbors[i]) {
         s.bluedef = s.bluedef | (1 << i);
      }
      if ((s.red & neighbors[i]!) == neighbors[i]) {
         s.reddef = s.reddef | (1 << i);
      }
   }
   return s;
}

export function centroid(map: number) {
   map &= BOARD_MASK;
   if (map === 0) return new Vector(2, 2);
   let cnt = 0,
      ysum = 0,
      xsum = 0;
   while (map) {
      const lsb = map & -map;
      const i = 31 - Math.clz32(lsb);
      ysum += i % 5;
      xsum += (i / 5) | 0; //fast floor
      cnt++;
      map ^= lsb;
   }
   return new Vector(xsum / cnt, ysum / cnt);
}
