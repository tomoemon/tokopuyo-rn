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
- **ConfigScreen**: 設定画面（モーダル、利き手設定）
- **GameHistoryScreen**: ゲーム履歴画面（History/Favorite タブ）

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
