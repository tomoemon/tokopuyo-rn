import { describe, test, expect } from 'vitest';
import {
  createEmptyField,
  cloneField,
  placePuyo,
  getPuyo,
  isValidPosition,
  isEmpty,
  applyGravity,
  hasFloatingPuyos,
  removePuyos,
  isGameOver,
  isFieldEmpty,
} from '../field';
import { Field, FIELD_COLS, FIELD_ROWS } from '../types';

describe('field', () => {
  describe('createEmptyField', () => {
    test('should create a field with correct dimensions', () => {
      const field = createEmptyField();
      expect(field).toHaveLength(FIELD_ROWS);
      expect(field[0]).toHaveLength(FIELD_COLS);
    });

    test('should create a field with all null values', () => {
      const field = createEmptyField();
      for (let y = 0; y < FIELD_ROWS; y++) {
        for (let x = 0; x < FIELD_COLS; x++) {
          expect(field[y][x]).toBeNull();
        }
      }
    });
  });

  describe('cloneField', () => {
    test('should create a deep copy of the field', () => {
      const field = createEmptyField();
      field[5][3] = 'red';

      const cloned = cloneField(field);

      expect(cloned[5][3]).toBe('red');
      expect(cloned).not.toBe(field);
      expect(cloned[5]).not.toBe(field[5]);
    });

    test('should not affect original when modifying clone', () => {
      const field = createEmptyField();
      field[5][3] = 'red';

      const cloned = cloneField(field);
      cloned[5][3] = 'blue';

      expect(field[5][3]).toBe('red');
      expect(cloned[5][3]).toBe('blue');
    });
  });

  describe('placePuyo', () => {
    test('should place a puyo at valid position', () => {
      const field = createEmptyField();
      const newField = placePuyo(field, { x: 2, y: 5 }, 'red');

      expect(newField[5][2]).toBe('red');
    });

    test('should not modify original field', () => {
      const field = createEmptyField();
      placePuyo(field, { x: 2, y: 5 }, 'red');

      expect(field[5][2]).toBeNull();
    });

    test('should not place puyo at invalid position', () => {
      const field = createEmptyField();
      const newField = placePuyo(field, { x: -1, y: 5 }, 'red');

      // Field should remain empty
      for (let y = 0; y < FIELD_ROWS; y++) {
        for (let x = 0; x < FIELD_COLS; x++) {
          expect(newField[y][x]).toBeNull();
        }
      }
    });

    test('should not place puyo at occupied position', () => {
      const field = createEmptyField();
      field[5][2] = 'blue';

      const newField = placePuyo(field, { x: 2, y: 5 }, 'red');

      expect(newField[5][2]).toBe('blue');
    });
  });

  describe('getPuyo', () => {
    test('should return puyo color at valid position', () => {
      const field = createEmptyField();
      field[5][2] = 'red';

      expect(getPuyo(field, { x: 2, y: 5 })).toBe('red');
    });

    test('should return null for empty position', () => {
      const field = createEmptyField();

      expect(getPuyo(field, { x: 2, y: 5 })).toBeNull();
    });

    test('should return null for invalid position', () => {
      const field = createEmptyField();

      expect(getPuyo(field, { x: -1, y: 5 })).toBeNull();
      expect(getPuyo(field, { x: 10, y: 5 })).toBeNull();
      expect(getPuyo(field, { x: 2, y: -1 })).toBeNull();
      expect(getPuyo(field, { x: 2, y: 20 })).toBeNull();
    });
  });

  describe('isValidPosition', () => {
    test('should return true for valid positions', () => {
      expect(isValidPosition({ x: 0, y: 0 })).toBe(true);
      expect(isValidPosition({ x: 5, y: 12 })).toBe(true);
      expect(isValidPosition({ x: 3, y: 6 })).toBe(true);
    });

    test('should return false for invalid positions', () => {
      expect(isValidPosition({ x: -1, y: 0 })).toBe(false);
      expect(isValidPosition({ x: 6, y: 0 })).toBe(false);
      expect(isValidPosition({ x: 0, y: -1 })).toBe(false);
      expect(isValidPosition({ x: 0, y: 13 })).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('should return true for empty valid position', () => {
      const field = createEmptyField();

      expect(isEmpty(field, { x: 2, y: 5 })).toBe(true);
    });

    test('should return false for occupied position', () => {
      const field = createEmptyField();
      field[5][2] = 'red';

      expect(isEmpty(field, { x: 2, y: 5 })).toBe(false);
    });

    test('should return false for invalid position', () => {
      const field = createEmptyField();

      expect(isEmpty(field, { x: -1, y: 5 })).toBe(false);
    });
  });

  describe('applyGravity', () => {
    test('should drop floating puyos', () => {
      const field = createEmptyField();
      field[5][2] = 'red'; // floating puyo

      const newField = applyGravity(field);

      expect(newField[12][2]).toBe('red'); // bottom row
      expect(newField[5][2]).toBeNull();
    });

    test('should stack puyos correctly', () => {
      const field = createEmptyField();
      field[5][2] = 'red';
      field[8][2] = 'blue';

      const newField = applyGravity(field);

      expect(newField[12][2]).toBe('blue'); // bottom
      expect(newField[11][2]).toBe('red'); // on top
    });

    test('should not modify original field', () => {
      const field = createEmptyField();
      field[5][2] = 'red';

      applyGravity(field);

      expect(field[5][2]).toBe('red');
    });

    test('should handle already grounded puyos', () => {
      const field = createEmptyField();
      field[12][2] = 'red';

      const newField = applyGravity(field);

      expect(newField[12][2]).toBe('red');
    });
  });

  describe('hasFloatingPuyos', () => {
    test('should return true when there are floating puyos', () => {
      const field = createEmptyField();
      field[5][2] = 'red'; // floating

      expect(hasFloatingPuyos(field)).toBe(true);
    });

    test('should return false when all puyos are grounded', () => {
      const field = createEmptyField();
      field[12][2] = 'red';
      field[11][2] = 'blue';

      expect(hasFloatingPuyos(field)).toBe(false);
    });

    test('should return false for empty field', () => {
      const field = createEmptyField();

      expect(hasFloatingPuyos(field)).toBe(false);
    });
  });

  describe('removePuyos', () => {
    test('should remove puyos at specified positions', () => {
      const field = createEmptyField();
      field[5][2] = 'red';
      field[5][3] = 'blue';
      field[6][2] = 'green';

      const newField = removePuyos(field, [
        { x: 2, y: 5 },
        { x: 3, y: 5 },
      ]);

      expect(newField[5][2]).toBeNull();
      expect(newField[5][3]).toBeNull();
      expect(newField[6][2]).toBe('green'); // not removed
    });

    test('should not modify original field', () => {
      const field = createEmptyField();
      field[5][2] = 'red';

      removePuyos(field, [{ x: 2, y: 5 }]);

      expect(field[5][2]).toBe('red');
    });

    test('should ignore invalid positions', () => {
      const field = createEmptyField();

      const newField = removePuyos(field, [{ x: -1, y: 5 }]);

      // Should not throw, just ignore
      expect(newField).toBeDefined();
    });
  });

  describe('isGameOver', () => {
    test('should return true when center columns of visible top row are occupied', () => {
      const field = createEmptyField();
      field[1][2] = 'red'; // visible top row, column 3

      expect(isGameOver(field)).toBe(true);
    });

    test('should return true when column 4 is occupied', () => {
      const field = createEmptyField();
      field[1][3] = 'red'; // visible top row, column 4

      expect(isGameOver(field)).toBe(true);
    });

    test('should return false when game over positions are empty', () => {
      const field = createEmptyField();
      field[1][0] = 'red'; // different column
      field[1][5] = 'blue'; // different column

      expect(isGameOver(field)).toBe(false);
    });

    test('should return false for empty field', () => {
      const field = createEmptyField();

      expect(isGameOver(field)).toBe(false);
    });
  });

  describe('isFieldEmpty', () => {
    test('should return true for empty field', () => {
      const field = createEmptyField();

      expect(isFieldEmpty(field)).toBe(true);
    });

    test('should return false when field has puyos', () => {
      const field = createEmptyField();
      field[12][0] = 'red';

      expect(isFieldEmpty(field)).toBe(false);
    });
  });
});
