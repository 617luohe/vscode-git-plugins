// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
];

export default defineConfig(({ mode }) => {
  return {
    build: {
      lib: {
        entry: {
          extension: resolve(__dirname, 'src/extension.ts'),
        },
        formats: ['cjs'],
        fileName: (_format, entryName) => `${entryName}.js`
      },
      rollupOptions: {
        external: [
          'vscode',
          '@vscode/test-electron',
          'mocha',
          'glob',
          ...nodeBuiltins,
        ],
      },
      sourcemap: true,
      outDir: 'dist',
      emptyOutDir: true,
      target: 'node20',
      minify: mode.startsWith('production') ? 'terser' : false,
      terserOptions: {
        keep_classnames: true,
        keep_fnames: true,
        compress: {
          drop_debugger: false
        }
      }
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    optimizeDeps: {
      exclude: ['fs', 'fs/promises', 'timers']
    }
  }
})
