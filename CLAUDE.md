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
│   ├── types.ts              # 型定義（PuyoColor, Field, FallingPuyo, GamePhase等）
│   ├── field.ts              # フィールド操作（空セル検出、配置等）
│   ├── puyo.ts               # ぷよ操作（移動、回転、ドロップ、位置設定）
│   ├── chain.ts              # 連鎖判定（連結グループ検出、消去処理）
│   ├── score.ts              # スコア計算
│   ├── game.ts               # ゲーム状態管理（初期化、フェーズ遷移）
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
│   │   └── DisappearEffect.tsx # 消去エフェクト
│   └── index.ts
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

## 開発コマンド

```bash
npm start        # Expo開発サーバー起動
npm run android  # Androidで実行
npm run ios      # iOSで実行
```
