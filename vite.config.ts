import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss()
	],
	server: {
		proxy: {
			'/api': {
				target: 'http://10.59.51.124:8090/',
				changeOrigin: true,
				secure: false,
				rejectUnauthorized: false
			}
		}
	}
});
