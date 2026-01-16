import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
    // Оптимизация размера бандла
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
    // Оптимизация CSS
    cssMinify: true,
    cssCodeSplit: true,
    // Source maps только для production debugging
    sourcemap: false,
    rollupOptions: {
      output: {
        // Оптимизация имён файлов для кэширования
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          // Split vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // UI библиотеки
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Lucide иконки - отдельный чанк
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // React Query
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            // Утилиты
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
            // Capacitor (мобильные)
            if (id.includes('@capacitor')) {
              return 'vendor-capacitor';
            }
            // Криптография
            if (id.includes('crypto') || id.includes('tweetnacl')) {
              return 'vendor-crypto';
            }
            // Остальные vendor
            return 'vendor-other';
          }
          
          // Разделение по страницам для lazy loading
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^/]+)/);
            if (match) {
              return `page-${match[1].toLowerCase().replace('.tsx', '')}`;
            }
          }
        },
      },
    },
  },
  // Оптимизация для production
  esbuild: {
    legalComments: 'none',
    treeShaking: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
