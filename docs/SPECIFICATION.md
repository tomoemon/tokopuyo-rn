# tokopuyo-rn 仕様書

## 概要

React Native (Expo) で作るぷよぷよ風パズルゲーム

## ゲーム仕様

### 基本ルール

| 項目 | 仕様 |
|------|------|
| フィールドサイズ | 6列 × 12段 |
| ぷよの色数 | 4色（赤・青・緑・黄） |
| 最初の2手の色制限 | 最大3色まで（ぷよぷよ通準拠） |
| 消去条件 | 同色4つ以上が繋がると消える |
| ゲームモード | エンドレス（ゲームオーバーまで） |
| ゲームオーバー条件 | フィールド上部（3列目の最上段）にぷよが置けなくなった時 |

### ぷよ生成仕様

ぷよぷよ通の仕様に準拠した乱数生成を行う。

#### 最初の2手の色制限
ゲーム開始時の最初の2手（4つのぷよ）は、最大3色までに制限される。

**NGパターン（4色）:**
```
1手目: 赤青
2手目: 緑黄
```

**OKパターン（3色）:**
```
1手目: 赤青
2手目: 黄赤
```

**OKパターン（2色）:**
```
1手目: 赤赤
2手目: 青青
```

**OKパターン（1色）:**
```
1手目: 赤赤
2手目: 赤赤
```

#### 実装方法
`PuyoRng.generateInitialPairs()` メソッドで最初の2手を生成。4色になった場合は、4つ目のぷよの色を最初の3つで使われた色からランダムに選び直す。

### 操作方法

| 操作 | アクション |
|------|------------|
| 左スワイプ | 左に移動 |
| 右スワイプ | 右に移動 |
| 下スワイプ | 高速落下 |
| タップ | 時計回りに回転 |

### 画面構成

| 画面 | 機能 |
|------|------|
| タイトル画面 | ゲーム開始ボタン |
| ゲーム画面 | フィールド、NEXT表示(2つ)、スコア、連鎖数表示、エフェクト |

## スコア計算仕様（ぷよぷよ通準拠）

### 基本計算式

```
スコア = 消したぷよ数 × 10 × (連鎖ボーナス + 連結ボーナス + 色数ボーナス)
```

※ ボーナス合計が0の場合は1として計算

### 連鎖ボーナス

| 連鎖数 | ボーナス |
|--------|----------|
| 1 | 0 |
| 2 | 8 |
| 3 | 16 |
| 4 | 32 |
| 5 | 64 |
| 6 | 96 |
| 7 | 128 |
| 8 | 160 |
| 9 | 192 |
| 10 | 224 |
| 11 | 256 |
| 12 | 288 |
| 13以上 | 320 (最大) |

### 連結ボーナス（1グループあたり）

| 連結数 | ボーナス |
|--------|----------|
| 4個 | 0 |
| 5個 | 2 |
| 6個 | 3 |
| 7個 | 4 |
| 8個 | 5 |
| 9個 | 6 |
| 10個 | 7 |
| 11個以上 | 10 |

### 色数ボーナス（同時消し）

| 色数 | ボーナス |
|------|----------|
| 1色 | 0 |
| 2色 | 3 |
| 3色 | 6 |
| 4色 | 12 |

## アーキテクチャ

### 設計方針

- **描画とロジックの完全分離**: 将来的にSkiaへの置き換えを可能にする
- **入力とViewの分離**: 操作方法の変更を容易にする
- **純粋関数によるロジック実装**: テスタビリティの確保

### レイヤー構成

```
┌─────────────────────────────────────────┐
│           UI Layer (Screens)            │
├─────────────────────────────────────────┤
│  Input Adapter    │    Renderer         │  ← 両方とも置換可能
│  (スワイプ等)      │    (描画)           │
├─────────────────────────────────────────┤
│         Store Layer (Zustand)           │
├─────────────────────────────────────────┤
│         Game Logic Layer (純粋関数)      │
└─────────────────────────────────────────┘
```

### ディレクトリ構成

```
src/
├── logic/                 # ゲームロジック（描画・入力非依存）
│   ├── types.ts           # 型定義
│   ├── field.ts           # フィールド操作
│   ├── chain.ts           # 連結・消去判定
│   ├── score.ts           # スコア計算
│   ├── puyo.ts            # 操作ぷよの移動・回転計算
│   └── game.ts            # ゲーム進行管理
│
├── store/                 # 状態管理
│   ├── gameStore.ts       # ゲーム状態
│   └── actions.ts         # 抽象化されたアクション
│
├── input/                 # 入力層（置換可能）
│   ├── types.ts           # 入力アクション型定義
│   ├── SwipeInput.tsx     # スワイプ実装
│   ├── ButtonInput.tsx    # ボタン実装（将来用）
│   └── KeyboardInput.tsx  # キーボード実装（将来用）
│
├── renderer/              # 描画層（置換可能）
│   ├── components/
│   │   ├── Field.tsx
│   │   ├── Puyo.tsx
│   │   ├── NextDisplay.tsx
│   │   └── Effects.tsx
│   └── index.ts
│
└── screens/               # 画面（薄いレイヤー）
    ├── TitleScreen.tsx
    └── GameScreen.tsx
```

### レイヤー間の依存ルール

| レイヤー | 依存可能 | 依存禁止 |
|----------|----------|----------|
| **logic/** | なし | React, React Native, Zustand, input/, renderer/ |
| **store/** | logic/ | React Native, input/, renderer/ |
| **input/** | store/actions | logic/直接, renderer/ |
| **renderer/** | store/ (状態読取のみ) | logic/直接, input/ |
| **screens/** | input/, renderer/, store/ | logic/直接 |

### 型定義（logic/types.ts）

```typescript
// ぷよの色
export type PuyoColor = 'red' | 'blue' | 'green' | 'yellow';

// フィールド（6列×12段、nullは空）
export type Field = (PuyoColor | null)[][];

// 座標
export type Position = { x: number; y: number };

// 操作中のぷよペア
export type FallingPuyo = {
  main: { pos: Position; color: PuyoColor };
  sub: { pos: Position; color: PuyoColor };
  rotation: 0 | 1 | 2 | 3;  // 0:上, 1:右, 2:下, 3:左
};

// ゲーム状態
export type GameState = {
  field: Field;
  fallingPuyo: FallingPuyo | null;
  nextQueue: [PuyoColor, PuyoColor][];  // 次のぷよペア（最低2つ）
  score: number;
  chainCount: number;
  isGameOver: boolean;
  phase: 'falling' | 'dropping' | 'chaining' | 'gameover';
};
```

### 入力アクション型（input/types.ts）

```typescript
export type GameAction =
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'ROTATE_CW' }      // 時計回り
  | { type: 'ROTATE_CCW' }     // 反時計回り
  | { type: 'SOFT_DROP' }      // 加速落下
  | { type: 'HARD_DROP' };     // 即落下
```

## 技術スタック

| カテゴリ | 選択 |
|----------|------|
| フレームワーク | Expo (React Native) |
| 言語 | TypeScript |
| 描画 | React Nativeコンポーネント（将来Skia置換可能） |
| 状態管理 | Zustand |
| 入力 | スワイプ操作（将来他方式に置換可能） |

## 定数

```typescript
export const FIELD_COLS = 6;
export const FIELD_ROWS = 12;
export const COLORS: PuyoColor[] = ['red', 'blue', 'green', 'yellow'];
export const CONNECT_COUNT = 4;  // 消えるのに必要な連結数
```
