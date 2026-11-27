import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas do carregamento inicial em pedaços próprios: cada um fica abaixo de 250 KB e o navegador
        // guarda em cache o que não muda entre deploys (antes tudo vinha num arquivo de ~740 KB).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          if (/node_modules\/(react-router|react-router-dom|@remix-run)\//.test(id)) return "vendor-router";
          if (id.includes("node_modules/@supabase/")) return "vendor-supabase";
          if (/node_modules\/(@radix-ui|@floating-ui)\//.test(id)) return "vendor-radix";
          if (id.includes("node_modules/date-fns/")) return "vendor-date-fns";
          if (/node_modules\/(zod|@tanstack)\//.test(id)) return "vendor-dados";
          // Gráficos (Financeiro, Relatórios, ficha do paciente): a biblioteca e as dependências em dois pedaços
          if (/node_modules\/(recharts|react-smooth|recharts-scale|decimal\.js-light)\//.test(id)) return "vendor-graficos";
          if (/node_modules\/(lodash|d3-[a-z-]+|internmap|fast-equals|eventemitter3|victory-vendor)\//.test(id)) return "vendor-graficos-base";
        },
      },
    },
  },
});
