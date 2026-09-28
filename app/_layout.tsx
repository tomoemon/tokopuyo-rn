import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigScreen } from '../src/components';
import { APP_BACKGROUND_COLOR, MAX_APP_WIDTH_RATIO, MIN_MAX_APP_WIDTH } from '../src/renderer';
import { initDatabase } from '../src/db';
import { openAppDatabase } from '../src/db/openDatabase';
import { loadStores } from '../src/store';

// 画面の背景と、画面の後ろにあるコンテナの背景に使われる。
// コンテナの背景は、スワイプで戻る途中に画面を逆方向へ引っ張ったときに見える
const NAVIGATION_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: APP_BACKGROUND_COLOR },
};

// Config モーダルのコンテキスト
import { createContext, useContext } from 'react';

type ConfigContextType = {
  openConfig: () => void;
  closeConfig: () => void;
};

export const ConfigContext = createContext<ConfigContextType>({
  openConfig: () => {},
  closeConfig: () => {},
});

export const useConfig = () => useContext(ConfigContext);

// 保存されているデータを読み込む。レイアウトが作り直されても（開発中の Fast Refresh など）、読み込みは1回だけにする
let savedDataLoading: Promise<void> | null = null;
function loadSavedData(): Promise<void> {
  savedDataLoading ??= (async () => {
    initDatabase(await openAppDatabase());
    await loadStores();
  })();
  return savedDataLoading;
}

export default function RootLayout() {
  const [configVisible, setConfigVisible] = useState(false);
  // 保存されているデータの読み込みが終わるまで画面を出さない
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    loadSavedData().then(
      () => setLoadState('ready'),
      (error) => {
        console.error('[db]', error);
        setLoadState('error');
      }
    );
  }, []);
  const { height: windowHeight } = useWindowDimensions();

  const openConfig = useCallback(() => {
    setConfigVisible(true);
  }, []);

  const closeConfig = useCallback(() => {
    setConfigVisible(false);
  }, []);

  // ウィンドウサイズの変更でこのコンポーネントが再描画されても、useConfig() を使う画面まで再描画しないようにする
  const configContextValue = useMemo(() => ({ openConfig, closeConfig }), [openConfig, closeConfig]);

  return (
    <ConfigContext.Provider value={configContextValue}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={[styles.app, { maxWidth: Math.max(MIN_MAX_APP_WIDTH, windowHeight * MAX_APP_WIDTH_RATIO) }]}>
          {loadState === 'ready' && (
            <ThemeProvider value={NAVIGATION_THEME}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="index" />
                {/* スワイプはぷよの操作に使うので、スワイプで前の画面に戻れないようにする（iOS 26 以降は画面全体のスワイプで戻るのがデフォルト） */}
                <Stack.Screen name="game" options={{ gestureEnabled: false }} />
                <Stack.Screen name="history" />
                <Stack.Screen name="replay" />
              </Stack>
            </ThemeProvider>
          )}
          {loadState === 'error' && (
            // Web では、同じブラウザの別のタブでアプリを開いていると DB を開けない
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Could not open the saved data. If the app is open in another tab, close it and reload this page.
              </Text>
            </View>
          )}
        </View>
      </View>
      <ConfigScreen visible={configVisible} onClose={closeConfig} />
    </ConfigContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BACKGROUND_COLOR,
    alignItems: 'center',
    // Web でマウスのドラッグ操作によりテキスト選択が起きないようにする（入力欄は影響を受けない）
    userSelect: 'none',
  },
  // 横に広い画面（PC ブラウザや iPad など）では、画面の高さ × MAX_APP_WIDTH_RATIO の幅（MIN_MAX_APP_WIDTH 以上）で中央にまとめる
  app: {
    flex: 1,
    width: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
