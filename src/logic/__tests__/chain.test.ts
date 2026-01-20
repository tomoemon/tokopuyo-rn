import { describe, test, expect } from 'vitest';
import {
  findConnectedPuyos,
  findErasableGroups,
  hasErasableGroups,
  countColors,
  countErasedPuyos,
  flattenGroups,
} from '../chain';
import { createEmptyField } from '../field';
import { Position, HIDDEN_ROWS } from '../types';

describe('chain', () => {
  describe('findConnectedPuyos', () => {
    test('should find single puyo', () => {
      const field = createEmptyField();
      field[5][2] = 'red';

      const connected = findConnectedPuyos(field, { x: 2, y: 5 });

      expect(connected).toHaveLength(1);
      expect(connected[0]).toEqual({ x: 2, y: 5 });
    });

    test('should find horizontally connected puyos', () => {
      const field = createEmptyField();
      field[5][2] = 'red';
      field[5][3] = 'red';
      field[5][4] = 'red';

      const connected = findConnectedPuyos(field, { x: 2, y: 5 });

      expect(connected).toHaveLength(3);
    });

    test('should find vertically connected puyos', () => {
      const field = createEmptyField();
      field[5][2] = 'red';
      field[6][2] = 'red';
      field[7][2] = 'red';

      const connected = findConnectedPuyos(field, { x: 2, y: 5 });

      expect(connected).toHaveLength(3);
    });

    test('should find L-shaped connected puyos', () => {
      const field = createEmptyField();
      field[5][2] = 'red';
      field[5][3] = 'red';
      field[6][2] = 'red';
      field[7][2] = 'red';

      const connected = findConnectedPuyos(field, { x: 2, y: 5 });

      expect(connected).toHaveLength(4);
    });

    test('should not include different colored puyos', () => {
      const field = createEmptyField();
      field[5][2] = 'red';
      field[5][3] = 'blue'; // different color

      const connected = findConnectedPuyos(field, { x: 2, y: 5 });

      expect(connected).toHaveLength(1);
    });

    test('should return empty array for empty position', () => {
      const field = createEmptyField();

      const connected = findConnectedPuyos(field, { x: 2, y: 5 });

      expect(connected).toHaveLength(0);
    });

    test('should not include puyos in hidden row', () => {
      const field = createEmptyField();
      field[0][2] = 'red'; // hidden row
      field[1][2] = 'red'; // visible row

      const connected = findConnectedPuyos(field, { x: 2, y: 1 });

      expect(connected).toHaveLength(1);
      expect(connected[0]).toEqual({ x: 2, y: 1 });
    });

    test('should not start search from hidden row', () => {
      const field = createEmptyField();
      field[0][2] = 'red'; // hidden row

      const connected = findConnectedPuyos(field, { x: 2, y: 0 });

      expect(connected).toHaveLength(0);
    });
  });

  describe('findErasableGroups', () => {
    test('should find group of 4 same color puyos', () => {
      const field = createEmptyField();
      // 4 connected red puyos
      field[10][2] = 'red';
      field[11][2] = 'red';
      field[12][2] = 'red';
      field[12][3] = 'red';

      const groups = findErasableGroups(field);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(4);
    });

    test('should not find group of 3 puyos (not enough)', () => {
      const field = createEmptyField();
      field[10][2] = 'red';
      field[11][2] = 'red';
      field[12][2] = 'red';

      const groups = findErasableGroups(field);

      expect(groups).toHaveLength(0);
    });

    test('should find multiple groups', () => {
      const field = createEmptyField();
      // Red group (4)
      field[10][0] = 'red';
      field[11][0] = 'red';
      field[12][0] = 'red';
      field[12][1] = 'red';
      // Blue group (4)
      field[10][4] = 'blue';
      field[11][4] = 'blue';
      field[12][4] = 'blue';
      field[12][5] = 'blue';

      const groups = findErasableGroups(field);

      expect(groups).toHaveLength(2);
    });

    test('should return empty array for empty field', () => {
      const field = createEmptyField();

      const groups = findErasableGroups(field);

      expect(groups).toHaveLength(0);
    });

    test('should not include hidden row puyos in groups', () => {
      const field = createEmptyField();
      // Group that touches hidden row
      field[0][2] = 'red'; // hidden row - should not count
      field[1][2] = 'red';
      field[2][2] = 'red';
      field[3][2] = 'red';

      const groups = findErasableGroups(field);

      // Only 3 visible puyos, not enough to erase
      expect(groups).toHaveLength(0);
    });

    test('should find group when 4 visible puyos connected', () => {
      const field = createEmptyField();
      field[1][2] = 'red';
      field[2][2] = 'red';
      field[3][2] = 'red';
      field[4][2] = 'red';

      const groups = findErasableGroups(field);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(4);
    });
  });

  describe('hasErasableGroups', () => {
    test('should return true when there are erasable groups', () => {
      const field = createEmptyField();
      field[10][2] = 'red';
      field[11][2] = 'red';
      field[12][2] = 'red';
      field[12][3] = 'red';

      expect(hasErasableGroups(field)).toBe(true);
    });

    test('should return false when there are no erasable groups', () => {
      const field = createEmptyField();
      field[10][2] = 'red';
      field[11][2] = 'red';
      field[12][2] = 'red';

      expect(hasErasableGroups(field)).toBe(false);
    });
  });

  describe('countColors', () => {
    test('should count single color', () => {
      const field = createEmptyField();
      field[10][2] = 'red';
      field[11][2] = 'red';
      field[12][2] = 'red';
      field[12][3] = 'red';

      const groups: Position[][] = [[
        { x: 2, y: 10 },
        { x: 2, y: 11 },
        { x: 2, y: 12 },
        { x: 3, y: 12 },
      ]];

      expect(countColors(field, groups)).toBe(1);
    });

    test('should count multiple colors', () => {
      const field = createEmptyField();
      field[10][0] = 'red';
      field[11][0] = 'red';
      field[12][0] = 'red';
      field[12][1] = 'red';
      field[10][4] = 'blue';
      field[11][4] = 'blue';
      field[12][4] = 'blue';
      field[12][5] = 'blue';

      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }],
        [{ x: 4, y: 10 }, { x: 4, y: 11 }, { x: 4, y: 12 }, { x: 5, y: 12 }],
      ];

      expect(countColors(field, groups)).toBe(2);
    });

    test('should return 0 for empty groups', () => {
      const field = createEmptyField();
      expect(countColors(field, [])).toBe(0);
    });
  });

  describe('countErasedPuyos', () => {
    test('should count total puyos in groups', () => {
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }, { x: 0, y: 12 }, { x: 1, y: 12 }], // 4
        [{ x: 4, y: 10 }, { x: 4, y: 11 }, { x: 4, y: 12 }, { x: 5, y: 12 }, { x: 5, y: 11 }], // 5
      ];

      expect(countErasedPuyos(groups)).toBe(9);
    });

    test('should return 0 for empty groups', () => {
      expect(countErasedPuyos([])).toBe(0);
    });
  });

  describe('flattenGroups', () => {
    test('should flatten groups into single array', () => {
      const groups: Position[][] = [
        [{ x: 0, y: 10 }, { x: 0, y: 11 }],
        [{ x: 4, y: 10 }, { x: 4, y: 11 }],
      ];

      const flattened = flattenGroups(groups);

      expect(flattened).toHaveLength(4);
      expect(flattened).toContainEqual({ x: 0, y: 10 });
      expect(flattened).toContainEqual({ x: 4, y: 11 });
    });

    test('should return empty array for empty groups', () => {
      expect(flattenGroups([])).toHaveLength(0);
    });
  });
});
