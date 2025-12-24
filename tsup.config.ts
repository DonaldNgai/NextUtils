import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server/preferences.ts',
    'src/payments/stripe.ts',
    'src/payments/subscription.ts',
    'src/auth/index.ts',
    'src/auth/users.ts',
  ],
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
  noExternal: ['clsx', 'tailwind-merge'],
  outDir: 'dist',
});
