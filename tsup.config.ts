import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@auth0/nextjs-auth0',
    '@tanstack/react-table',
    'server-only',
  ],
  outDir: 'dist',
});
