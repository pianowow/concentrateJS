import { describe, it, expect } from 'vitest';
import { roundTo, assert } from '../util';

describe('roundTo', () => {
   it('rounds to specified decimal places', () => {
      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.2355, 2)).toBe(1.24);
      expect(roundTo(100.1, 0)).toBe(100);
   });
});

describe('assert', () => {
   it('does not throw when condition is true', () => {
      expect(() => assert(true)).not.toThrow();
   });

   it('throws with default message when condition is false', () => {
      expect(() => assert(false)).toThrowError(new Error('Assertion failed'));
   });

   it('throws with custom message', () => {
      expect(() => assert(0, 'Bad thing')).toThrowError(new Error('Bad thing'));
   });
});
