import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback } from 'react';
import { ConfigScreen } from '../src/screens';

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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a1a' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
        <Stack.Screen name="history" />
        <Stack.Screen name="replay" />
      </Stack>
      <ConfigScreen visible={configVisible} onClose={closeConfig} />
    </ConfigContext.Provider>
  );
}
