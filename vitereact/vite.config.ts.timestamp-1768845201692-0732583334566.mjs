// vite.config.ts
import path from "path";
import { defineConfig } from "file:///app/vitereact/node_modules/vite/dist/node/index.js";
import react from "file:///app/vitereact/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "/app/vitereact";
var vite_config_default = defineConfig({
  base: "/",
  // IMPORTANT: ensures /assets/... absolute paths for nested routes
  plugins: [
    // webcontainers stuff
    {
      name: "isolation",
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
          next();
        });
      }
    },
    // pre transform ; to replace/inject <GenUi*> to allow editing ui - COMMENTED OUT
    /*
    {
    	name: "cofounderVitePluginPre",
    	async transform(code, id) {
    		return await cofounderVitePlugin.pre({
    			code,
    			path: id,
    		});
    	},
    	enforce: "pre", // ensure this plugin runs before other transformations
    },
    */
    react()
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false
      },
      "/storage": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  publicDir: "public_assets",
  build: {
    outDir: "public",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": ["react", "react-dom", "react-router-dom"],
          "ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select"],
          "forms": ["react-hook-form", "@hookform/resolvers"],
          "query": ["@tanstack/react-query"],
          "charts": ["recharts"],
          "state": ["zustand", "axios"],
          "socket": ["socket.io-client"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwL3ZpdGVyZWFjdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2FwcC92aXRlcmVhY3Qvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2FwcC92aXRlcmVhY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbi8vIGltcG9ydCBjb2ZvdW5kZXJWaXRlUGx1Z2luIGZyb20gXCIuL3NyYy9fY29mb3VuZGVyL3ZpdGUtcGx1Z2luL2luZGV4XCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRiYXNlOiBcIi9cIiwgLy8gSU1QT1JUQU5UOiBlbnN1cmVzIC9hc3NldHMvLi4uIGFic29sdXRlIHBhdGhzIGZvciBuZXN0ZWQgcm91dGVzXG5cdHBsdWdpbnM6IFtcblx0XHQvLyB3ZWJjb250YWluZXJzIHN0dWZmXG5cdFx0e1xuXHRcdFx0bmFtZTogXCJpc29sYXRpb25cIixcblx0XHRcdGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcblx0XHRcdFx0c2VydmVyLm1pZGRsZXdhcmVzLnVzZSgoX3JlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkNyb3NzLU9yaWdpbi1PcGVuZXItUG9saWN5XCIsIFwic2FtZS1vcmlnaW5cIik7XG5cdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkNyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3lcIiwgXCJjcmVkZW50aWFsbGVzc1wiKTtcblx0XHRcdFx0XHRuZXh0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHR9LFxuXHRcdC8vIHByZSB0cmFuc2Zvcm0gOyB0byByZXBsYWNlL2luamVjdCA8R2VuVWkqPiB0byBhbGxvdyBlZGl0aW5nIHVpIC0gQ09NTUVOVEVEIE9VVFxuXHRcdC8qXG5cdFx0e1xuXHRcdFx0bmFtZTogXCJjb2ZvdW5kZXJWaXRlUGx1Z2luUHJlXCIsXG5cdFx0XHRhc3luYyB0cmFuc2Zvcm0oY29kZSwgaWQpIHtcblx0XHRcdFx0cmV0dXJuIGF3YWl0IGNvZm91bmRlclZpdGVQbHVnaW4ucHJlKHtcblx0XHRcdFx0XHRjb2RlLFxuXHRcdFx0XHRcdHBhdGg6IGlkLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRlbmZvcmNlOiBcInByZVwiLCAvLyBlbnN1cmUgdGhpcyBwbHVnaW4gcnVucyBiZWZvcmUgb3RoZXIgdHJhbnNmb3JtYXRpb25zXG5cdFx0fSxcblx0XHQqL1xuXG5cdFx0cmVhY3QoKSxcblx0XSxcblx0c2VydmVyOiB7XG5cdFx0aG9zdDogdHJ1ZSxcblx0XHRhbGxvd2VkSG9zdHM6IHRydWUsXG5cdFx0cHJveHk6IHtcblx0XHRcdFwiL2FwaVwiOiB7XG5cdFx0XHRcdHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIixcblx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxuXHRcdFx0XHRzZWN1cmU6IGZhbHNlLFxuXHRcdFx0fSxcblx0XHRcdFwiL3N0b3JhZ2VcIjoge1xuXHRcdFx0XHR0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAwXCIsXG5cdFx0XHRcdGNoYW5nZU9yaWdpbjogdHJ1ZSxcblx0XHRcdFx0c2VjdXJlOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0XHRcIi9zb2NrZXQuaW9cIjoge1xuXHRcdFx0XHR0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAwXCIsXG5cdFx0XHRcdHdzOiB0cnVlLFxuXHRcdFx0XHRjaGFuZ2VPcmlnaW46IHRydWUsXG5cdFx0XHRcdHNlY3VyZTogZmFsc2UsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0sXG5cdHJlc29sdmU6IHtcblx0XHRhbGlhczoge1xuXHRcdFx0XCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG5cdFx0fSxcblx0fSxcblx0cHVibGljRGlyOiBcInB1YmxpY19hc3NldHNcIixcblx0YnVpbGQ6IHtcblx0XHRvdXREaXI6IFwicHVibGljXCIsXG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0b3V0cHV0OiB7XG5cdFx0XHRcdG1hbnVhbENodW5rczoge1xuXHRcdFx0XHRcdCd2ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG5cdFx0XHRcdFx0J3VpJzogWydAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JywgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnXSxcblx0XHRcdFx0XHQnZm9ybXMnOiBbJ3JlYWN0LWhvb2stZm9ybScsICdAaG9va2Zvcm0vcmVzb2x2ZXJzJ10sXG5cdFx0XHRcdFx0J3F1ZXJ5JzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcblx0XHRcdFx0XHQnY2hhcnRzJzogWydyZWNoYXJ0cyddLFxuXHRcdFx0XHRcdCdzdGF0ZSc6IFsnenVzdGFuZCcsICdheGlvcyddLFxuXHRcdFx0XHRcdCdzb2NrZXQnOiBbJ3NvY2tldC5pby1jbGllbnQnXSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fSxcblx0XHRjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG5cdH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNE4sT0FBTyxVQUFVO0FBQzdPLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUZsQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMzQixNQUFNO0FBQUE7QUFBQSxFQUNOLFNBQVM7QUFBQTtBQUFBLElBRVI7QUFBQSxNQUNDLE1BQU07QUFBQSxNQUNOLGdCQUFnQixRQUFRO0FBQ3ZCLGVBQU8sWUFBWSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVM7QUFDM0MsY0FBSSxVQUFVLDhCQUE4QixhQUFhO0FBQ3pELGNBQUksVUFBVSxnQ0FBZ0MsZ0JBQWdCO0FBQzlELGVBQUs7QUFBQSxRQUNOLENBQUM7QUFBQSxNQUNGO0FBQUEsSUFDRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFlQSxNQUFNO0FBQUEsRUFDUDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLElBQ2QsT0FBTztBQUFBLE1BQ04sUUFBUTtBQUFBLFFBQ1AsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Q7QUFBQSxNQUNBLFlBQVk7QUFBQSxRQUNYLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNUO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixJQUFJO0FBQUEsUUFDSixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVDtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixPQUFPO0FBQUEsTUFDTixLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDckM7QUFBQSxFQUNEO0FBQUEsRUFDQSxXQUFXO0FBQUEsRUFDWCxPQUFPO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDZCxRQUFRO0FBQUEsUUFDUCxjQUFjO0FBQUEsVUFDYixVQUFVLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ25ELE1BQU0sQ0FBQywwQkFBMEIsaUNBQWlDLHdCQUF3QjtBQUFBLFVBQzFGLFNBQVMsQ0FBQyxtQkFBbUIscUJBQXFCO0FBQUEsVUFDbEQsU0FBUyxDQUFDLHVCQUF1QjtBQUFBLFVBQ2pDLFVBQVUsQ0FBQyxVQUFVO0FBQUEsVUFDckIsU0FBUyxDQUFDLFdBQVcsT0FBTztBQUFBLFVBQzVCLFVBQVUsQ0FBQyxrQkFBa0I7QUFBQSxRQUM5QjtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN4QjtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
