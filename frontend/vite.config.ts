import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Resolves the `#/*` path alias straight from tsconfig.json, so there is no
  // second copy of it to keep in sync here.
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // Colocated tests live beside the route they cover. Without this the
      // generator warns about every one of them ("does not export a Route")
      // and the noise trains people to ignore a warning that matters.
      routeFileIgnorePattern: '\\.test\\.',
    }),
    viteReact(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // The router plugin regenerates routeTree.gen.ts on every run; excluding
    // dist keeps vitest from picking up built output.
    exclude: ['node_modules', 'dist'],
  },
})
