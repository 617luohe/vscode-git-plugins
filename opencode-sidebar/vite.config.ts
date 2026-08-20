import { defineConfig } from "vite"

export default defineConfig({
  build: {
    lib: { entry: "src/extension.ts", formats: ["cjs"], fileName: () => "extension.js" },
    rollupOptions: { external: ["vscode"] },
    sourcemap: true,
    target: "node20",
  },
})
