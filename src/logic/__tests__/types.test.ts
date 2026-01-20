import { describe, test, expect } from 'vitest';
import {
  FIELD_COLS,
  FIELD_ROWS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
  TOTAL_ROWS,
  CONNECT_COUNT,
  COLORS,
} from '../types';

describe('types', () => {
  describe('constants', () => {
    test('FIELD_COLS should be 6', () => {
      expect(FIELD_COLS).toBe(6);
    });

    test('FIELD_ROWS should be 13 (including hidden row)', () => {
      expect(FIELD_ROWS).toBe(13);
    });

    test('VISIBLE_ROWS should be 12', () => {
      expect(VISIBLE_ROWS).toBe(12);
    });

    test('HIDDEN_ROWS should be 1', () => {
      expect(HIDDEN_ROWS).toBe(1);
    });

    test('TOTAL_ROWS should equal VISIBLE_ROWS + HIDDEN_ROWS', () => {
      expect(TOTAL_ROWS).toBe(VISIBLE_ROWS + HIDDEN_ROWS);
    });

    test('CONNECT_COUNT should be 4 (puyos needed to clear)', () => {
      expect(CONNECT_COUNT).toBe(4);
    });

    test('COLORS should contain 4 colors', () => {
      expect(COLORS).toHaveLength(4);
      expect(COLORS).toContain('red');
      expect(COLORS).toContain('blue');
      expect(COLORS).toContain('green');
      expect(COLORS).toContain('yellow');
    });
  });
});
