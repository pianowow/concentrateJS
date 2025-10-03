export function roundTo(num, decimalPlaces) {
   const factor = Math.pow(10, decimalPlaces);
   return Math.round(num * factor) / factor;
}

export function assert(condition, message = 'Assertion failed') {
   if (!condition) {
      throw new Error(message);
   }
}
