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
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
				secure: false,
			},
			"/storage": {
				target: "http://localhost:3000",
				changeOrigin: true,
				secure: false,
			},
			"/socket.io": {
				target: "http://localhost:3000",
				ws: true,
				changeOrigin: true,
				secure: false,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	publicDir: "public_assets",
	build: {
		outDir: "public",
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('@radix-ui')) {
							return 'radix';
						}
						if (id.includes('lucide-react')) {
							return 'icons';
						}
						if (id.includes('framer-motion')) {
							return 'framer';
						}
						if (id.includes('recharts')) {
							return 'charts';
						}
						if (id.includes('date-fns')) {
							return 'utils';
						}
						if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
							return 'vendor';
						}
					}
				},
			},
		},
		chunkSizeWarningLimit: 1000,
	},
});
