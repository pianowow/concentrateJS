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
