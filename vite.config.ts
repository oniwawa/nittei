import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    // アプリ本体に加えて、プライバシーポリシーと利用規約のページもビルドする
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        privacy: resolve(import.meta.dirname, "privacy.html"),
        terms: resolve(import.meta.dirname, "terms.html"),
      },
    },
  },
});
