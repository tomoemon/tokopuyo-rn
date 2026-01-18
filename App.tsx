import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { TitleScreen, GameScreen, ConfigScreen } from './src/screens';
import { useGameStore } from './src/store';

type Screen = 'title' | 'game';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const [configVisible, setConfigVisible] = useState(false);
  const dispatch = useGameStore((state) => state.dispatch);

  const handleStartGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    setCurrentScreen('game');
  }, [dispatch]);

  const handleBackToTitle = useCallback(() => {
    setCurrentScreen('title');
  }, []);

  const handleOpenConfig = useCallback(() => {
    setConfigVisible(true);
  }, []);

  const handleCloseConfig = useCallback(() => {
    setConfigVisible(false);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {currentScreen === 'title' && (
        <TitleScreen onStartGame={handleStartGame} onOpenConfig={handleOpenConfig} />
      )}
      {currentScreen === 'game' && (
        <GameScreen onBackToTitle={handleBackToTitle} onOpenConfig={handleOpenConfig} />
      )}
      <ConfigScreen visible={configVisible} onClose={handleCloseConfig} />
    </>
  );
}
