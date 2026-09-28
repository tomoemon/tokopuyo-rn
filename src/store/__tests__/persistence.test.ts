import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openTestDatabase, TestDatabase } from '../../db/__tests__/testDatabase';
import { setupDatabase, initDatabase, flushQueue, GameList } from '../../db';
import { useGameStore } from '../gameStore';
import { GameAction } from '../actions';
import { useGameHistoryStore } from '../gameHistoryStore';
import { useConfigStore, DEFAULT_CONFIG } from '../configStore';
import { loadStores } from '../loadStores';
import { createFallingPuyo } from '../../logic/puyo';
import { createEmptyField } from '../../logic/field';
import { GameSnapshot, PuyoColor } from '../../logic/types';

// 保存の仕組みのシナリオテスト。ストアの操作を順に呼び、ストアの状態と DB の行の両方を確かめる

let db: TestDatabase;

// ストアを初期状態に戻す（DB はそのまま）
function resetStores() {
  // 連鎖の待ち時間を 0 にする（保存はしない）
  useConfigStore.setState({ ...DEFAULT_CONFIG, chainAnimationSpeed: 'short' });
  useGameHistoryStore.setState({ entries: [], favorites: [], currentGameId: null });
  useGameStore.getState().dispatch({ type: 'RESTART_GAME' });
}

// アプリの再起動に相当する：メモリ上の状態を捨てて、同じ DB から読み込み直す
async function restart() {
  resetStores();
  db = db.reopen();
  initDatabase(db);
  await loadStores();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  db = openTestDatabase();
  await setupDatabase(db);
  initDatabase(db);
  resetStores();
});

afterEach(() => {
  vi.useRealTimers();
  // 途中で失敗したテストの console.error のスパイを残さない
  vi.restoreAllMocks();
});

function dispatch(action: GameAction) {
  useGameStore.getState().dispatch(action);
}

// ぷよを1組置く。色を指定しなければ、列ごとに互い違いの色にする（市松模様になり連鎖しない）
function drop(column: number, colors?: [PuyoColor, PuyoColor]) {
  const [pivot, satellite] = colors ?? (column % 2 === 0 ? ['red', 'blue'] : ['blue', 'red']);
  useGameStore.setState({ fallingPuyo: createFallingPuyo(pivot, satellite) });
  dispatch({ type: 'SET_COLUMN', column });
  dispatch({ type: 'HARD_DROP' });
}

// 連鎖を最後まで進める（消去エフェクトの完了は画面の代わりに呼ぶ）
function finishChain() {
  for (let i = 0; i < 50; i++) {
    const state = useGameStore.getState();
    if (state.phase === 'chaining') {
      vi.runAllTimers();
    } else if (state.phase === 'erasing') {
      state.clearErasingPuyos();
    } else {
      return;
    }
  }
  throw new Error('chain did not finish');
}

function startGame(): string {
  dispatch({ type: 'START_GAME' });
  return useGameHistoryStore.getState().currentGameId!;
}

function dbGames(list: GameList) {
  return db.all<{ id: string; score: number; max_chain: number; drop_count: number; note: string; tags: string }>(
    'SELECT id, score, max_chain, drop_count, note, tags FROM games WHERE list = ? ORDER BY id',
    [list]
  );
}

function dbSnapshots(list: GameList, gameId: string): GameSnapshot[] {
  const rows = db.all<{ seq: number; data: string }>(
    'SELECT seq, data FROM snapshots WHERE list = ? AND game_id = ? ORDER BY seq',
    [list, gameId]
  );
  // seq は 0 から連続し、スナップショットの id と同じ
  rows.forEach((row, i) => expect(row.seq).toBe(i));
  return rows.map(row => JSON.parse(row.data));
}

// メモリ上の今のゲームのスナップショットと、DB の History の行が同じか
function expectSavedAsInMemory(gameId: string) {
  expect(dbSnapshots('history', gameId)).toEqual(useGameStore.getState().history);
}

describe('1手ごとの保存', () => {
  it('START して数手置くと、要約とスナップショットが保存される', async () => {
    const id = startGame();
    drop(0);
    drop(1);
    drop(2);
    await flushQueue();

    const [entry] = useGameHistoryStore.getState().entries;
    expect(entry).toMatchObject({ id, dropCount: 3 });
    expect(dbGames('history')).toEqual([expect.objectContaining({ id, drop_count: 3 })]);
    expect(useGameStore.getState().history.map(s => s.id)).toEqual([0, 1, 2, 3]);
    expectSavedAsInMemory(id);
  });

  it('連鎖の途中では保存せず、連鎖が終わったときに要約とスナップショットを保存する', async () => {
    const id = startGame();
    drop(3);
    await flushQueue();

    // 1列目に赤を2つ置いた盤面に、赤を2つ落とすと4つつながって消える
    const field = createEmptyField();
    field[12][0] = 'red';
    field[11][0] = 'red';
    useGameStore.setState({ field });
    drop(0, ['red', 'red']);
    expect(useGameStore.getState().phase).toBe('chaining');
    await flushQueue();
    expect(dbGames('history')).toEqual([expect.objectContaining({ drop_count: 1, score: 0 })]);
    expect(useGameHistoryStore.getState().entries[0]).toMatchObject({ dropCount: 1, score: 0 });

    finishChain();
    await flushQueue();
    const state = useGameStore.getState();
    expect(state.phase).toBe('falling');
    expect(state.score).toBeGreaterThan(0);
    expect(dbGames('history')).toEqual([
      expect.objectContaining({ drop_count: 2, score: state.score, max_chain: 1 }),
    ]);
    expectSavedAsInMemory(id);
  });

  it('前の書き込みが終わる前に続けて何手も置いても、重複も抜けもなく保存される', async () => {
    const id = startGame();
    for (let i = 0; i < 10; i++) drop(i % 6 === 2 ? 3 : i % 6);
    await flushQueue();
    expect(useGameStore.getState().history).toHaveLength(11);
    expectSavedAsInMemory(id);
  });

  it('書き込みが1回失敗しても後続は止まらず、次の保存で失敗した分も書き直される', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const id = startGame();
    drop(0);
    await flushQueue();

    db.failNextRun(/INSERT INTO snapshots/);
    drop(1);
    await flushQueue();
    // トランザクションごと元に戻る
    expect(dbGames('history')).toEqual([expect.objectContaining({ drop_count: 1 })]);
    expect(dbSnapshots('history', id)).toHaveLength(2);

    drop(3);
    await flushQueue();
    expect(dbGames('history')).toEqual([expect.objectContaining({ drop_count: 3 })]);
    expectSavedAsInMemory(id);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('過去の手に戻す', () => {
  it('戻してから1手置くと、戻した位置より後ろが消えて新しい手が追加される', async () => {
    const id = startGame();
    drop(0);
    drop(1);
    drop(3);
    await flushQueue();

    useGameStore.getState().restoreToSnapshot(1);
    drop(4);
    await flushQueue();
    expect(useGameStore.getState().history.map(s => s.id)).toEqual([0, 1, 2]);
    expect(dbGames('history')).toEqual([expect.objectContaining({ drop_count: 2 })]);
    expectSavedAsInMemory(id);
  });

  it('初手まで戻すと、History から消える', async () => {
    startGame();
    drop(0);
    drop(1);
    await flushQueue();

    useGameStore.getState().restoreToSnapshot(0);
    await flushQueue();
    expect(useGameHistoryStore.getState().entries).toEqual([]);
    expect(dbGames('history')).toEqual([]);
    expect(db.all('SELECT * FROM snapshots')).toEqual([]);
  });

  it('初手まで戻してから置き直すと、初手のスナップショットも保存し直される', async () => {
    const id = startGame();
    drop(0);
    drop(1);
    await flushQueue();

    useGameStore.getState().restoreToSnapshot(0);
    drop(3);
    await flushQueue();
    expect(dbGames('history')).toEqual([expect.objectContaining({ id, drop_count: 1 })]);
    expectSavedAsInMemory(id);
  });
});

describe('最大連鎖数', () => {
  // 連鎖を1回起こしてから、連鎖しない手を1つ置く
  async function playWithChain(): Promise<string> {
    const id = startGame();
    drop(3);
    const field = createEmptyField();
    field[12][0] = 'red';
    field[11][0] = 'red';
    useGameStore.setState({ field });
    drop(0, ['red', 'red']);
    finishChain();
    drop(4);
    await flushQueue();
    return id;
  }

  it('Fork した新しいゲームにも、元の手の最大連鎖数が記録される', async () => {
    const id = await playWithChain();
    expect(dbGames('history')).toEqual([expect.objectContaining({ id, max_chain: 1 })]);
    dispatch({ type: 'RESTART_GAME' });

    const snapshots = await useGameHistoryStore.getState().loadSnapshots('history', id);
    useGameStore.getState().forkFromHistory(snapshots);
    const forkedId = useGameHistoryStore.getState().currentGameId!;
    await flushQueue();
    expect(dbGames('history').find(g => g.id === forkedId)).toMatchObject({ max_chain: 1 });
  });

  it('連鎖した手より前に戻すと、最大連鎖数も戻る', async () => {
    const id = await playWithChain();
    useGameStore.getState().restoreToSnapshot(1);
    drop(5);
    await flushQueue();
    expect(dbGames('history')).toEqual([expect.objectContaining({ id, max_chain: 0 })]);
    expect(useGameHistoryStore.getState().entries[0]).toMatchObject({ maxChainCount: 0 });
  });
});

describe('History から再開する', () => {
  // 3手置いたゲームを作り、タイトル画面に戻る
  async function playAndLeave(): Promise<string> {
    const id = startGame();
    drop(0);
    drop(1);
    drop(3);
    await flushQueue();
    dispatch({ type: 'RESTART_GAME' });
    return id;
  }

  it('Resume：読み込んだスナップショットから同じゲームとして再開する', async () => {
    const id = await playAndLeave();
    const snapshots = await useGameHistoryStore.getState().loadSnapshots('history', id);
    expect(useGameStore.getState().resumeFromHistory(id, snapshots)).toBe(true);
    expect(useGameHistoryStore.getState().currentGameId).toBe(id);

    drop(4);
    await flushQueue();
    expect(useGameHistoryStore.getState().entries).toHaveLength(1);
    expect(dbGames('history')).toEqual([expect.objectContaining({ id, drop_count: 4 })]);
    expectSavedAsInMemory(id);
  });

  it('Fork：同じ手のまま新しいゲームとして保存する', async () => {
    const id = await playAndLeave();
    const snapshots = await useGameHistoryStore.getState().loadSnapshots('history', id);
    expect(useGameStore.getState().forkFromHistory(snapshots)).toBe(true);
    const forkedId = useGameHistoryStore.getState().currentGameId!;
    expect(forkedId).not.toBe(id);

    await flushQueue();
    expect(dbGames('history').map(g => g.id).sort()).toEqual([id, forkedId].sort());
    expect(dbSnapshots('history', forkedId)).toEqual(snapshots);
  });

  it('Shuffle：最後の NEXT を引き直して、新しいゲームとして保存する', async () => {
    const id = await playAndLeave();
    const snapshots = await useGameHistoryStore.getState().loadSnapshots('history', id);
    expect(useGameStore.getState().forkWithNewSeedFromHistory(snapshots)).toBe(true);
    const shuffledId = useGameHistoryStore.getState().currentGameId!;

    await flushQueue();
    const saved = dbSnapshots('history', shuffledId);
    expect(saved.slice(0, -1)).toEqual(snapshots.slice(0, -1));
    expect(saved[saved.length - 1].field).toEqual(snapshots[snapshots.length - 1].field);
    expect(saved[saved.length - 1].rngState).not.toEqual(snapshots[snapshots.length - 1].rngState);
    expectSavedAsInMemory(shuffledId);
  });

  it('スナップショットが空なら何もしない', () => {
    expect(useGameStore.getState().resumeFromHistory('missing', [])).toBe(false);
    expect(useGameStore.getState().phase).toBe('ready');
  });

  it('Favorite から Resume すると、History 側の手が違っていても混ざらずに書き直される', async () => {
    const id = startGame();
    drop(0);
    drop(1);
    drop(3);
    await flushQueue();
    useGameHistoryStore.getState().addToFavorites(id);

    // History 側だけ、戻してから別の手を置く
    useGameStore.getState().restoreToSnapshot(1);
    drop(4);
    drop(5);
    await flushQueue();

    const favoriteSnapshots = await useGameHistoryStore.getState().loadSnapshots('favorite', id);
    expect(favoriteSnapshots).toHaveLength(4);
    useGameStore.getState().resumeFromHistory(id, favoriteSnapshots);
    drop(0);
    await flushQueue();
    expect(useGameStore.getState().history).toHaveLength(5);
    expectSavedAsInMemory(id);
  });

  it('History から削除したゲームを Favorite から Resume すると、全部の手が History に保存される', async () => {
    const id = startGame();
    drop(0);
    drop(1);
    await flushQueue();
    useGameHistoryStore.getState().addToFavorites(id);
    useGameHistoryStore.getState().deleteEntry(id);
    await flushQueue();
    expect(dbGames('history')).toEqual([]);

    const favoriteSnapshots = await useGameHistoryStore.getState().loadSnapshots('favorite', id);
    useGameStore.getState().resumeFromHistory(id, favoriteSnapshots);
    drop(3);
    await flushQueue();
    expect(dbGames('history')).toEqual([expect.objectContaining({ id, drop_count: 3 })]);
    expectSavedAsInMemory(id);
  });
});

describe('お気に入り', () => {
  it('独立したコピーとして保存され、メモとタグは History 側の保存で消えない', async () => {
    const id = startGame();
    drop(0);
    drop(1);
    await flushQueue();
    const historyStore = useGameHistoryStore.getState();
    historyStore.addToFavorites(id);
    historyStore.updateFavoriteDetails(id, 'memo', ['tag1']);
    await flushQueue();
    expect(dbGames('favorite')).toEqual([expect.objectContaining({ id, drop_count: 2, note: 'memo', tags: '["tag1"]' })]);
    expect(dbSnapshots('favorite', id)).toEqual(dbSnapshots('history', id));

    // History 側を進めても、Favorite は変わらない
    drop(3);
    await flushQueue();
    expect(dbGames('history')).toEqual([expect.objectContaining({ drop_count: 3, note: '' })]);
    expect(dbGames('favorite')).toEqual([expect.objectContaining({ drop_count: 2, note: 'memo' })]);
    expect(dbSnapshots('favorite', id)).toHaveLength(3);

    // 2回追加しても増えない
    useGameHistoryStore.getState().addToFavorites(id);
    await flushQueue();
    expect(useGameHistoryStore.getState().favorites).toHaveLength(1);

    useGameHistoryStore.getState().deleteFavorite(id);
    await flushQueue();
    expect(dbGames('favorite')).toEqual([]);
    expect(db.all("SELECT * FROM snapshots WHERE list = 'favorite'")).toEqual([]);
    expect(dbGames('history')).toHaveLength(1);
  });
});

describe('履歴の件数の上限', () => {
  it('101件目のゲームを保存すると、一番古いゲームとそのスナップショットが消える', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 101; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
      dispatch({ type: 'RESTART_GAME' });
      ids.push(startGame());
      drop(0);
    }
    await flushQueue();

    const entries = useGameHistoryStore.getState().entries;
    expect(entries).toHaveLength(100);
    expect(entries.map(e => e.id)).not.toContain(ids[0]);
    expect(dbGames('history')).toHaveLength(100);
    expect(dbGames('history').map(g => g.id)).not.toContain(ids[0]);
    expect(db.all('SELECT * FROM snapshots WHERE game_id = ?', [ids[0]])).toEqual([]);
  });

  it('端末の時計が戻っていても、プレイ中のゲームは消さない', async () => {
    for (let i = 0; i < 100; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 2, 0, 0, i)));
      dispatch({ type: 'RESTART_GAME' });
      startGame();
      drop(0);
    }
    // 時計を戻してから新しいゲームを置く
    vi.setSystemTime(new Date(Date.UTC(2026, 0, 1)));
    dispatch({ type: 'RESTART_GAME' });
    const id = startGame();
    drop(0);
    drop(1);
    await flushQueue();
    expect(useGameHistoryStore.getState().entries).toHaveLength(100);
    expect(useGameHistoryStore.getState().entries.map(e => e.id)).toContain(id);
    expect(dbGames('history').map(g => g.id)).toContain(id);
    expectSavedAsInMemory(id);
  });
});

describe('再起動', () => {
  it('設定と History / Favorite の要約が読み込まれ、ゲームは初期状態から始まる', async () => {
    useConfigStore.getState().setHandedness('left');
    useConfigStore.getState().setChainAnimationSpeed('long');
    const id = startGame();
    drop(0);
    drop(1);
    await flushQueue();
    useGameHistoryStore.getState().addToFavorites(id);
    useGameHistoryStore.getState().updateFavoriteDetails(id, 'memo', ['tag1']);
    await flushQueue();
    const { entries, favorites } = useGameHistoryStore.getState();

    await restart();
    expect(useConfigStore.getState()).toMatchObject({ handedness: 'left', chainAnimationSpeed: 'long' });
    expect(useGameHistoryStore.getState().entries).toEqual(entries);
    expect(useGameHistoryStore.getState().favorites).toEqual(favorites);
    expect(useGameHistoryStore.getState().currentGameId).toBeNull();
    expect(useGameStore.getState()).toMatchObject({ phase: 'ready', history: [] });

    // 途中で終了したゲームを Resume できる
    const snapshots = await useGameHistoryStore.getState().loadSnapshots('history', id);
    expect(snapshots).toHaveLength(3);
    useGameStore.getState().resumeFromHistory(id, snapshots);
    drop(3);
    await flushQueue();
    expectSavedAsInMemory(id);
  });

  it('設定を保存していなければ既定値になる', async () => {
    await restart();
    expect(useConfigStore.getState()).toMatchObject(DEFAULT_CONFIG);
  });
});
