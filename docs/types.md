# 型定義

## 主要な型 (src/logic/types.ts)

### PuyoColor
ぷよの色。ゲームごとにこの5色から4色を選んで使う（`ALL_COLORS`）。
```typescript
type PuyoColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple';
```

### Field
フィールドの2次元配列（`field[y][x]`、`null` は空）。13段（隠し1段 + 可視12段）× 6列。y=0 が隠し段。

### Position
座標。
```typescript
type Position = { x: number; y: number };
```

### FallingPuyo
操作中のぷよペア。
- `pivot`: 軸ぷよ（位置と色。回転の中心）
- `satellite`: 子ぷよ（色のみ。位置は `pivot` と `rotation` から計算）
- `rotation`: 子ぷよの向き (0:上, 1:右, 2:下, 3:左)

出現位置は3列目の隠し段（x=2, y=0）で、子ぷよは上向き（フィールド外）。

### GamePhase
```typescript
type GamePhase = 'ready' | 'falling' | 'dropping' | 'erasing' | 'chaining' | 'gameover';
```
- `ready`: ゲーム開始前
- `falling`: ぷよ操作中
- `dropping`: 設置直後（重力適用と連鎖判定の前。ストアの外からは見えない）
- `chaining`: 連鎖中（消去エフェクト開始待ち）
- `erasing`: 消去エフェクト表示中
- `gameover`: ゲームオーバー

### GameState
- `field`: フィールド
- `fallingPuyo`: 操作中のぷよペア（なければ `null`）
- `nextQueue`: NEXT キュー（通常3組）
- `score`: スコア
- `chainCount`: 直前の連鎖数（次のぷよを置くまで表示し続ける）
- `phase`: ゲームフェーズ
- `selectedColors`: このゲームで使用する4色

### ChainResult
1回の連鎖の結果（消えるグループ、連鎖数、得点、同時消し色数、全消しかどうか）。

### ErasingPuyo
消去エフェクト表示用の、消えるぷよの位置と色。

### RngState
乱数生成器の状態（4つの32bit整数）。
```typescript
type RngState = [number, number, number, number];
```

### GameSnapshot
ゲーム状態のスナップショット。連鎖完了後の状態を保存する。
- `id`: スナップショットID
- `field`: フィールド状態（連鎖完了後）
- `nextQueue`: NEXT キュー（先頭が次に操作するぷよ）
- `score`: スコア（連鎖完了後）
- `chainCount`: この手で発生した連鎖数
- `rngState`: 乱数生成器の状態（次のぷよを生成する直前）
- `droppedPositions`: この手で置いたぷよの位置（軸ぷよ、子ぷよの順。前のスナップショットのフィールドに対して適用）
- `selectedColors`: このゲームで使用する4色

スナップショットは連鎖完了後に作成されるため、Resume / Fork / Shuffle で再開するときに重力の適用は不要。

## アクションの型 (src/store/actions.ts)

### GameAction
入力層からストアに発行するアクション。
- `START_GAME` / `RESTART_GAME`
- `MOVE_LEFT` / `MOVE_RIGHT`
- `ROTATE_CW` / `ROTATE_CCW`
- `SOFT_DROP`（1段落下）/ `HARD_DROP`（即落下して確定）
- `SET_COLUMN`（軸ぷよの列を直接設定）/ `SET_ROTATION`（子ぷよの向きを直接設定）

## ゲーム履歴の型 (src/store/gameHistoryStore.ts)

### GameHistoryEntry
ゲーム履歴エントリ。
- `id`: エントリID（ゲームID）
- `field`: 最後のフィールド状態
- `score`: スコア
- `maxChainCount`: 最大連鎖数
- `dropCount`: ツモ数（置いた回数）
- `lastPlayedAt`: 最終プレイ日時（ISO 8601 文字列）
- `operationHistory`: 操作履歴（GameSnapshot 配列）
- `nextSnapshotId`: 次のスナップショットID
- `note`: メモ（Favorite 用）
- `tags`: タグ配列（Favorite 用）
