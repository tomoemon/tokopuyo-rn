import { router, type Href } from 'expo-router';

/**
 * 前の画面に戻る。戻る先がない場合（Web で画面を直接開いた・リロードした場合）は fallback へ移動する
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
