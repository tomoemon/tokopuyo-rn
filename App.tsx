import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { TitleScreen, GameScreen } from './src/screens';
import { useGameStore } from './src/store';

type Screen = 'title' | 'game';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const dispatch = useGameStore((state) => state.dispatch);

  const handleStartGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    setCurrentScreen('game');
  }, [dispatch]);

  const handleBackToTitle = useCallback(() => {
    setCurrentScreen('title');
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {currentScreen === 'title' ? (
        <TitleScreen onStartGame={handleStartGame} />
      ) : (
        <GameScreen onBackToTitle={handleBackToTitle} />
      )}
    </>
  );
}
