# 連連 (RenRen)

同じ色を4つつなげて消すパズルゲームの練習アプリ。

## ファイルアーキテクチャ

```
app/                          # 画面（expo-router のファイルベースルーティング）

src/
├── input/                    # 入力処理
├── logic/                    # ゲームロジック（純粋関数）
├── store/                    # 状態管理（Zustand）
├── db/                       # 永続化（expo-sqlite のリポジトリ層、マイグレーション、書き込みの待ち行列）
├── components/               # 共通コンポーネント
├── renderer/                 # 描画コンポーネント
└── types/                    # 外部ライブラリの型定義

docs/                         # 詳細ドキュメント
├── SPECIFICATION.md          # ゲーム仕様・アーキテクチャ
├── control-system.md         # 操作体系
├── types.md                  # 型定義
├── stores.md                 # ストア詳細
├── components.md             # コンポーネント詳細
└── device-testing.md         # iOS シミュレータでの自動操作による動作確認（agent-device）
```

## 画面構成

- **TitleScreen** (`app/index.tsx`): タイトル画面（START/Config/History）
- **GameScreen** (`app/game.tsx`): ゲーム画面（フィールド、操作エリア、履歴）
- **ConfigScreen** (`src/components/ConfigScreen.tsx`): 設定画面（モーダル、利き手設定 - 空間対応型配置、連鎖アニメーション速度）
- **GameHistoryScreen** (`app/history.tsx`): ゲーム履歴画面（History/Favorite タブ）
- **GameReplayScreen** (`app/replay.tsx`): ゲーム再生画面（過去のゲームを閲覧）

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

フィールドエリアと操作エリアの両方で同じタッチ操作が可能:
- タップ: 軸ぷよの列を設定
- スワイプ: サテライトの回転方向を設定
- 離す: ハードドロップで確定

フィールドと操作エリアのハイライト状態は同期される（どちらでタッチしても両方に表示）。

詳細は `docs/control-system.md` を参照。

## 開発コマンド

```bash
npm start        # Expo開発サーバー起動
npm run android  # Androidで実行
npm run ios      # iOSで実行
npm run web      # Webブラウザで実行（日常的な動作確認はこれで行う）
npm test         # ロジックのテスト（vitest）
npx tsc --noEmit # 型チェック
```

iOS シミュレータでの動作確認は、agent-device で自動操作できる。手順は `docs/device-testing.md` を参照。

## 依存パッケージ

- `expo`: Expoフレームワーク
- `react-native`: React Native
- `react-native-web`: Web 対応（`react-dom`、`@expo/metro-runtime` とセット）
- `zustand`: 状態管理
- `expo-sqlite`: データ永続化（非同期 API だけを使う。詳細は `docs/stores.md` の「永続化」）
- `expo-haptics`: 触覚フィードバック
- `xorshift`: 疑似乱数生成

パッケージは `npx expo install` で入れること。理由は `DEPENDENCY_NOTES.md` を参照。

## コーディング規約

### 永続化
- SQL は `src/db/` のリポジトリに閉じ込め、DB への読み書きはすべて待ち行列（`enqueue`）を通す
- テーブル定義を変えるときは `src/db/migrations.ts` を変更する（リリース前は v1 を直接書き換える）
- `GameSnapshot` の型を変えるときは、保存済みの `snapshots.data`（JSON）のマイグレーションが必要か確認する

### アイコン
- アイコンを使用する際は `@react-native-vector-icons/ionicons` の **Ionicons** を使用すること（`@expo/vector-icons` は SDK 56 で非推奨）
- Unicode 文字やテキストベースのアイコンは使用しない（端末によって表示が異なるため）
