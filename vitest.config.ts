import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/logic/**/*.ts', 'src/store/**/*.ts', 'src/db/**/*.ts'],
      // expo-sqlite で DB を開く処理はアプリでだけ使う（テストは node:sqlite で開く）
      exclude: ['src/**/index.ts', 'src/**/__tests__/**', 'src/db/openDatabase.ts'],
    },
  },
});
