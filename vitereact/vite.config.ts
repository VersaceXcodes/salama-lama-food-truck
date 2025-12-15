import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import cofounderVitePlugin from "./src/_cofounder/vite-plugin/index";

// https://vitejs.dev/config/
export default defineConfig({
	base: "/", // IMPORTANT: ensures /assets/... absolute paths for nested routes
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
			},
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

		react(),
	],
	server: {
		host: true,
		allowedHosts: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@schema": path.resolve(__dirname, "../backend/schema.ts"),
		},
	},
	build: {
		outDir: "public",
		rollupOptions: {
			output: {
				manualChunks: {
					'vendor': ['react', 'react-dom', 'react-router-dom'],
					'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
					'forms': ['react-hook-form', '@hookform/resolvers'],
					'query': ['@tanstack/react-query'],
					'charts': ['recharts'],
					'state': ['zustand', 'axios'],
					'socket': ['socket.io-client'],
				},
			},
		},
		chunkSizeWarningLimit: 1000,
	},
});
