export function roundTo(num: number, decimalPlaces: number) {
   const factor = Math.pow(10, decimalPlaces);
   return Math.round(num * factor) / factor;
}

export function assert(condition: boolean, message = 'Assertion failed') {
   if (!condition) {
      throw new Error(message);
   }
}
