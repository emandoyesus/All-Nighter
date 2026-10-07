import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const base = (process.env.BASE_PATH ?? '').trim();
const safeBase = base === '' ? '' : (base.startsWith('/') ? base : `/${base}`);

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			paths: { base: safeBase as "" | `/${string}` }
		})
	]
});
