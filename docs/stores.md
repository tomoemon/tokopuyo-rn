# 状態管理（Zustand ストア）

設定とゲーム履歴は SQLite（expo-sqlite）に保存する。保存の仕組みは「永続化」の節を参照。gestureStore（入力のハイライト状態）は保存しない。

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
- `resumeFromHistory(id, snapshots)`: ゲーム履歴の最後の状態から同じゲームとして再開する
- `forkFromHistory(snapshots)`: ゲーム履歴の最後の状態から新しいゲームとして再開する（同じぷよ列）
- `forkWithNewSeedFromHistory(snapshots)`: ゲーム履歴の最後の状態から、新しいシードで新しいゲームとして再開する

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
スナップショットを追加・削除したとき（START、連鎖のない手、連鎖の完了、過去の手に戻す、Fork / Shuffle）に、現在のフィールド・スコア・連鎖数・操作履歴を gameHistoryStore の `updateCurrentGame` に反映する。連鎖の途中では反映しない。

gameStore 自体は保存しない。起動時は常に初期状態から始め、途中で終了したゲームの続きは History から Resume する（プレイ中のゲームは1手ごとに History に保存されている）。

スナップショットの id は配列の位置（0, 1, 2, ...）と同じ。次のスナップショットの id は `history.length`。

### History から再開するアクション
`resumeFromHistory` / `forkFromHistory` / `forkWithNewSeedFromHistory` は、呼び出し側（History 画面）が読み込んだスナップショットを受け取る。スナップショットが空なら何もせず false を返す。

## gameHistoryStore (src/store/gameHistoryStore.ts)

ゲーム履歴（History / Favorite）を管理するストア。

### 状態
- `entries`: History エントリ一覧（最大100件。超えたら古いものから削除）
- `favorites`: Favorite エントリ一覧（History からコピーした独立したエントリ）
- `currentGameId`: 現在プレイ中のゲームID（保存しない）

`entries` と `favorites` は一覧に出す要約（`GameSummary`）だけを持つ。スナップショットは `loadSnapshots` で必要なときに読み込む。

### アクション
- `startNewGame`: 新しいゲームIDを発行して現在のゲームにする
- `updateCurrentGame`: 現在のゲームのエントリを作成・更新して保存する（1手も置いていないゲームは記録しない。初手まで戻した場合は削除する）
- `setCurrentGameId`: 現在のゲームIDを設定する（Resume 時）
- `loadSnapshots(list, id)`: History（`'history'`）または Favorite（`'favorite'`）から、指定IDのゲームのスナップショットを読み込む（非同期）
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

## 永続化 (src/db/)

### 仕組み
- 起動時（`app/_layout`）に DB を開いてマイグレーションし、`loadStores` で設定と History / Favorite の要約を読み込む。終わるまで画面は出さない
- ストアのアクションは、先にメモリ上の状態を更新し、そのあとで書き込みを待ち行列（`src/db/queue.ts`）に積む。完了は待たない
- 待ち行列は1本で、前の処理が終わってから次を実行する。DB に触るのは待ち行列だけにする（トランザクションが重ならないようにするため）
- 失敗した書き込みはログに出すだけで、後続の処理は止めない
- スナップショットの読み込み（リプレイ、Resume / Fork / Shuffle）も待ち行列を通す。まだ書き込まれていない変更が抜けないようにするため
- 画面は、読み込みが1秒を超えたときだけローディング表示を出す（`useDelayedVisible`）
- DB には非同期 API だけを使う。expo-sqlite の Web 版の同期 API には、255 バイトを超える結果が切れる不具合がある（expo/expo#44148）

### 1手ごとの保存（`saveGame`）
- 最後に書き込みに成功したスナップショットの配列を覚えておき、今回の配列と先頭から参照で比べて、同じだった位置を求める（スナップショットは作成後に変更しないため）
- 1つのトランザクションで、games の行を書き込み（`INSERT ... ON CONFLICT DO UPDATE`。メモとタグは変えない）、同じだった位置より後ろのスナップショットを消し、新しいスナップショットを1文で追加する
- 別のゲームを覚えているとき（新しいゲーム、Resume / Fork / Shuffle の直後）は全部書き直す
- 覚えているゲームの行を `deleteGames` で消したとき（初手まで戻した、History から削除した）は、覚えている配列を忘れる。消した後に同じゲームを保存すると全部書き直す
- 1手進めただけ（前回の配列に追加しただけ）のときは、スナップショットを消す処理を省く

### スキーマ（最新）

```sql
CREATE TABLE games (
  list TEXT NOT NULL,          -- 'history' | 'favorite'
  id TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_chain INTEGER NOT NULL,
  drop_count INTEGER NOT NULL,
  final_field TEXT NOT NULL,   -- 一覧のサムネイル用の最終盤面（JSON）
  note TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON 配列
  last_played_at TEXT NOT NULL,
  PRIMARY KEY (list, id)
);
CREATE TABLE snapshots (
  list TEXT NOT NULL,
  game_id TEXT NOT NULL,
  seq INTEGER NOT NULL,        -- 配列の中の位置（スナップショットの id と同じ）
  data TEXT NOT NULL,          -- GameSnapshot の JSON
  PRIMARY KEY (list, game_id, seq),
  FOREIGN KEY (list, game_id) REFERENCES games(list, id) ON DELETE CASCADE
);
CREATE TABLE app_state (
  key TEXT PRIMARY KEY,        -- 'config'
  value TEXT NOT NULL          -- JSON
);
```

- お気に入りは、History の行を `list = 'favorite'` としてコピーした独立したエントリ（id は同じ）

### マイグレーション（`src/db/migrations.ts`）
- マイグレーションの配列の順番がバージョン番号になる。どこまで適用したかは `PRAGMA user_version` で管理する
- リリース前：定義を変えるときは v1 を直接書き換え、開発中の DB は捨てる（アプリのデータを消す。Web ではサイトのデータを消す）
- リリース後：配列の末尾に追加するだけにし、すでにある要素は書き換えない
- `GameSnapshot` の形を変えるときは、`snapshots.data` の JSON のマイグレーションが必要か確認する

### テスト
- `src/store/__tests__/persistence.test.ts`：ストアの操作を順に呼び、ストアの状態と DB の行を確かめるシナリオテスト
- DB は Node の組み込みの `node:sqlite` を、expo-sqlite と同じ形で包んだもの（`src/db/__tests__/testDatabase.ts`）を使う。Node 22.13 以降が必要

