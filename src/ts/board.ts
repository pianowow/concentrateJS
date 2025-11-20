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
