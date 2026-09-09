import { defineConfig } from 'vite';

/**
 * Base path handling for GitHub Pages.
 *
 * GitHub project pages are served from https://<user>.github.io/<repo>/ - NOT the domain root.
 * Using a relative base ('./') makes every emitted asset URL relative to index.html, so the
 * build works from any sub-directory without knowing the repository name at build time.
 *
 * Runtime asset loading (Phaser) uses `import.meta.env.BASE_URL` (see src/data/assets.ts) so
 * sprites and audio are also resolved relative to the deployed location.
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets-build',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
