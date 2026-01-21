# 型定義

## 主要な型 (src/logic/types.ts)

### PuyoColor
ぷよの色を表す型。
```typescript
type PuyoColor = 'red' | 'blue' | 'green' | 'yellow';
```

### Field
6列×12段のフィールド配列。

### FallingPuyo
操作中のぷよペア。
- `pivot`: 軸ぷよ（回転の中心）
- `satellite`: 子ぷよ（軸の周りを回転）
- `rotation`: 回転状態 (0:上, 1:右, 2:下, 3:左)

### GamePhase
ゲームフェーズを表す型。
```typescript
type GamePhase = 'ready' | 'falling' | 'dropping' | 'erasing' | 'chaining' | 'gameover';
```

### Position
座標を表す型。
```typescript
type Position = { x: number; y: number };
```

### RngState
乱数生成器の状態（4つの32bit整数）。
```typescript
type RngState = [number, number, number, number];
```

### GameSnapshot
ゲーム状態のスナップショット。**連鎖完了後**の状態を保存する。
- `id`: スナップショットID
- `field`: フィールド状態（連鎖完了後）
- `nextQueue`: NEXTぷよキュー（次に落下するぷよ）
- `score`: スコア（連鎖完了後）
- `chainCount`: この手で発生した連鎖数
- `rngState`: 乱数生成器の状態（次のぷよを生成する直前）
- `droppedPositions`: 落下させたぷよの位置（前のスナップショットのフィールドに対して適用）

スナップショットは連鎖完了後に作成されるため、Resume/Fork/Shuffle 時に重力適用が不要。

## ゲーム履歴の型 (src/store/gameHistoryStore.ts)

### GameHistoryEntry
ゲーム履歴エントリ。
- `id`: エントリID
- `field`: フィールド状態
- `score`: スコア
- `maxChainCount`: 最大連鎖数
- `dropCount`: ドロップ数
- `lastPlayedAt`: 最終プレイ日時（ISO文字列）
- `operationHistory`: 操作履歴（GameSnapshot配列）
- `nextSnapshotId`: 次のスナップショットID
- `note`: メモ（Favorite用）
- `tags`: タグ配列（Favorite用）
