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
