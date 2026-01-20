# GameSnapshot 再設計

## 背景・問題点

### 現在の問題

1. **Resume時に連鎖発動直前の状態から再開してしまう**
   - 最後にぷよを落として連鎖が発生する状態で終了した場合、Resume すると連鎖発動直前の状態が復元される
   - その上に新しい落下ぷよが出現し、不自然な状態になる

2. **サテライトが空中にいる状態で保存される**
   - 横積みでサテライトが落下途中の状態でスナップショットが作成される
   - 現在は Resume 時に `applyGravity` で対処しているが、根本的な解決ではない

### 現在の実装

```
HARD_DROP 実行時:
1. ぷよをハードドロップ（hardDropPuyo）
2. ぷよをフィールドに固定（lockFallingPuyo）
3. ★ この時点でスナップショット作成 ★  ← 連鎖前
4. 連鎖チェック（advancePhase）
5. 連鎖があれば phase='chaining' → 消去処理開始（非同期）
```

スナップショットは「ぷよが固定された直後、連鎖処理の前」の状態を保存している。

## 新しい設計

### GameSnapshot 型

```typescript
type GameSnapshot = {
  id: number;                    // スナップショット番号
  field: Field;                  // フィールド状態（連鎖完了後）
  nextQueue: [PuyoColor, PuyoColor][];  // NEXTキュー（次に落下するぷよ）
  score: number;                 // スコア（連鎖完了後）
  chainCount: number;            // 連鎖数（この手で発生した連鎖数）
  rngState: RngState;           // 乱数状態（次のぷよを生成する直前）
  droppedPositions: Position[]; // 前の snapshot に対して落下させたぷよの位置（重力適用前）
};
```

### スナップショットの配列構造

```
snapshot[0] = {
  field: 空フィールド,
  droppedPositions: [],  // まだ何も落としていない
  nextQueue: [1手目, 2手目, 3手目],
  score: 0,
  chainCount: 0,
  rngState: 初期状態,
}

snapshot[1] = {
  field: 1手目落下＋連鎖完了後のフィールド,
  droppedPositions: [1手目の落下位置],  // snapshot[0].field に対して適用
  nextQueue: [2手目, 3手目, 4手目],
  score: 1手目の連鎖後スコア,
  chainCount: 1手目で発生した連鎖数,
  rngState: 4手目生成前の状態,
}

snapshot[2] = {
  field: 2手目落下＋連鎖完了後のフィールド,
  droppedPositions: [2手目の落下位置],  // snapshot[1].field に対して適用
  nextQueue: [3手目, 4手目, 5手目],
  score: 2手目までの累計スコア,
  chainCount: 2手目で発生した連鎖数,
  rngState: 5手目生成前の状態,
}
```

- `dropCount = operationHistory.length - 1`（現在と同じ計算式）
- `snapshot[n].droppedPositions` は `snapshot[n-1].field` に対して適用する

### 新しいフロー

```
HARD_DROP 実行時:
1. 落下位置と rngState を一時保存
2. ぷよをハードドロップ（hardDropPuyo）
3. ぷよをフィールドに固定（lockFallingPuyo）
4. 連鎖チェック（advancePhase）
5. 連鎖処理（非同期で実行）
6. ★ 連鎖完了後にスナップショット作成 ★
```

## 機能別の動作

### Resume / Fork / Shuffle

```
1. 最後の snapshot を取得
2. snapshot.field を復元（連鎖完了後なので重力適用不要）
3. snapshot.nextQueue[0] を次の落下ぷよとして表示
4. snapshot.rngState を復元
5. ゲーム開始
```

**効果**: 必ず連鎖完了後の状態から開始するため、現在の問題は発生しない

### Replay

```
初期表示:
- snapshot[0].field（空フィールド）を表示

Next ボタン押下時（snapshot[n-1] → snapshot[n] への遷移）:
1. snapshot[n].droppedPositions のぷよを snapshot[n-1].field 上に表示
2. 重力を適用して表示（位置が変わらなければスキップ）
3. 連鎖処理を実行（1連鎖ごとにタップで進める）
4. 連鎖完了後、snapshot[n].field と一致することを確認（デバッグ用）

Prev ボタン押下時:
- snapshot[n-1].field を表示（連鎖アニメーションなし）

First / Last ボタン:
- 該当する snapshot.field を直接表示
```

**変更点**: 現在の「Nextボタンで連鎖アニメーション自動再生」から「1タップで1連鎖」に変更

## 実装タスク

### 1. スナップショット作成タイミングの変更

- [ ] 連鎖完了を検知する仕組みを追加
- [ ] 連鎖中は `droppedPositions` と `rngState` を一時的に保持
- [ ] 連鎖完了後（または連鎖なしの場合は即座に）スナップショットを作成
- [ ] ゲーム開始時に初期状態の snapshot[0] を作成

### 2. Resume / Fork / Shuffle の修正

- [ ] `applyGravity` の呼び出しを削除（不要になる）
- [ ] 連鎖完了後の状態から開始することを確認

### 3. Replay 画面の修正

- [ ] 空フィールドからスタートするように変更
- [ ] Next ボタンの動作を変更:
  - droppedPositions のぷよを表示
  - 重力適用アニメーション
  - 連鎖処理（1タップ1連鎖）
- [ ] 連鎖アニメーションの自動再生を削除

### 4. 既存データの移行（オプション）

- [ ] 既存の operationHistory を新形式に変換するか、互換性を保つか検討

## 懸念点・検討事項

### 連鎖処理の非同期性

現在の連鎖処理は `setTimeout` で非同期に実行されている。連鎖完了を検知するには:

1. **コールバック方式**: 連鎖完了時にコールバックを呼び出す
2. **状態監視方式**: `phase` が `falling` に戻ったことを検知
3. **Promise方式**: 連鎖処理を Promise でラップ

### ゲームオーバー時の扱い

- 連鎖途中でゲームオーバーになる場合
- その時点でスナップショットを作成するか、作成しないか

### 既存データとの互換性

- 既存の履歴データは連鎖前の状態で保存されている
- 新形式への移行が必要か、両方をサポートするか
