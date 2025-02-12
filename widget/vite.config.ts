import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [preact(), tailwindcss(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      name: "chat-widget",
      entry: "./src/main.tsx",
      formats: ["es"],
    },
    sourcemap: false,
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        unused: true,
        conditionals: true,
        evaluate: true,
        sequences: true,
        booleans: true,
      },
      format: {
        comments: false,
      },
    },
  },
  define: {
    "process.env": {},
  },
});
