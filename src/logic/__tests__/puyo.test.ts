import { describe, test, expect } from 'vitest';
import {
  getSatelliteOffset,
  getSatellitePosition,
  canPlace,
  movePuyo,
  dropPuyo,
  rotatePuyo,
  hardDropPuyo,
  createFallingPuyo,
  isLanded,
  setColumn,
  setRotation,
} from '../puyo';
import { createEmptyField } from '../field';
import { FallingPuyo, FIELD_COLS, FIELD_ROWS } from '../types';

describe('puyo', () => {
  describe('getSatelliteOffset', () => {
    test('rotation 0 (up) should return offset { x: 0, y: -1 }', () => {
      expect(getSatelliteOffset(0)).toEqual({ x: 0, y: -1 });
    });

    test('rotation 1 (right) should return offset { x: 1, y: 0 }', () => {
      expect(getSatelliteOffset(1)).toEqual({ x: 1, y: 0 });
    });

    test('rotation 2 (down) should return offset { x: 0, y: 1 }', () => {
      expect(getSatelliteOffset(2)).toEqual({ x: 0, y: 1 });
    });

    test('rotation 3 (left) should return offset { x: -1, y: 0 }', () => {
      expect(getSatelliteOffset(3)).toEqual({ x: -1, y: 0 });
    });
  });

  describe('getSatellitePosition', () => {
    test('should return correct satellite position for rotation 0', () => {
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      expect(getSatellitePosition(fallingPuyo)).toEqual({ x: 2, y: 4 });
    });

    test('should return correct satellite position for rotation 1', () => {
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 1,
      };

      expect(getSatellitePosition(fallingPuyo)).toEqual({ x: 3, y: 5 });
    });

    test('should return correct satellite position for rotation 2', () => {
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      expect(getSatellitePosition(fallingPuyo)).toEqual({ x: 2, y: 6 });
    });

    test('should return correct satellite position for rotation 3', () => {
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 3,
      };

      expect(getSatellitePosition(fallingPuyo)).toEqual({ x: 1, y: 5 });
    });
  });

  describe('canPlace', () => {
    test('should return true for valid position', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite below
      };

      expect(canPlace(field, fallingPuyo)).toBe(true);
    });

    test('should return false when pivot is outside field', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: -1, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      expect(canPlace(field, fallingPuyo)).toBe(false);
    });

    test('should return false when pivot position is occupied', () => {
      const field = createEmptyField();
      field[5][2] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      expect(canPlace(field, fallingPuyo)).toBe(false);
    });

    test('should return false when satellite position is occupied', () => {
      const field = createEmptyField();
      field[6][2] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite at (2, 6)
      };

      expect(canPlace(field, fallingPuyo)).toBe(false);
    });

    test('should return true when satellite is above field (y < 0)', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 0 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0, // satellite at (2, -1)
      };

      expect(canPlace(field, fallingPuyo)).toBe(true);
    });

    test('should return false when satellite is above field but x is invalid', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: -1, y: 0 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      expect(canPlace(field, fallingPuyo)).toBe(false);
    });
  });

  describe('movePuyo', () => {
    test('should move puyo left', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = movePuyo(field, fallingPuyo, 'left');

      expect(result).not.toBeNull();
      expect(result!.pivot.pos.x).toBe(1);
    });

    test('should move puyo right', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = movePuyo(field, fallingPuyo, 'right');

      expect(result).not.toBeNull();
      expect(result!.pivot.pos.x).toBe(3);
    });

    test('should return null when move would hit wall', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 0, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = movePuyo(field, fallingPuyo, 'left');

      expect(result).toBeNull();
    });

    test('should return null when move would hit other puyo', () => {
      const field = createEmptyField();
      field[5][3] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = movePuyo(field, fallingPuyo, 'right');

      expect(result).toBeNull();
    });

    test('should return null when satellite would hit wall after move', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 5, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 1, // satellite to the right
      };

      const result = movePuyo(field, fallingPuyo, 'right');

      expect(result).toBeNull();
    });
  });

  describe('dropPuyo', () => {
    test('should drop puyo one row', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = dropPuyo(field, fallingPuyo);

      expect(result).not.toBeNull();
      expect(result!.pivot.pos.y).toBe(6);
    });

    test('should return null when at bottom', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 11 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite at (2, 12) - bottom row
      };

      const result = dropPuyo(field, fallingPuyo);

      expect(result).toBeNull();
    });

    test('should return null when puyo below', () => {
      const field = createEmptyField();
      field[7][2] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite at (2, 6)
      };

      const result = dropPuyo(field, fallingPuyo);

      expect(result).toBeNull();
    });
  });

  describe('rotatePuyo', () => {
    test('should rotate clockwise', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      const result = rotatePuyo(field, fallingPuyo, 'cw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(1);
    });

    test('should rotate counter-clockwise', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      const result = rotatePuyo(field, fallingPuyo, 'ccw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(3);
    });

    test('should wrap around clockwise (3 -> 0)', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 3,
      };

      const result = rotatePuyo(field, fallingPuyo, 'cw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(0);
    });

    test('should wall kick when rotating into left wall', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 0, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0, // satellite above
      };

      // Rotate to have satellite on left (rotation 3) - would be at x=-1
      const result = rotatePuyo(field, fallingPuyo, 'ccw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(3);
      expect(result!.pivot.pos.x).toBe(1); // kicked right
    });

    test('should wall kick when rotating into right wall', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 5, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0, // satellite above
      };

      // Rotate to have satellite on right (rotation 1) - would be at x=6
      const result = rotatePuyo(field, fallingPuyo, 'cw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(1);
      expect(result!.pivot.pos.x).toBe(4); // kicked left
    });

    test('should wall kick when rotating into floor', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 12 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 1, // satellite right
      };

      // Rotate to have satellite below (rotation 2) - would be at y=13
      const result = rotatePuyo(field, fallingPuyo, 'cw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(2);
      expect(result!.pivot.pos.y).toBe(11); // kicked up
    });

    test('should wall kick when rotating into other puyo', () => {
      const field = createEmptyField();
      field[5][3] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0, // satellite above
      };

      // Rotate to have satellite on right (rotation 1) - would hit green puyo
      const result = rotatePuyo(field, fallingPuyo, 'cw');

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(1);
      expect(result!.pivot.pos.x).toBe(1); // kicked left
    });

    test('should return null when rotation is impossible', () => {
      const field = createEmptyField();
      // Block all possible positions
      field[4][0] = 'green';
      field[5][1] = 'green';
      field[6][0] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 0, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      // Rotating CW would put satellite at (1, 5) which is occupied
      // Wall kick would try (-1, 5) which is invalid
      const result = rotatePuyo(field, fallingPuyo, 'cw');

      expect(result).toBeNull();
    });
  });

  describe('hardDropPuyo', () => {
    test('should drop puyo to bottom', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 0 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite below
      };

      const result = hardDropPuyo(field, fallingPuyo);

      expect(result.pivot.pos.y).toBe(11); // bottom - 1 (satellite at 12)
    });

    test('should stop on top of other puyo', () => {
      const field = createEmptyField();
      field[10][2] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 0 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite below
      };

      const result = hardDropPuyo(field, fallingPuyo);

      expect(result.pivot.pos.y).toBe(8); // satellite at 9, above green at 10
    });
  });

  describe('createFallingPuyo', () => {
    test('should create falling puyo at spawn position', () => {
      const result = createFallingPuyo('red', 'blue');

      expect(result.pivot.pos).toEqual({ x: 2, y: 0 }); // column 3, hidden row
      expect(result.pivot.color).toBe('red');
      expect(result.satellite.color).toBe('blue');
      expect(result.rotation).toBe(0); // satellite above
    });
  });

  describe('isLanded', () => {
    test('should return true when puyo cannot drop further', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 11 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite at bottom
      };

      expect(isLanded(field, fallingPuyo)).toBe(true);
    });

    test('should return false when puyo can still drop', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      expect(isLanded(field, fallingPuyo)).toBe(false);
    });
  });

  describe('setColumn', () => {
    test('should set column directly', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = setColumn(field, fallingPuyo, 4);

      expect(result).not.toBeNull();
      expect(result!.pivot.pos.x).toBe(4);
    });

    test('should return null when column is invalid', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = setColumn(field, fallingPuyo, -1);

      expect(result).toBeNull();
    });

    test('should return null when column is occupied', () => {
      const field = createEmptyField();
      field[5][4] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2,
      };

      const result = setColumn(field, fallingPuyo, 4);

      expect(result).toBeNull();
    });
  });

  describe('setRotation', () => {
    test('should set rotation directly', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      const result = setRotation(field, fallingPuyo, 2);

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(2);
    });

    test('should wall kick when needed', () => {
      const field = createEmptyField();
      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 0, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      // Set rotation to 3 (satellite left) - would be at x=-1
      const result = setRotation(field, fallingPuyo, 3);

      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(3);
      expect(result!.pivot.pos.x).toBe(1); // kicked right
    });

    test('should return null when rotation is impossible', () => {
      const field = createEmptyField();
      field[5][1] = 'green';

      const fallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 0, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      // Set rotation to 3 (satellite left at x=-1), kick to x=1 but blocked
      const result = setRotation(field, fallingPuyo, 3);

      expect(result).toBeNull();
    });
  });
});
