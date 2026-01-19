import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { TitleScreen, GameScreen, ConfigScreen, GameHistoryScreen } from './src/screens';
import { useGameStore } from './src/store';

type Screen = 'title' | 'game' | 'history';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const [configVisible, setConfigVisible] = useState(false);
  const dispatch = useGameStore((state) => state.dispatch);
  const resumeFromHistory = useGameStore((state) => state.resumeFromHistory);

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

  const handleOpenHistory = useCallback(() => {
    setCurrentScreen('history');
  }, []);

  const handleBackFromHistory = useCallback(() => {
    setCurrentScreen('title');
  }, []);

  const handleResumeGame = useCallback((gameId: string, fromFavorites: boolean) => {
    const success = resumeFromHistory(gameId, fromFavorites);
    if (success) {
      setCurrentScreen('game');
    }
  }, [resumeFromHistory]);

  return (
    <>
      <StatusBar style="light" />
      {currentScreen === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenConfig={handleOpenConfig}
          onOpenHistory={handleOpenHistory}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen onBackToTitle={handleBackToTitle} onOpenConfig={handleOpenConfig} />
      )}
      {currentScreen === 'history' && (
        <GameHistoryScreen onBack={handleBackFromHistory} onResumeGame={handleResumeGame} />
      )}
      <ConfigScreen visible={configVisible} onClose={handleCloseConfig} />
    </>
  );
}
