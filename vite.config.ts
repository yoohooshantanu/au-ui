import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit()
	],
	server: {
		proxy: {
			"/api/pay": {
				target: "http://localhost:5000",
				changeOrigin: true
			}
		}
	}
});
