import { bench, describe } from 'vitest';

// Sinks to prevent dead code elimination
let sinkArray: number[] = [];
let sinkNumber: number = 0;
let sinkBoolean: boolean = true;

// Generate test data
const generateTestString = (length: number): string => {
   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
   let result = '';
   for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
   }
   return result;
};

// Test strings of various sizes
const shortString = generateTestString(25);
const longString = generateTestString(10000);
const veryLongString = generateTestString(100000);

// Search patterns
const singleChar = 'M';

describe('Single Character Search - Short String (100 chars)', () => {
   const haystack = shortString;
   const needle = singleChar;

   bench('indexOf loop', () => {
      const positions: number[] = [];
      let pos = haystack.indexOf(needle);
      while (pos !== -1) {
         positions.push(pos);
         pos = haystack.indexOf(needle, pos + 1);
      }
      sinkArray = positions;
   });

   bench('for loop with charCodeAt', () => {
      const positions: number[] = [];
      const needleCode = needle.charCodeAt(0);
      for (let i = 0; i < haystack.length; i++) {
         if (haystack.charCodeAt(i) === needleCode) {
            positions.push(i);
         }
      }
      sinkArray = positions;
   });

   bench('for loop with bracket access', () => {
      const positions: number[] = [];
      for (let i = 0; i < haystack.length; i++) {
         if (haystack[i] === needle) {
            positions.push(i);
         }
      }
      sinkArray = positions;
   });

   bench('for-of with index tracking', () => {
      const positions: number[] = [];
      let i = 0;
      for (const char of haystack) {
         if (char === needle) {
            positions.push(i);
         }
         i++;
      }
      sinkArray = positions;
   });

   bench('split and reduce', () => {
      const positions: number[] = [];
      haystack.split('').reduce((idx, char) => {
         if (char === needle) positions.push(idx);
         return idx + 1;
      }, 0);
      sinkArray = positions;
   });

   bench('Array.from with forEach', () => {
      const positions: number[] = [];
      Array.from(haystack).forEach((char, i) => {
         if (char === needle) positions.push(i);
      });
      sinkArray = positions;
   });

   bench('spread operator with forEach', () => {
      const positions: number[] = [];
      [...haystack].forEach((char, i) => {
         if (char === needle) positions.push(i);
      });
      sinkArray = positions;
   });

   bench('regex exec loop', () => {
      const positions: number[] = [];
      const regex = new RegExp(needle, 'g');
      let match;
      while ((match = regex.exec(haystack)) !== null) {
         positions.push(match.index);
      }
      sinkArray = positions;
   });

   bench('regex matchAll', () => {
      const positions: number[] = [];
      const regex = new RegExp(needle, 'g');
      for (const match of haystack.matchAll(regex)) {
         positions.push(match.index!);
      }
      sinkArray = positions;
   });

   bench('while loop with charCodeAt', () => {
      const positions: number[] = [];
      const needleCode = needle.charCodeAt(0);
      const len = haystack.length;
      let i = 0;
      while (i < len) {
         if (haystack.charCodeAt(i) === needleCode) {
            positions.push(i);
         }
         i++;
      }
      sinkArray = positions;
   });
});

describe('First Occurrence Only - indexOf vs manual', () => {
   const haystack = veryLongString;
   const needle = 'Z'; // Might be rare

   bench('indexOf', () => {
      sinkNumber = haystack.indexOf(needle);
   });

   bench('for loop with charCodeAt', () => {
      const needleCode = needle.charCodeAt(0);
      for (let i = 0; i < haystack.length; i++) {
         if (haystack.charCodeAt(i) === needleCode) {
            sinkNumber = i;
            return;
         }
      }
      sinkNumber = -1;
   });

   bench('for loop with bracket access', () => {
      for (let i = 0; i < haystack.length; i++) {
         if (haystack[i] === needle) {
            sinkNumber = i;
            return;
         }
      }
      sinkNumber = -1;
   });

   bench('search with regex', () => {
      sinkNumber = haystack.search(needle);
   });
});

describe('Check if Contains (boolean result)', () => {
   const haystack = veryLongString;
   const needle = 'Z';

   bench('includes', () => {
      sinkBoolean = haystack.includes(needle);
   });

   bench('indexOf !== -1', () => {
      sinkBoolean = haystack.indexOf(needle) !== -1;
   });

   bench('search !== -1', () => {
      sinkBoolean = haystack.search(needle) !== -1;
   });

   bench('regex test', () => {
      sinkBoolean = /Z/.test(haystack);
   });

   bench('for loop early exit', () => {
      const needleCode = needle.charCodeAt(0);
      for (let i = 0; i < haystack.length; i++) {
         if (haystack.charCodeAt(i) === needleCode) {
            sinkBoolean = true;
            return;
         }
      }
      sinkBoolean = false;
   });
});

describe('Count Occurrences', () => {
   const haystack = longString;
   const needle = singleChar;

   bench('indexOf loop', () => {
      let count = 0;
      let pos = haystack.indexOf(needle);
      while (pos !== -1) {
         count++;
         pos = haystack.indexOf(needle, pos + 1);
      }
      sinkNumber = count;
   });

   bench('split length - 1', () => {
      sinkNumber = haystack.split(needle).length - 1;
   });

   bench('regex match length', () => {
      const matches = haystack.match(new RegExp(needle, 'g'));
      sinkNumber = matches ? matches.length : 0;
   });

   bench('for loop charCodeAt', () => {
      let count = 0;
      const needleCode = needle.charCodeAt(0);
      for (let i = 0; i < haystack.length; i++) {
         if (haystack.charCodeAt(i) === needleCode) {
            count++;
         }
      }
      sinkNumber = count;
   });

   bench('reduce', () => {
      sinkNumber = [...haystack].reduce((count, char) => count + (char === needle ? 1 : 0), 0);
   });

   bench('filter length', () => {
      sinkNumber = [...haystack].filter((char) => char === needle).length;
   });
});

describe('Unrolled Loop Comparison (micro-optimization)', () => {
   const haystack = veryLongString;
   const needle = singleChar;
   const needleCode = needle.charCodeAt(0);

   bench('standard for loop', () => {
      let count = 0;
      for (let i = 0; i < haystack.length; i++) {
         if (haystack.charCodeAt(i) === needleCode) count++;
      }
      sinkNumber = count;
   });

   bench('unrolled 4x', () => {
      let count = 0;
      const len = haystack.length;
      const remainder = len % 4;
      let i = 0;

      for (; i < len - remainder; i += 4) {
         if (haystack.charCodeAt(i) === needleCode) count++;
         if (haystack.charCodeAt(i + 1) === needleCode) count++;
         if (haystack.charCodeAt(i + 2) === needleCode) count++;
         if (haystack.charCodeAt(i + 3) === needleCode) count++;
      }

      for (; i < len; i++) {
         if (haystack.charCodeAt(i) === needleCode) count++;
      }
      sinkNumber = count;
   });

   bench('unrolled 8x', () => {
      let count = 0;
      const len = haystack.length;
      const remainder = len % 8;
      let i = 0;

      for (; i < len - remainder; i += 8) {
         if (haystack.charCodeAt(i) === needleCode) count++;
         if (haystack.charCodeAt(i + 1) === needleCode) count++;
         if (haystack.charCodeAt(i + 2) === needleCode) count++;
         if (haystack.charCodeAt(i + 3) === needleCode) count++;
         if (haystack.charCodeAt(i + 4) === needleCode) count++;
         if (haystack.charCodeAt(i + 5) === needleCode) count++;
         if (haystack.charCodeAt(i + 6) === needleCode) count++;
         if (haystack.charCodeAt(i + 7) === needleCode) count++;
      }

      for (; i < len; i++) {
         if (haystack.charCodeAt(i) === needleCode) count++;
      }
      sinkNumber = count;
   });
});

//so linter doesn't say the sinks are never read
console.log(sinkArray);
console.log(sinkNumber);
console.log(sinkBoolean);
