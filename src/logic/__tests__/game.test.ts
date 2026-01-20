import { describe, test, expect } from 'vitest';
import {
  createInitialGameState,
  startGame,
  spawnNextPuyo,
  lockFallingPuyo,
  applyGravityToState,
  processChain,
  isChainFinished,
  advancePhase,
  updateFallingPuyo,
} from '../game';
import { createEmptyField, placePuyo } from '../field';
import { GameState, FallingPuyo, PuyoColor } from '../types';

describe('game', () => {
  describe('createInitialGameState', () => {
    test('should create initial state with provided next queue', () => {
      const nextQueue: [PuyoColor, PuyoColor][] = [
        ['red', 'blue'],
        ['green', 'yellow'],
      ];

      const state = createInitialGameState(nextQueue);

      expect(state.field).toBeDefined();
      expect(state.fallingPuyo).toBeNull();
      expect(state.nextQueue).toEqual(nextQueue);
      expect(state.score).toBe(0);
      expect(state.chainCount).toBe(0);
      expect(state.phase).toBe('ready');
    });

    test('should create empty field', () => {
      const state = createInitialGameState([['red', 'blue']]);

      // Check field is empty
      for (let y = 0; y < 13; y++) {
        for (let x = 0; x < 6; x++) {
          expect(state.field[y][x]).toBeNull();
        }
      }
    });
  });

  describe('startGame', () => {
    test('should spawn first puyo from queue', () => {
      const nextQueue: [PuyoColor, PuyoColor][] = [
        ['red', 'blue'],
        ['green', 'yellow'],
      ];
      const state = createInitialGameState(nextQueue);

      const newState = startGame(state, ['yellow', 'red']);

      expect(newState.fallingPuyo).not.toBeNull();
      expect(newState.fallingPuyo!.pivot.color).toBe('red');
      expect(newState.fallingPuyo!.satellite.color).toBe('blue');
      expect(newState.phase).toBe('falling');
    });

    test('should update next queue with new pair', () => {
      const nextQueue: [PuyoColor, PuyoColor][] = [
        ['red', 'blue'],
        ['green', 'yellow'],
      ];
      const state = createInitialGameState(nextQueue);

      const newState = startGame(state, ['yellow', 'red']);

      expect(newState.nextQueue).toEqual([
        ['green', 'yellow'],
        ['yellow', 'red'],
      ]);
    });
  });

  describe('spawnNextPuyo', () => {
    test('should spawn next puyo at correct position', () => {
      const state = createInitialGameState([
        ['red', 'blue'],
        ['green', 'yellow'],
      ]);

      const newState = spawnNextPuyo(state, ['yellow', 'red']);

      expect(newState.fallingPuyo).not.toBeNull();
      expect(newState.fallingPuyo!.pivot.pos).toEqual({ x: 2, y: 0 });
      expect(newState.fallingPuyo!.rotation).toBe(0);
    });

    test('should return unchanged state if queue is empty', () => {
      const state = createInitialGameState([]);

      const newState = spawnNextPuyo(state, ['red', 'blue']);

      expect(newState).toEqual(state);
    });

    test('should trigger game over if spawn position is blocked', () => {
      const state = createInitialGameState([
        ['red', 'blue'],
        ['green', 'yellow'],
      ]);
      // Block spawn position
      state.field[0][2] = 'green';

      const newState = spawnNextPuyo(state, ['yellow', 'red']);

      expect(newState.phase).toBe('gameover');
    });
  });

  describe('lockFallingPuyo', () => {
    test('should place puyo on field', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.fallingPuyo = {
        pivot: { pos: { x: 2, y: 11 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 2, // satellite below at (2, 12)
      };

      const newState = lockFallingPuyo(state);

      expect(newState.field[11][2]).toBe('red');
      expect(newState.field[12][2]).toBe('blue');
      expect(newState.fallingPuyo).toBeNull();
      expect(newState.phase).toBe('dropping');
    });

    test('should return unchanged state if no falling puyo', () => {
      const state = createInitialGameState([['red', 'blue']]);

      const newState = lockFallingPuyo(state);

      expect(newState).toEqual(state);
    });

    test('should not place satellite if above field', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.fallingPuyo = {
        pivot: { pos: { x: 2, y: 0 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0, // satellite above at (2, -1)
      };

      const newState = lockFallingPuyo(state);

      expect(newState.field[0][2]).toBe('red');
      // Satellite at y=-1 should not be placed (placePuyo handles invalid positions)
    });
  });

  describe('applyGravityToState', () => {
    test('should apply gravity to field', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.field[5][2] = 'red'; // floating puyo

      const newState = applyGravityToState(state);

      expect(newState.field[5][2]).toBeNull();
      expect(newState.field[12][2]).toBe('red');
    });
  });

  describe('processChain', () => {
    test('should process chain and update score', () => {
      const state = createInitialGameState([['red', 'blue']]);
      // Create 4 connected red puyos
      state.field[10][2] = 'red';
      state.field[11][2] = 'red';
      state.field[12][2] = 'red';
      state.field[12][3] = 'red';

      const { state: newState, result } = processChain(state);

      expect(result).not.toBeNull();
      expect(result!.groups).toHaveLength(1);
      expect(result!.chainCount).toBe(1);
      expect(newState.score).toBeGreaterThan(0);
      expect(newState.chainCount).toBe(1);
      expect(newState.phase).toBe('chaining');
    });

    test('should return null result if no chain', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.field[12][0] = 'red';
      state.field[12][1] = 'blue';

      const { state: newState, result } = processChain(state);

      expect(result).toBeNull();
      expect(newState).toEqual(state);
    });

    test('should detect all clear and add bonus', () => {
      const state = createInitialGameState([['red', 'blue']]);
      // Only 4 puyos, will be all clear after chain
      state.field[12][0] = 'red';
      state.field[12][1] = 'red';
      state.field[12][2] = 'red';
      state.field[12][3] = 'red';

      const { result } = processChain(state);

      expect(result!.isAllClear).toBe(true);
      // Score should include all clear bonus (2100)
      expect(result!.score).toBe(40 + 2100); // 4 puyos * 10 * 1 + 2100
    });

    test('should increment chain count', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.chainCount = 2; // Previous chain
      state.field[10][2] = 'red';
      state.field[11][2] = 'red';
      state.field[12][2] = 'red';
      state.field[12][3] = 'red';

      const { state: newState, result } = processChain(state);

      expect(result!.chainCount).toBe(3);
      expect(newState.chainCount).toBe(3);
    });
  });

  describe('isChainFinished', () => {
    test('should return true when no erasable groups', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.field[12][0] = 'red';
      state.field[12][1] = 'blue';

      expect(isChainFinished(state)).toBe(true);
    });

    test('should return false when there are erasable groups', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.field[10][2] = 'red';
      state.field[11][2] = 'red';
      state.field[12][2] = 'red';
      state.field[12][3] = 'red';

      expect(isChainFinished(state)).toBe(false);
    });
  });

  describe('advancePhase', () => {
    test('should transition from ready to falling', () => {
      const state = createInitialGameState([
        ['red', 'blue'],
        ['green', 'yellow'],
      ]);

      const newState = advancePhase(state, ['yellow', 'red']);

      expect(newState.phase).toBe('falling');
      expect(newState.fallingPuyo).not.toBeNull();
    });

    test('should throw error if newPair not provided for ready phase', () => {
      const state = createInitialGameState([['red', 'blue']]);

      expect(() => advancePhase(state)).toThrow('newPair is required for ready phase');
    });

    test('should transition from dropping to falling when no chain', () => {
      const state = createInitialGameState([
        ['red', 'blue'],
        ['green', 'yellow'],
      ]);
      state.phase = 'dropping';
      state.field[12][0] = 'red'; // No chain possible

      const newState = advancePhase(state, ['yellow', 'red']);

      expect(newState.phase).toBe('falling');
    });

    test('should transition from dropping to chaining when chain detected', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.phase = 'dropping';
      // Floating puyos that will form a chain after gravity
      state.field[5][0] = 'red';
      state.field[5][1] = 'red';
      state.field[5][2] = 'red';
      state.field[5][3] = 'red';

      const newState = advancePhase(state);

      expect(newState.phase).toBe('chaining');
      // Field should have gravity applied
      expect(newState.field[12][0]).toBe('red');
    });

    test('should reset chainCount when starting new chain sequence', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.phase = 'dropping';
      state.chainCount = 5; // Previous chain count
      state.field[5][0] = 'red';
      state.field[5][1] = 'red';
      state.field[5][2] = 'red';
      state.field[5][3] = 'red';

      const newState = advancePhase(state);

      expect(newState.chainCount).toBe(0);
    });

    test('should transition from dropping to gameover', () => {
      const state = createInitialGameState([
        ['red', 'blue'],
        ['green', 'yellow'],
      ]);
      state.phase = 'dropping';
      // Fill column so game over position stays filled after gravity
      // Use alternating colors to avoid forming a chain
      const colors: ('red' | 'blue' | 'green')[] = ['red', 'blue', 'green'];
      for (let y = 1; y <= 12; y++) {
        state.field[y][2] = colors[y % 3];
      }

      const newState = advancePhase(state, ['red', 'blue']);

      expect(newState.phase).toBe('gameover');
    });

    test('should process chain in chaining phase', () => {
      const state = createInitialGameState([
        ['red', 'blue'],
        ['green', 'yellow'],
      ]);
      state.phase = 'chaining';
      state.field[10][0] = 'red';
      state.field[11][0] = 'red';
      state.field[12][0] = 'red';
      state.field[12][1] = 'red';

      const newState = advancePhase(state, ['yellow', 'red']);

      // Chain was processed, no more chains, so spawn next puyo
      expect(newState.phase).toBe('falling');
      // Puyos should have been erased (field is empty after chain)
      expect(newState.field[10][0]).toBeNull();
    });

    test('should continue chaining if more chains available', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.phase = 'chaining';
      // First group to erase
      state.field[10][0] = 'red';
      state.field[11][0] = 'red';
      state.field[12][0] = 'red';
      state.field[12][1] = 'red';
      // Second group that will connect after gravity
      state.field[5][0] = 'blue';
      state.field[6][0] = 'blue';
      state.field[9][0] = 'blue';
      state.field[7][0] = 'blue';

      const newState = advancePhase(state);

      expect(newState.phase).toBe('chaining');
    });

    test('should return same state for gameover phase', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.phase = 'gameover';

      const newState = advancePhase(state);

      expect(newState).toEqual(state);
    });

    test('should return same state for falling phase', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.phase = 'falling';

      const newState = advancePhase(state);

      expect(newState).toEqual(state);
    });
  });

  describe('updateFallingPuyo', () => {
    test('should update falling puyo', () => {
      const state = createInitialGameState([['red', 'blue']]);
      const newFallingPuyo: FallingPuyo = {
        pivot: { pos: { x: 3, y: 5 }, color: 'green' },
        satellite: { color: 'yellow' },
        rotation: 1,
      };

      const newState = updateFallingPuyo(state, newFallingPuyo);

      expect(newState.fallingPuyo).toEqual(newFallingPuyo);
    });

    test('should set falling puyo to null', () => {
      const state = createInitialGameState([['red', 'blue']]);
      state.fallingPuyo = {
        pivot: { pos: { x: 2, y: 5 }, color: 'red' },
        satellite: { color: 'blue' },
        rotation: 0,
      };

      const newState = updateFallingPuyo(state, null);

      expect(newState.fallingPuyo).toBeNull();
    });
  });
});
