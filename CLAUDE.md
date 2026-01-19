# tokopuyo-rn

React Native (Expo) で作成されたぷよぷよ風パズルゲーム。

## ファイルアーキテクチャ

```
src/
├── input/                    # 入力処理
├── logic/                    # ゲームロジック（純粋関数）
├── store/                    # 状態管理（Zustand、永続化対応）
├── components/               # 共通コンポーネント
├── renderer/                 # 描画コンポーネント
├── types/                    # 外部ライブラリの型定義
└── screens/                  # 画面

docs/                         # 詳細ドキュメント
├── types.md                  # 型定義
├── stores.md                 # ストア詳細
└── components.md             # コンポーネント詳細
```

## 画面構成

- **TitleScreen**: タイトル画面（START/Config）
- **GameScreen**: ゲーム画面（フィールド、操作エリア、履歴）
- **ConfigScreen**: 設定画面（モーダル、利き手設定 - 空間対応型配置）
- **GameHistoryScreen**: ゲーム履歴画面（History/Favorite タブ）
- **GameReplayScreen**: ゲーム再生画面（過去のゲームを閲覧）

## 共通コンポーネント

### GameHeader
画面上部のヘッダーコンポーネント。全画面で共通のレイアウトを提供。
- 左: Back ボタン（GameScreen では確認ダイアログ付き）
- 中央: タイトル or スコア表示
- 右: Config ボタン（オプション）

### GameFieldLayout
フィールドとオーバーレイを含む共通レイアウト。GameScreen と GameReplayScreen で使用。
- フィールド表示（隠しマス含む）
- NEXT ぷよオーバーレイ（フィールド右上）
- 連鎖数オーバーレイ（フィールド左上、連鎖中のみ表示）
- ゲームオーバーオーバーレイ

## フィールド表示

- 隠しマス（1行）: 暗い背景色で表示、可視マスとの境界線あり
- 可視マス（12行）: 通常の背景色
- ゲームオーバーマーク（×印）: 可視マス最上行の中央2列に表示

## 再生画面

GameHistoryScreen で履歴アイテムを選択し「Replay」を選ぶと再生画面に遷移。

### 操作ボタン
- **First (⏮)**: 最初のスナップショットに戻る
- **Prev (◀)**: 1手前に戻る
- **Next (▶)**: 1手進む（連鎖時はアニメーション再生）
- **Last (⏭)**: 最後のスナップショットに進む

### 連鎖アニメーション
Next ボタンで進む際、連鎖が発生する場合は自動的にアニメーションを再生:
- 消えるぷよのパーティクルエフェクト
- 連鎖数とスコアのリアルタイム更新
- Haptic フィードバック（連鎖数に応じて強度変化）
- アニメーション中は操作ボタン無効化

## 操作システム

操作エリアでのタッチ操作:
- タップ: 軸ぷよの列を設定
- スワイプ: サテライトの回転方向を設定
- 離す: ハードドロップで確定

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
