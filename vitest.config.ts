import { defineConfig } from 'vitest/config';

/**
 * Config de los tests.
 *
 * Los `*.test.ts` son lógica pura y corren en Node, como siempre. Los
 * `*.test.tsx` renderizan componentes: corren en jsdom con `react-native`
 * apuntando a `react-native-web`, que es el mismo renderer que usa
 * `expo export --platform web`. Los módulos nativos (mapas, haptics,
 * ubicación, reanimated) se reemplazan en `src/test/setup-ui.ts`.
 */
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  define: {
    __DEV__: 'false',
  },
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.mjs', '.js', '.json'],
  },
  test: {
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/test/setup-ui.ts'],
    server: {
      deps: {
        inline: [/react-native-web/],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'App.tsx'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/generated/**',
        'src/features/driver/testFixtures.ts',
      ],
    },
  },
});
