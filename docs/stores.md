# 状態管理（Zustand ストア）

すべてのストアは AsyncStorage による永続化に対応。

## gameStore (src/store/gameStore.ts)

ゲーム状態を管理するストア。

### 主なアクション
- `START_GAME`: ゲーム開始
- `RESTART_GAME`: ゲームリセット
- `MOVE_LEFT` / `MOVE_RIGHT`: 左右移動
- `ROTATE_CW` / `ROTATE_CCW`: 回転
- `HARD_DROP`: ハードドロップ
- `SET_COLUMN`: 列を直接設定
- `SET_ROTATION`: 回転状態を直接設定
- `TICK`: ゲームループのティック処理

### スナップショット作成タイミング
スナップショットは**連鎖完了後**に作成される:
1. `HARD_DROP` 時に落下位置と乱数状態を `pendingSnapshot` に一時保存
2. 連鎖なしの場合は即座にスナップショット作成
3. 連鎖ありの場合は `clearErasingPuyos` で連鎖完了を検知後に作成

連鎖途中で中断した場合、その手のスナップショットは作成されない。

### 永続化される項目
- フィールド状態
- NEXTキュー
- スコア
- 連鎖数
- ゲームフェーズ
- 操作履歴
- スナップショットID
- pendingSnapshot（連鎖中の一時保存用）

### 復元時の処理
- 最後のスナップショットから乱数状態を復元
- 進行中だったゲームは ready フェーズに戻す
- スナップショットは連鎖完了後の状態なので重力適用不要

## configStore (src/store/configStore.ts)

設定を管理するストア。

### 設定項目
- `handedness`: 利き手設定 (`'right'` | `'left'`)

## gameHistoryStore (src/store/gameHistoryStore.ts)

ゲーム履歴（History/Favorite）を管理するストア。

### 主な機能
- `entries`: History エントリ一覧
- `favorites`: Favorite エントリ一覧
- `addEntry`: 新規エントリ追加
- `deleteEntry`: History からエントリ削除
- `addToFavorites`: History から Favorite にコピー
- `deleteFavorite`: Favorite からエントリ削除
- `updateFavoriteDetails`: Favorite の Note/Tags を更新
- `isInFavorites`: 指定IDが Favorite に存在するか確認
