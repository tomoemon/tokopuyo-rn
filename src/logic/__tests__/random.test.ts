import { describe, test, expect } from 'vitest';
import { PuyoRng, generateSeed } from '../random';
import { COLORS, RngState } from '../types';

describe('random', () => {
  describe('PuyoRng', () => {
    test('should create instance with seed', () => {
      const seed: RngState = [1, 2, 3, 4];
      const rng = new PuyoRng(seed);

      expect(rng).toBeDefined();
    });

    test('should produce deterministic results with same seed', () => {
      const seed: RngState = [12345, 67890, 11111, 22222];
      const rng1 = new PuyoRng(seed);
      const rng2 = new PuyoRng(seed);

      // Same seed should produce same sequence
      for (let i = 0; i < 100; i++) {
        expect(rng1.random()).toBe(rng2.random());
      }
    });

    test('should produce different results with different seeds', () => {
      const rng1 = new PuyoRng([1, 2, 3, 4]);
      const rng2 = new PuyoRng([5, 6, 7, 8]);

      // Different seeds should produce different results
      const values1: number[] = [];
      const values2: number[] = [];
      for (let i = 0; i < 10; i++) {
        values1.push(rng1.random());
        values2.push(rng2.random());
      }

      expect(values1).not.toEqual(values2);
    });

    describe('random', () => {
      test('should return values between 0 and 1', () => {
        const rng = new PuyoRng([98765, 43210, 12345, 67890]);

        for (let i = 0; i < 1000; i++) {
          const value = rng.random();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
        }
      });
    });

    describe('nextInt', () => {
      test('should return integer values in range [0, max)', () => {
        const rng = new PuyoRng([11111, 22222, 33333, 44444]);
        const max = 10;

        for (let i = 0; i < 1000; i++) {
          const value = rng.nextInt(max);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(max);
          expect(Number.isInteger(value)).toBe(true);
        }
      });

      test('should return 0 for max of 1', () => {
        const rng = new PuyoRng([11111, 22222, 33333, 44444]);

        for (let i = 0; i < 10; i++) {
          expect(rng.nextInt(1)).toBe(0);
        }
      });
    });

    describe('nextColor', () => {
      test('should return valid puyo colors', () => {
        const rng = new PuyoRng([55555, 66666, 77777, 88888]);

        for (let i = 0; i < 1000; i++) {
          const color = rng.nextColor();
          expect(COLORS).toContain(color);
        }
      });

      test('should return all colors eventually', () => {
        const rng = new PuyoRng([99999, 11111, 22222, 33333]);
        const seenColors = new Set<string>();

        for (let i = 0; i < 1000; i++) {
          seenColors.add(rng.nextColor());
        }

        expect(seenColors.size).toBe(4);
        expect(seenColors.has('red')).toBe(true);
        expect(seenColors.has('blue')).toBe(true);
        expect(seenColors.has('green')).toBe(true);
        expect(seenColors.has('yellow')).toBe(true);
      });
    });

    describe('nextPuyoPair', () => {
      test('should return pair of valid colors', () => {
        const rng = new PuyoRng([12121, 34343, 56565, 78787]);

        for (let i = 0; i < 100; i++) {
          const [pivot, satellite] = rng.nextPuyoPair();
          expect(COLORS).toContain(pivot);
          expect(COLORS).toContain(satellite);
        }
      });

      test('should return tuple of exactly 2 colors', () => {
        const rng = new PuyoRng([11111, 22222, 33333, 44444]);

        const pair = rng.nextPuyoPair();
        expect(pair).toHaveLength(2);
      });
    });

    describe('getState / setState', () => {
      test('should save and restore state correctly', () => {
        const rng = new PuyoRng([12345, 67890, 11111, 22222]);

        // Generate some values
        rng.random();
        rng.random();
        rng.random();

        // Save state
        const savedState = rng.getState();

        // Generate more values and save them
        const values1: number[] = [];
        for (let i = 0; i < 10; i++) {
          values1.push(rng.random());
        }

        // Restore state
        rng.setState(savedState);

        // Generate same values again
        const values2: number[] = [];
        for (let i = 0; i < 10; i++) {
          values2.push(rng.random());
        }

        expect(values1).toEqual(values2);
      });

      test('getState should return array of 4 numbers', () => {
        const rng = new PuyoRng([1, 2, 3, 4]);
        const state = rng.getState();

        expect(state).toHaveLength(4);
        expect(typeof state[0]).toBe('number');
        expect(typeof state[1]).toBe('number');
        expect(typeof state[2]).toBe('number');
        expect(typeof state[3]).toBe('number');
      });
    });
  });

  describe('generateSeed', () => {
    test('should return array of 4 numbers', () => {
      const seed = generateSeed();

      expect(seed).toHaveLength(4);
      expect(typeof seed[0]).toBe('number');
      expect(typeof seed[1]).toBe('number');
      expect(typeof seed[2]).toBe('number');
      expect(typeof seed[3]).toBe('number');
    });

    test('should return numbers in valid range', () => {
      for (let i = 0; i < 100; i++) {
        const seed = generateSeed();
        for (const value of seed) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(0x100000000);
          expect(Number.isInteger(value)).toBe(true);
        }
      }
    });

    test('should generate different seeds each time (with high probability)', () => {
      const seeds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        seeds.add(generateSeed().join(','));
      }

      // With random generation, almost all should be unique
      expect(seeds.size).toBeGreaterThan(90);
    });
  });
});
