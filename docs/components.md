# コンポーネント

## 共通コンポーネント (src/components)

### GameHeader
画面上部のヘッダー。全画面で共通のレイアウトを提供する。
- 左: Back ボタン
- 中央: `title` または `score`
- 右: Config ボタン（`onConfig` を渡し、`showConfig` が false でない場合に表示）
- `showBorder`: 下部ボーダーの表示

### ConfigScreen
設定モーダル。`app/_layout.tsx` に1つだけ置き、各画面からは `useConfig().openConfig()` で開く。
- Handedness: Left / Right（フィールドと操作履歴の配置をプレビュー付きで選択）
- Chain Animation Speed: Short / Middle / Long（表示する ms は `CHAIN_ANIMATION_DELAYS` から生成）

### ConfirmDialog
破壊的な操作の確認ダイアログ（ゲーム画面の Back、履歴の削除）。`DismissableModal` の上に、タイトルと Cancel / 確認の2ボタンを表示する。

`Alert.alert` は Web でボタン付きのダイアログを表示できないため使わず、全プラットフォームでこのコンポーネントを使う。

Props:
- `visible`: 表示状態
- `title`: 確認の文言
- `confirmText`: 確認ボタンの文言
- `onConfirm`: 確認ボタンを押したとき
- `onCancel`: Cancel ボタン・背景タップ・Android の戻るボタン

### goBack
`goBack(fallback)`: 前の画面に戻る。戻る先がない場合（Web で画面を直接開いた・リロードした場合）は `fallback` へ移動する。各画面の Back ボタンで使う。

### DismissableModal
背景タップで閉じることができるモーダル。

```tsx
<DismissableModal
  visible={isVisible}
  onDismiss={() => setIsVisible(false)}
  animationType="fade"
>
  <View>{/* モーダルコンテンツ */}</View>
</DismissableModal>
```

Props:
- `visible`: モーダルの表示状態
- `onDismiss`: 閉じる時のコールバック（背景タップ、Android の戻るボタン）
- `children`: モーダルコンテンツ
- `overlayStyle`: オーバーレイのスタイル（オプション）
- `contentStyle`: コンテンツのスタイル（オプション）
- その他 ModalProps を継承（`transparent` は常に true）

コンテンツ内のタップはイベントを吸収する（閉じない）。

## 描画コンポーネント (src/renderer)

### GameFieldLayout
フィールドとオーバーレイをまとめたレイアウト。ゲーム画面と再生画面で使う。
- フィールド（隠し段を含む）
- NEXT（フィールド右上）
- 連鎖数（フィールド左上、連鎖中のみ）
- ゲームオーバー表示

### Field
フィールド本体。グリッド、設置済みのぷよ、操作ぷよ、落下位置のゴースト、消去エフェクト、ゲームオーバーの×印（可視最上段の3・4列目）を描画する。隠し段は暗い背景で、可視段との境界線を表示する。

### Puyo / NextDisplay / DisappearEffect
- `Puyo`: 1つのぷよ（ゴースト表示は半透明）
- `NextDisplay`: NEXT の2組を表示
- `DisappearEffect`: 消えるぷよのパーティクルエフェクト。`onComplete` を渡したエフェクトだけが完了を通知する（Field は先頭のエフェクトにだけ渡す）

### OperationHistory / HistoryThumbnail
操作履歴のサムネイル一覧。新しい手が下。
- ゲーム画面: サムネイルをタップすると確認モーダルを表示し、承認するとその手に戻る
- 再生画面（`currentSnapshotId` を渡す）: 確認なしでその手にジャンプし、現在の手をハイライト
- `HistoryThumbnail` はその手で置いたぷよを枠線だけで表示する

どちらも `React.memo` で、履歴が変わらない限り再描画しない。

### constants.ts / useGameLayout
- `PUYO_COLORS`: ぷよの表示色
- `FIELD_BORDER_WIDTH`: フィールドの枠線の太さ（入力層の列の計算でも使う）
- `MAX_APP_WIDTH_RATIO`: アプリ全体の最大幅の、画面の高さに対する比率。`app/_layout.tsx` で全画面を「画面の高さ × この比率」の幅に収めて中央に寄せる（PC ブラウザや iPad など横に広い画面向け）。ただし `MIN_MAX_APP_WIDTH` より狭くは絞らない（16:9 のスマホやモバイルブラウザで画面の幅いっぱいに表示するため）
- `useGameLayout()`: 履歴とフィールドを並べるエリアの実寸（`onAreaLayout` で測る）と利き手から、セルサイズ、マージン、履歴エリアの幅などを計算する（ゲーム画面・再生画面共通）。縦はフィールド13行 + 操作エリア3行が収まる大きさにする。履歴エリアの幅とサムネイルのマス目もセルサイズに比例させる（セル 44 のときマス目 6）。測り終えるまで（`isLayoutReady` が false の間）は中身を描画しない
