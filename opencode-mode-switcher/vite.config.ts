import { defineConfig } from "vite"
import { resolve } from "node:path"

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/extension.ts"),
      formats: ["cjs"],
      fileName: () => "extension.js",
    },
    target: "node20",
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { external: ["vscode"] },
  },
})
