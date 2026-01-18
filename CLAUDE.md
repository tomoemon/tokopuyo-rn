# tokopuyo-rn

React Native (Expo) で作成されたぷよぷよ風パズルゲーム。

## ファイルアーキテクチャ

```
src/
├── input/                    # 入力処理
│   ├── ControlAreaInput.tsx  # 操作エリアのタッチ入力（タップ・スワイプ）
│   ├── SwipeInput.tsx        # スワイプジェスチャー入力
│   ├── types.ts              # 入力関連の型定義
│   └── index.ts
│
├── logic/                    # ゲームロジック（純粋関数）
│   ├── types.ts              # 型定義（PuyoColor, Field, FallingPuyo, GamePhase, GameSnapshot等）
│   ├── field.ts              # フィールド操作（空セル検出、配置等）
│   ├── puyo.ts               # ぷよ操作（移動、回転、ドロップ、位置設定）
│   ├── chain.ts              # 連鎖判定（連結グループ検出、消去処理）
│   ├── score.ts              # スコア計算
│   ├── game.ts               # ゲーム状態管理（初期化、フェーズ遷移）
│   ├── random.ts             # 乱数生成（xorshiftラッパー）
│   └── index.ts
│
├── store/                    # 状態管理（Zustand）
│   ├── gameStore.ts          # ゲーム状態ストア・アクションディスパッチ
│   ├── actions.ts            # アクション型定義
│   └── index.ts
│
├── renderer/                 # 描画コンポーネント
│   ├── components/
│   │   ├── Field.tsx         # ゲームフィールド表示
│   │   ├── Puyo.tsx          # ぷよ単体の描画
│   │   ├── NextDisplay.tsx   # 次のぷよ表示
│   │   ├── ScoreDisplay.tsx  # スコア・連鎖数表示
│   │   ├── DisappearEffect.tsx # 消去エフェクト
│   │   ├── HistoryThumbnail.tsx  # 履歴サムネイル（ミニフィールド表示）
│   │   └── OperationHistory.tsx  # 操作履歴一覧（スクロール・復元機能）
│   └── index.ts
│
├── types/                    # 外部ライブラリの型定義
│   └── xorshift.d.ts         # xorshiftライブラリの型定義
│
└── screens/                  # 画面
    ├── TitleScreen.tsx       # タイトル画面
    ├── GameScreen.tsx        # ゲーム画面
    └── index.ts
```

## 主要な型定義 (src/logic/types.ts)

- `PuyoColor`: ぷよの色 (`'red' | 'blue' | 'green' | 'yellow'`)
- `Field`: 6列×12段のフィールド配列
- `FallingPuyo`: 操作中のぷよペア
  - `pivot`: 軸ぷよ（回転の中心）
  - `satellite`: 子ぷよ（軸の周りを回転）
  - `rotation`: 回転状態 (0:上, 1:右, 2:下, 3:左)
- `GamePhase`: ゲームフェーズ (`ready`, `falling`, `dropping`, `erasing`, `chaining`, `gameover`)
- `Position`: 座標 (`{ x: number, y: number }`)
- `RngState`: 乱数生成器の状態 (`[number, number, number, number]`)
- `GameSnapshot`: ゲーム状態のスナップショット
  - `id`: スナップショットID
  - `field`: フィールド状態
  - `nextQueue`: NEXTぷよキュー
  - `score`: スコア
  - `chainCount`: 連鎖数
  - `rngState`: 乱数生成器の状態
  - `droppedPositions`: 落下させたぷよの位置

## 操作システム (src/input/ControlAreaInput.tsx)

操作エリアでのタッチ操作を処理:
- タップ: 軸ぷよの列を設定、サテライトを上向きに
- スワイプ: サテライトの回転方向を設定
- スワイプ後に元の位置に戻す: キャンセル（サテライトだけ上に戻る）
- 離す: ハードドロップで確定

## ゲームストア (src/store/gameStore.ts)

Zustandを使用した状態管理。主なアクション:
- `START_GAME`: ゲーム開始
- `MOVE_LEFT` / `MOVE_RIGHT`: 左右移動
- `ROTATE_CW` / `ROTATE_CCW`: 回転
- `HARD_DROP`: ハードドロップ
- `SET_COLUMN`: 列を直接設定
- `SET_ROTATION`: 回転状態を直接設定
- `TICK`: ゲームループのティック処理

## 操作履歴機能

フィールドの左側に操作履歴を一覧表示する機能。

### 機能概要
- ぷよを落下させるたびにゲーム状態のスナップショットを保存
- 履歴はサムネイル形式で表示（フィールド状態 + NEXTぷよ）
- 最新の履歴が下部に表示され、上にスクロールすると古い履歴を確認可能
- 履歴をタップすると確認ダイアログが表示され、その時点の状態に復元可能

### 履歴サムネイルの表示
- 既存ぷよ（前の状態から残っているぷよ）: 塗りつぶし表示
- 落下させたぷよ: アウトライン（枠線のみ）表示

### 乱数状態の保存・復元
- xorshiftライブラリを使用した疑似乱数生成
- スナップショットに乱数生成器の状態（4つの32bit整数）を保存
- 復元時に乱数状態も復元することで、同じぷよ系列を再現

### 関連コンポーネント
- `HistoryThumbnail`: 個別の履歴サムネイルを描画
- `OperationHistory`: 履歴一覧のスクロールビューと復元確認モーダル
- `PuyoRng`: xorshiftライブラリのラッパークラス

## 開発コマンド

```bash
npm start        # Expo開発サーバー起動
npm run android  # Androidで実行
npm run ios      # iOSで実行
```
