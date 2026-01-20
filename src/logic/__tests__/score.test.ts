import { describe, test, expect } from 'vitest';
import {
  ALL_CLEAR_BONUS,
  getChainBonus,
  getConnectionBonus,
  getColorBonus,
  getTotalConnectionBonus,
  calculateScore,
} from '../score';
import { Position } from '../types';

describe('score', () => {
  describe('ALL_CLEAR_BONUS', () => {
    test('should be 2100 (Puyo Puyo Tsu standard)', () => {
      expect(ALL_CLEAR_BONUS).toBe(2100);
    });
  });

  describe('getChainBonus', () => {
    test('should return 0 for chain count <= 0', () => {
      expect(getChainBonus(0)).toBe(0);
      expect(getChainBonus(-1)).toBe(0);
    });

    test('should return 0 for 1st chain', () => {
      expect(getChainBonus(1)).toBe(0);
    });

    test('should return 8 for 2nd chain', () => {
      expect(getChainBonus(2)).toBe(8);
    });

    test('should return 16 for 3rd chain', () => {
      expect(getChainBonus(3)).toBe(16);
    });

    test('should return 32 for 4th chain', () => {
      expect(getChainBonus(4)).toBe(32);
    });

    test('should return 64 for 5th chain', () => {
      expect(getChainBonus(5)).toBe(64);
    });

    test('should return 96 for 6th chain', () => {
      expect(getChainBonus(6)).toBe(96);
    });

    test('should return 128 for 7th chain', () => {
      expect(getChainBonus(7)).toBe(128);
    });

    test('should return 160 for 8th chain', () => {
      expect(getChainBonus(8)).toBe(160);
    });

    test('should return 192 for 9th chain', () => {
      expect(getChainBonus(9)).toBe(192);
    });

    test('should return 224 for 10th chain', () => {
      expect(getChainBonus(10)).toBe(224);
    });

    test('should return 256 for 11th chain', () => {
      expect(getChainBonus(11)).toBe(256);
    });

    test('should return 288 for 12th chain', () => {
      expect(getChainBonus(12)).toBe(288);
    });

    test('should return 320 (max) for 13th chain and above', () => {
      expect(getChainBonus(13)).toBe(320);
      expect(getChainBonus(14)).toBe(320);
      expect(getChainBonus(20)).toBe(320);
    });
  });

  describe('getConnectionBonus', () => {
    test('should return 0 for connection count < 4', () => {
      expect(getConnectionBonus(0)).toBe(0);
      expect(getConnectionBonus(1)).toBe(0);
      expect(getConnectionBonus(2)).toBe(0);
      expect(getConnectionBonus(3)).toBe(0);
    });

    test('should return 0 for 4 connected', () => {
      expect(getConnectionBonus(4)).toBe(0);
    });

    test('should return 2 for 5 connected', () => {
      expect(getConnectionBonus(5)).toBe(2);
    });

    test('should return 3 for 6 connected', () => {
      expect(getConnectionBonus(6)).toBe(3);
    });

    test('should return 4 for 7 connected', () => {
      expect(getConnectionBonus(7)).toBe(4);
    });

    test('should return 5 for 8 connected', () => {
      expect(getConnectionBonus(8)).toBe(5);
    });

    test('should return 6 for 9 connected', () => {
      expect(getConnectionBonus(9)).toBe(6);
    });

    test('should return 7 for 10 connected', () => {
      expect(getConnectionBonus(10)).toBe(7);
    });

    test('should return 10 (max) for 11+ connected', () => {
      expect(getConnectionBonus(11)).toBe(10);
      expect(getConnectionBonus(12)).toBe(10);
      expect(getConnectionBonus(20)).toBe(10);
    });
  });

  describe('getColorBonus', () => {
    test('should return 0 for color count <= 0', () => {
      expect(getColorBonus(0)).toBe(0);
      expect(getColorBonus(-1)).toBe(0);
    });

    test('should return 0 for 1 color', () => {
      expect(getColorBonus(1)).toBe(0);
    });

    test('should return 3 for 2 colors', () => {
      expect(getColorBonus(2)).toBe(3);
    });

    test('should return 6 for 3 colors', () => {
      expect(getColorBonus(3)).toBe(6);
    });

    test('should return 12 for 4 colors', () => {
      expect(getColorBonus(4)).toBe(12);
    });

    test('should return 12 (max) for 5+ colors', () => {
      expect(getColorBonus(5)).toBe(12);
    });
  });

  describe('getTotalConnectionBonus', () => {
    test('should sum connection bonuses from all groups', () => {
      const groups: Position[][] = [
        // 4 connected = 0 bonus
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }],
        // 5 connected = 2 bonus
        [{ x: 3, y: 10 }, { x: 3, y: 11 }, { x: 3, y: 12 }, { x: 4, y: 12 }, { x: 5, y: 12 }],
      ];

      expect(getTotalConnectionBonus(groups)).toBe(2); // 0 + 2
    });

    test('should return 0 for empty groups', () => {
      expect(getTotalConnectionBonus([])).toBe(0);
    });

    test('should calculate bonus for large group', () => {
      // 11 connected = 10 bonus
      const groups: Position[][] = [
        Array.from({ length: 11 }, (_, i) => ({ x: 0, y: i + 2 })),
      ];

      expect(getTotalConnectionBonus(groups)).toBe(10);
    });
  });

  describe('calculateScore', () => {
    test('should calculate score for 1st chain with 4 puyos', () => {
      // 1st chain: chainBonus = 0, 4 puyos: connectionBonus = 0, 1 color: colorBonus = 0
      // Total bonus = 0, but min is 1
      // Score = 4 * 10 * 1 = 40
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }],
      ];

      expect(calculateScore(4, 1, groups, 1)).toBe(40);
    });

    test('should calculate score for 2nd chain', () => {
      // 2nd chain: chainBonus = 8, 4 puyos: connectionBonus = 0, 1 color: colorBonus = 0
      // Score = 4 * 10 * 8 = 320
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }],
      ];

      expect(calculateScore(4, 2, groups, 1)).toBe(320);
    });

    test('should calculate score with multiple colors', () => {
      // 1st chain: chainBonus = 0, 8 puyos: connectionBonus = 0 + 0 = 0
      // 2 colors: colorBonus = 3
      // Score = 8 * 10 * 3 = 240
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }],
        [{ x: 3, y: 10 }, { x: 3, y: 11 }, { x: 3, y: 12 }, { x: 4, y: 12 }],
      ];

      expect(calculateScore(8, 1, groups, 2)).toBe(240);
    });

    test('should calculate score with large connection', () => {
      // 1st chain: chainBonus = 0, 5 puyos: connectionBonus = 2, 1 color: colorBonus = 0
      // Score = 5 * 10 * 2 = 100
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }, { x: 1, y: 11 }],
      ];

      expect(calculateScore(5, 1, groups, 1)).toBe(100);
    });

    test('should cap total bonus at 999', () => {
      // High chain with many colors and connections
      // 13th chain: chainBonus = 320
      // Many puyos with large connections
      const groups: Position[][] = [
        Array.from({ length: 11 }, (_, i) => ({ x: 0, y: i + 2 })), // 11 connected = 10
        Array.from({ length: 11 }, (_, i) => ({ x: 1, y: i + 2 })), // 11 connected = 10
        Array.from({ length: 11 }, (_, i) => ({ x: 2, y: i + 2 })), // 11 connected = 10
        Array.from({ length: 11 }, (_, i) => ({ x: 3, y: i + 2 })), // 11 connected = 10
      ];

      // chainBonus = 320, connectionBonus = 40, colorBonus = 12
      // total = 372, under 999 so no cap
      const score = calculateScore(44, 13, groups, 4);
      expect(score).toBe(44 * 10 * 372); // 163680
    });

    test('should apply 999 cap for very high bonuses', () => {
      // Create a scenario where bonus would exceed 999
      // This would require extreme chains and connections
      const groups: Position[][] = [
        Array.from({ length: 11 }, (_, i) => ({ x: 0, y: i + 2 })),
        Array.from({ length: 11 }, (_, i) => ({ x: 1, y: i + 2 })),
        Array.from({ length: 11 }, (_, i) => ({ x: 2, y: i + 2 })),
        Array.from({ length: 11 }, (_, i) => ({ x: 3, y: i + 2 })),
        Array.from({ length: 11 }, (_, i) => ({ x: 4, y: i + 2 })),
        Array.from({ length: 11 }, (_, i) => ({ x: 5, y: i + 2 })),
      ];
      // 66 puyos, 6 groups of 11
      // 19th chain: chainBonus = 320 (max)
      // connectionBonus = 10 * 6 = 60
      // colorBonus = 12 (4 colors max)
      // Still under 999, but let's verify formula works

      // To reach > 999 we need many more connection bonuses
      // Let's just verify the cap logic with a high value manually
      const highGroups: Position[][] = Array.from({ length: 100 }, (_, i) =>
        Array.from({ length: 11 }, (_, j) => ({ x: i % 6, y: (j + i * 11) % 11 + 2 }))
      );
      // This creates many groups with 11 connections each
      // connectionBonus = 10 * 100 = 1000, which exceeds 999

      const score = calculateScore(1100, 13, highGroups, 4);
      // chainBonus = 320, connectionBonus = 1000, colorBonus = 12
      // total = 1332, capped to 999
      expect(score).toBe(1100 * 10 * 999);
    });

    test('should use minimum bonus of 1 when all bonuses are 0', () => {
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }],
      ];

      // 1st chain, 4 connected, 1 color = all bonuses are 0
      const score = calculateScore(4, 1, groups, 1);
      expect(score).toBe(4 * 10 * 1); // Uses 1 as minimum bonus
    });
  });
});
