import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import del from 'rollup-plugin-delete';
import terser from '@rollup/plugin-terser';
import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';

const enteries = ['src/index.ts'];

const plugins = [
	resolve({
		preferBuiltins: true,
		rootDir: 'src',
	}),
	typescript(),
	commonjs(),
	esbuild({
		target: 'node14',
	}),
];

const browserPlugins = [
	resolve({
		rootDir: 'src',
		browser: true,
	}),
	typescript(),
	commonjs(),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
	...enteries.map(input => {
		/** @type {import('rollup').RollupOptions} */
		const config = {
			input,
			output: [
				{
					file: input.replace('src/', 'dist/').replace('.ts', '.mjs'),
					format: 'esm',
				},
				{
					file: input.replace('src/', 'dist/').replace('.ts', '.cjs'),
					format: 'cjs',
				},
			],
			external: ['axios', '@wang-yige/utils'],
			plugins: [del({ targets: ['dist/*'] }), ...plugins],
		};
		return config;
	}),
	...enteries.map(input => {
		/** @type {import('rollup').RollupOptions} */
		const config = {
			input,
			output: [
				{
					file: input.replace('src/', 'dist/').replace('.ts', '.d.mts'),
					format: 'esm',
				},
				{
					file: input.replace('src/', 'dist/').replace('.ts', '.d.cts'),
					format: 'cjs',
				},
				{
					file: input.replace('src/', 'dist/').replace('.ts', '.d.ts'),
					format: 'esm',
				},
			],
			external: ['axios', '@wang-yige/utils'],
			plugins: [typescript(), dts({ respectExternal: true, tsconfig: './tsconfig.json' })],
		};
		return config;
	}),
	...enteries.map(input => {
		/** @type {import('rollup').RollupOptions} */
		const config = {
			input,
			output: {
				name: 'AxiosUeseful',
				file: 'dist/axios-useful.min.js',
				format: 'iife',
			},
			external: ['util', 'stream', 'path', 'http', 'https', 'url', 'fs', 'assert', 'tty', 'zlib', 'events'],
			plugins: [
				...browserPlugins,
				terser({
					module: false,
					compress: {
						ecma: 2015,
						pure_getters: true,
					},
					safari10: true,
				}),
			],
		};
		return config;
	}),
];
