import { useEffect, useState } from 'react';

/**
 * active が delayMs 以上続いたときだけ true を返す。
 * 読み込みが短時間で終わるときにローディング表示を出さない（ちらつかせない）ために使う
 */
export function useDelayedVisible(active: boolean, delayMs: number): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return active && visible;
}
