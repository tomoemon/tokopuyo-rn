# iOS シミュレータでの自動操作による動作確認（agent-device）

[agent-device](https://github.com/callstack/agent-device) を使うと、iOS シミュレータの Expo Go 上で動くアプリを、コマンドで操作・スクリーンショット取得できる。Web では確かめられないネイティブの挙動（DB の保存、アプリの再起動後の状態など）を確認するときに使う。

動作を確認したバージョン：agent-device 0.21.15、Expo Go 57、iPhone 17 Pro（iOS 26.5）シミュレータ

## 準備

1. 開発サーバーを起動する。対応する Expo Go がシミュレータに入っていなければ、自動でインストールされる

   ```bash
   npx expo start --ios --clear --port 8096
   ```

   - ポートが使用中と言われたら、前の開発サーバーが残っている。`lsof -nP -iTCP:8096 -sTCP:LISTEN` で確かめて止める
   - ファイルを変更しても古いコードのままのことがある（Metro のファイル監視が変更を拾わないことがある）。そのときは `--clear` を付けて起動し直す

2. agent-device でアプリを開く。最初の1回だけ、XCTest の実行環境のビルドに時間がかかる

   ```bash
   npx -y agent-device open "Expo Go" exp://127.0.0.1:8096 --platform ios --device "iPhone 17 Pro" --foreground
   ```

   - 画面の要素が `@e6 [other] "START"` のように一覧で出る
   - セッションは、コマンドを実行したディレクトリごとに作られる。同じディレクトリで続けて実行する

## よく使うコマンド

```bash
# 要素を ref や名前で押す（--settle を付けると、画面が落ち着くまで待って変化を表示する）
npx -y agent-device press '@e6' --settle
npx -y agent-device press 'label="History"' --settle

# 座標で押す（単位はポイント）
npx -y agent-device press 125 400

# 画面の要素の一覧を取り直す
npx -y agent-device snapshot -i

# スクリーンショット（保存したファイルを見て、画面の状態を確かめる）
npx -y agent-device screenshot screen.png

# フォーカスしている入力欄に文字を入力する（先に入力欄を押してフォーカスする）
npx -y agent-device type "memo"

# アプリを終了して起動し直す（再起動後の状態の確認に使う）
npx -y agent-device open "Expo Go" exp://127.0.0.1:8096 --platform ios --device "iPhone 17 Pro" --relaunch

# 終わったらセッションを閉じる
npx -y agent-device close
```

## このアプリでの注意点

- モーダル（History の Select action、Leave の確認、Favorite の編集、Config）は、要素の一覧に出てこない。スクリーンショットを見て座標で押す
- ゲームのフィールドと操作エリアは、1つのタッチで列を選んで置く操作なので、座標で押す（押した列にハードドロップする）
- フィールドに半透明で出ているぷよは、落下位置のプレビュー（ゴースト）で、まだ置かれていない
- `keyboard dismiss` ではキーボードが閉じない。編集モーダルでは、モーダルの余白（タイトルの横など）を押すと閉じる
- ref（`@e6` など）は画面が変わると使えなくなる。エラーの Hint に出る `@e6~s599879` のような ref を使うか、`snapshot -i` で取り直す

## 座標の目安（iPhone 17 Pro、402 × 874 ポイント、右利き）

レイアウトが変わるとずれるので、スクリーンショットで確かめてから使う。

| 画面 | 要素 | 座標 |
|------|------|------|
| タイトル | START / Config / History | (201, 438) / (201, 515) / (201, 592) |
| ゲーム | Back | (51, 79) |
| ゲーム | フィールドの各列（左から） | x = 125, 169, 213, 257, 301, 345（y = 400） |
| Leave の確認 | Cancel / Leave | (134, 460) / (268, 460) |
| History | History タブ / Favorite タブ | (100, 136) / (300, 136) |
| History | 一番上のエントリ / そのお気に入りの星 | (200, 234) / (354, 234) |
| Select action | Resume / Fork | (134, 393) / (264, 393) |
| Select action | Replay / Shuffle / Cancel | (134, 481) / (264, 481) / (201, 558) |
| Config | Left-handed / Right-handed | (119, 390) / (282, 390) |
| Config | Short / Middle / Long / Close | (94, 563) / (201, 563) / (307, 563) / (201, 639) |

## 確認の手順の例（保存の確認）

1. タイトルで START を押し、フィールドの列を順に押して数手置く（連鎖も起こす）
2. Back → Leave でタイトルに戻る
3. `open ... --relaunch` でアプリを起動し直す
4. History を開き、ゲームが残っていること（スコア・ツモ数）を確かめる
5. エントリを押して Resume し、同じ盤面と履歴の列から続けられることを確かめる
6. 星でお気に入りに追加し、Favorite タブの鉛筆でメモとタグを編集して Save する
7. Config で設定を変えて Close する
8. もう一度 `--relaunch` で起動し直し、Favorite のメモとタグ、Config の設定が残っていることを確かめる
9. Favorite のエントリから Replay を開き、Next / Last で手を送れることを確かめる
