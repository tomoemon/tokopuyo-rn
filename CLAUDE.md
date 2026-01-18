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
│   ├── gameStore.ts          # ゲーム状態ストア・アクションディスパッチ（永続化対応）
│   ├── configStore.ts        # 設定ストア（利き手設定、永続化対応）
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
    ├── ConfigScreen.tsx      # 設定画面（モーダル）
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

## 画面構成

### タイトル画面 (TitleScreen)
- STARTボタン: ゲーム開始
- Configボタン: 設定画面を開く

### ゲーム画面 (GameScreen)
- フィールド: 6列×12段のゲームフィールド
- 操作エリア: フィールド直下のタッチ操作領域
- NEXTぷよ: フィールド右上に表示
- 履歴エリア: フィールドの反対側に配置
- スコア表示: 操作エリア直下の右側
- 連鎖数表示: 操作エリア直下の左側
- Title/Configボタン: スコア表示の下

### 設定画面 (ConfigScreen)
- モーダル形式で現在の画面の上に表示
- 利き手設定（右利き/左利き）の切り替え

## 利き手設定（Handedness）

プレイヤーの利き手に合わせてレイアウトを切り替え可能:

### 右利きモード（デフォルト）
- フィールドと操作エリアが画面右側
- 履歴エリアが画面左側

### 左利きモード
- フィールドと操作エリアが画面左側
- 履歴エリアが画面右側

設定はConfig画面から変更可能。アプリ再起動後も設定は保持される。

## 操作システム (src/input/ControlAreaInput.tsx)

操作エリアでのタッチ操作を処理:
- タップ: 軸ぷよの列を設定、サテライトを上向きに
- スワイプ: サテライトの回転方向を設定
- スワイプ後に元の位置に戻す: キャンセル（サテライトだけ上に戻る）
- 離す: ハードドロップで確定

## ゲームストア (src/store/gameStore.ts)

Zustandを使用した状態管理。AsyncStorageによる永続化対応。

### 主なアクション
- `START_GAME`: ゲーム開始
- `RESTART_GAME`: ゲームリセット
- `MOVE_LEFT` / `MOVE_RIGHT`: 左右移動
- `ROTATE_CW` / `ROTATE_CCW`: 回転
- `HARD_DROP`: ハードドロップ
- `SET_COLUMN`: 列を直接設定
- `SET_ROTATION`: 回転状態を直接設定
- `TICK`: ゲームループのティック処理

### 永続化される項目
- フィールド状態
- NEXTキュー
- スコア
- 連鎖数
- ゲームフェーズ
- 操作履歴
- スナップショットID

## 設定ストア (src/store/configStore.ts)

Zustandを使用した設定管理。AsyncStorageによる永続化対応。

### 設定項目
- `handedness`: 利き手設定 (`'right'` | `'left'`)

## 操作履歴機能

フィールドの横に操作履歴を一覧表示する機能。

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

## ゲームオーバー表示

ゲームオーバー時の表示:
- フィールドと操作エリアがグレーアウト（opacity: 0.4）
- フィールド上に薄い赤色のオーバーレイと「GAME OVER」テキストを表示
- 操作エリアへのタッチ入力は無効化
- 履歴からの復元操作は可能（過去の状態に戻れる）
- Title/Configボタンは引き続き使用可能

## データ永続化

AsyncStorage + Zustand persistミドルウェアを使用:

### 保存されるデータ
- **configStore**: 利き手設定
- **gameStore**: ゲーム状態（フィールド、スコア、履歴など）

### 復元時の処理
- 最後のスナップショットから乱数状態を復元
- 進行中だったゲームはreadyフェーズに戻す

## 開発コマンド

```bash
npm start        # Expo開発サーバー起動
npm run android  # Androidで実行
npm run ios      # iOSで実行
```

## 依存パッケージ

- `expo`: Expoフレームワーク
- `react-native`: React Native
- `zustand`: 状態管理
- `@react-native-async-storage/async-storage`: データ永続化
- `expo-haptics`: 触覚フィードバック
- `react-native-gesture-handler`: ジェスチャー処理
- `xorshift`: 疑似乱数生成
