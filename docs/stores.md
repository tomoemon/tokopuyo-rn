# 状態管理（Zustand ストア）

gameStore / gameHistoryStore / configStore は AsyncStorage に永続化する。gestureStore（入力のハイライト状態）は永続化しない。

## gameStore (src/store/gameStore.ts)

ゲーム状態と操作履歴を管理するストア。

### dispatch で処理するアクション
- `START_GAME`: ゲーム開始（ready フェーズのときのみ）。ゲーム履歴に新しいゲームを登録し、初期状態のスナップショットを作成
- `RESTART_GAME`: 初期状態に戻す（新しいシードと4色を選び直す）
- `MOVE_LEFT` / `MOVE_RIGHT` / `ROTATE_CW` / `ROTATE_CCW` / `SOFT_DROP` / `SET_COLUMN` / `SET_ROTATION`: 操作ぷよを動かす。配置が変わらない場合は状態を更新しない
- `HARD_DROP`: 即落下して設置し、連鎖判定へ進む

### その他のアクション
- `clearErasingPuyos`: 消去エフェクト完了時に呼ばれ、連鎖を1段進める
- `restoreToSnapshot(snapshotId)`: 指定したスナップショットの状態に戻し、それより後の履歴を破棄する
- `resumeFromHistory(id, fromFavorites)`: ゲーム履歴の最後の状態から同じゲームとして再開する
- `forkFromHistory(id, fromFavorites)`: ゲーム履歴の最後の状態から新しいゲームとして再開する（同じぷよ列）
- `forkWithNewSeedFromHistory(id, fromFavorites)`: ゲーム履歴の最後の状態から、新しいシードで新しいゲームとして再開する

### 連鎖の進行
1. `HARD_DROP` で設置後、重力を適用して消えるぷよがあれば `chaining` フェーズへ
2. 設定の遅延（`CHAIN_ANIMATION_DELAYS`）の後、消えるぷよを `erasingPuyos` に入れて `erasing` フェーズへ
3. 消去エフェクト完了時に `clearErasingPuyos` が呼ばれ、ぷよを消して重力を適用する。次の連鎖があれば 2 に戻る
4. 連鎖が終わったら次のぷよを出す（`falling`）か `gameover`

乱数は操作ぷよを出すときだけ進める（連鎖中は進めない）。これにより、スナップショットの乱数状態から再開したときに同じぷよ列が再現される。

### スナップショット作成タイミング
スナップショットは連鎖完了後に作成される:
1. `HARD_DROP` 時に落下位置・乱数状態・NEXT を `pendingSnapshot` に一時保存
2. 連鎖なしの場合は即座にスナップショット作成
3. 連鎖ありの場合は `clearErasingPuyos` で連鎖完了を検知後に作成

連鎖途中で中断した場合、その手のスナップショットは作成されない。

### ゲーム履歴との同期
状態を更新するたびに、現在のフィールド・スコア・連鎖数・操作履歴を gameHistoryStore の `updateCurrentGame` に反映する。

### 永続化される項目
- フィールド状態
- NEXTキュー
- スコア
- 連鎖数
- ゲームフェーズ
- 操作履歴
- 次のスナップショットID
- ゲームで使用する4色

永続化対象が前回の書き込みから変わっていない場合は書き込みを省略する（操作ぷよの移動のたびに履歴全体を書き込まないため）。

### 復元時の処理（アプリ再起動時）
- ゲームオーバーだったゲームは初期状態に戻す
- 操作履歴がある場合は、最後のスナップショットから乱数状態・盤面・NEXT・スコアを復元し、ready フェーズに戻す（START で続きから再開）
- ゲーム開始前の状態は、乱数生成器の色を永続化された4色に揃える

## gameHistoryStore (src/store/gameHistoryStore.ts)

ゲーム履歴（History / Favorite）を管理するストア。

### 状態
- `entries`: History エントリ一覧（最大100件。超えたら古いものから削除）
- `favorites`: Favorite エントリ一覧（History からコピーした独立したエントリ）
- `currentGameId`: 現在プレイ中のゲームID

### アクション
- `startNewGame`: 新しいゲームIDを発行して現在のゲームにする
- `updateCurrentGame`: 現在のゲームのエントリを作成・更新する（1手も置いていないゲームは記録しない）
- `setCurrentGameId`: 現在のゲームIDを設定する（Resume 時）
- `findEntry(id, fromFavorites)`: History または Favorite から指定IDのエントリを取得
- `deleteEntry`: History からエントリ削除
- `addToFavorites`: History から Favorite にコピー
- `deleteFavorite`: Favorite からエントリ削除
- `updateFavoriteDetails`: Favorite のメモ・タグを更新

`compareByLastPlayedDesc` は最終プレイ日時の新しい順に並べる比較関数。

## configStore (src/store/configStore.ts)

設定を管理するストア。

### 設定項目
- `handedness`: 利き手 (`'right'` | `'left'`)
- `chainAnimationSpeed`: 連鎖アニメーション速度 (`'short'` | `'middle'` | `'long'`)。消去エフェクト開始までの遅延は `CHAIN_ANIMATION_DELAYS`（0 / 300 / 600ms）

## gestureStore (src/input/gestureStore.ts)

フィールドと操作エリアのハイライト状態を共有するストア。詳細は [control-system.md](control-system.md) を参照。
