import { Vector } from './util';

export type ThemeName = keyof Themes;
export interface ThemeConfig {
   defaultColor: string;
   defaultColor2: string;
   blueName: string;
   blue: string;
   defendedBlue: string;
   redName: string;
   red: string;
   defendedRed: string;
   defaultText: string;
   blueText: string;
   defendedBlueText: string;
   redText: string;
   defendedRedText: string;
}
export class Themes {
   Light: ThemeConfig = {
      defaultColor: 'rgb(233,232,229)',
      defaultColor2: 'rgb(230,229,226)',
      blueName: 'Blue',
      blue: 'rgb(120,200,245)',
      red: 'rgb(247,153,141)',
      redName: 'Red',
      defendedBlue: 'rgb(0,162,255)',
      defendedRed: 'rgb(255,67,46)',
      defaultText: 'rgb(46,45,45)',
      blueText: 'rgb(24,40,49)',
      defendedBlueText: 'rgb(0,32,51)',
      redText: 'rgb(49,30,28)',
      defendedRedText: 'rgb(51,13,9)',
   };
   Pop: ThemeConfig = {
      defaultColor: 'rgb(55,55,55)',
      defaultColor2: 'rgb(57,57,57)',
      blueName: 'Green',
      blue: 'rgb(87,152,24)',
      defendedBlue: 'rgb(126,255,0)',
      redName: 'Pink',
      red: 'rgb(152,24,123)',
      defendedRed: 'rgb(255,0,198)',
      defaultText: 'rgb(215,215,215)',
      blueText: 'rgb(221,234,208)',
      defendedBlueText: 'rgb(25,51,0)',
      redText: 'rgb(234,208,228)',
      defendedRedText: 'rgb(51,0,39)',
   };
   Retro: ThemeConfig = {
      defaultColor: 'rgb(243,228,191)',
      defaultColor2: 'rgb(241,226,189)',
      blueName: 'Purple',
      blue: 'rgb(195,136,226)',
      defendedBlue: 'rgb(140,37,255)',
      redName: 'Red',
      red: 'rgb(244,166,133)',
      defendedRed: 'rgb(237,97,70)',
      defaultText: 'rgb(48,45,37)',
      blueText: 'rgb(39,27,45)',
      defendedBlueText: 'rgb(232,211,255)',
      redText: 'rgb(48,33,26)',
      defendedRedText: 'rgb(47,19,14)',
   };
   Dark: ThemeConfig = {
      defaultColor: 'rgb(55,55,55)',
      defaultColor2: 'rgb(57,57,57)',
      blueName: 'Blue',
      blue: 'rgb(24,117,152)',
      defendedBlue: 'rgb(0,186,255)',
      redName: 'Red',
      red: 'rgb(152,58,48)',
      defendedRed: 'rgb(255,67,47)',
      defaultText: 'rgb(215,215,215)',
      blueText: 'rgb(208,227,234)',
      defendedBlueText: 'rgb(0,37,51)',
      redText: 'rgb(234,215,213)',
      defendedRedText: 'rgb(51,13,9)',
   };
   Forest: ThemeConfig = {
      defaultColor: 'rgb(217,223,209)',
      defaultColor2: 'rgb(215,221,207)',
      blueName: 'Orange',
      blue: 'rgb(239,193,108)',
      defendedBlue: 'rgb(255,156,0)',
      redName: 'Green',
      red: 'rgb(122,164,137)',
      defendedRed: 'rgb(21,99,59)',
      defaultText: 'rgb(43,44,41)',
      blueText: 'rgb(47,38,21)',
      defendedBlueText: 'rgb(51,31,0)',
      redText: 'rgb(24,32,27)',
      defendedRedText: 'rgb(208,223,215)',
   };
   Glow: ThemeConfig = {
      defaultColor: 'rgb(55,55,55)',
      defaultColor2: 'rgb(57,57,57)',
      blueName: 'Green',
      blue: 'rgb(73,152,119)',
      defendedBlue: 'rgb(97,255,190)',
      redName: 'Red',
      red: 'rgb(141,24,77)',
      defendedRed: 'rgb(234,0,105)',
      defaultText: 'rgb(215,215,215)',
      blueText: 'rgb(14,30,23)',
      defendedBlueText: 'rgb(19,51,38)',
      redText: 'rgb(232,208,219)',
      defendedRedText: 'rgb(46,0,21)',
   };
   Pink: ThemeConfig = {
      defaultColor: 'rgb(247,217,230)',
      defaultColor2: 'rgb(245,215,227)',
      blueName: 'Pink',
      blue: 'rgb(255,112,232)',
      defendedBlue: 'rgb(255,0,228)',
      redName: 'Black',
      red: 'rgb(171,140,142)',
      defendedRed: 'rgb(87,56,47)',
      defaultText: 'rgb(48,43,45)',
      blueText: 'rgb(51,22,46)',
      defendedBlueText: 'rgb(51,0,45)',
      redText: 'rgb(34,28,28)',
      defendedRedText: 'rgb(221,215,213)',
   };
   Contrast: ThemeConfig = {
      defaultColor: 'rgb(247,247,247)',
      defaultColor2: 'rgb(244,244,244)',
      blueName: 'Green',
      blue: 'rgb(143,255,127)',
      defendedBlue: 'rgb(32,255,0)',
      redName: 'Black',
      red: 'rgb(127,127,127)',
      defendedRed: 'rgb(0,0,0)',
      defaultText: 'rgb(48,48,48)',
      blueText: 'rgb(28,51,25)',
      defendedBlueText: 'rgb(6,51,0)',
      redText: 'rgb(25,25,25)',
      defendedRedText: 'rgb(204,204,204)',
   };
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

export function scoreToColors(s: Score): string {
   return mapsToColors(s.blue, s.red);
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
         if (char == 'B' || char == 'b') {
            s.blue = s.blue | (1 << i);
            prevchar = 'B';
            i += 1;
         } else if (char == 'R' || char == 'r') {
            s.red = s.red | (1 << i);
            prevchar = 'R';
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
   s.bluedef = defendedMap(s.blue);
   s.reddef = defendedMap(s.red);
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

export function reducedColors(colors: string) {
   colors = colors.toLowerCase();
   let colorIdx = 0;
   let out = '';
   let prevColor = '';
   let prevCount = 1;
   let outCount = 0;
   while (outCount < 25) {
      const color = colors.charAt(colorIdx);
      let goNextColor: boolean = true;
      if (prevColor != color || !color) {
         if (prevCount > 9) {
            out += prevColor + '9';
            prevCount -= 9;
            outCount += 9;
            goNextColor = false;
         } else if (prevCount > 2) {
            out += prevColor + prevCount;
            prevCount = 1;
            prevColor = color;
            outCount += prevCount;
         } else if (prevCount === 2) {
            out += prevColor + prevColor;
            prevCount = 1;
            prevColor = color;
            outCount += prevCount;
         } else if (prevCount === 1) {
            out += prevColor;
            prevColor = color;
            outCount += 1;
         }
      } else {
         prevCount += 1;
      }
      if (goNextColor) {
         colorIdx += 1;
      }
   }
   return out;
}
