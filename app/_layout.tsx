import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback } from 'react';
import { ConfigScreen } from '../src/components';
import { MAX_APP_WIDTH } from '../src/renderer';

const BACKGROUND_COLOR = '#0a0a1a';

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

export default function RootLayout() {
  const [configVisible, setConfigVisible] = useState(false);

  const openConfig = useCallback(() => {
    setConfigVisible(true);
  }, []);

  const closeConfig = useCallback(() => {
    setConfigVisible(false);
  }, []);

  return (
    <ConfigContext.Provider value={{ openConfig, closeConfig }}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.app}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: BACKGROUND_COLOR },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="game" />
            <Stack.Screen name="history" />
            <Stack.Screen name="replay" />
          </Stack>
        </View>
      </View>
      <ConfigScreen visible={configVisible} onClose={closeConfig} />
    </ConfigContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    alignItems: 'center',
    // Web でマウスのドラッグ操作によりテキスト選択が起きないようにする（入力欄は影響を受けない）
    userSelect: 'none',
  },
  // 横に広い画面（PC ブラウザなど）では中央に MAX_APP_WIDTH の幅でまとめる
  app: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_APP_WIDTH,
  },
});
