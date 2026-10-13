import { build } from 'esbuild'
import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

const EXTERNAL_DEPS = [
	'@hapi/boom',
	'async-mutex',
	'libsignal',
	'lru-cache',
	'music-metadata',
	'p-queue',
	'pino',
	'protobufjs',
	'protobufjs/*',
	'ws',
	// Optional peer dependencies
	'audio-decode',
	'jimp',
	'link-preview-js',
	'sharp'
]

async function buildCjs() {
	console.log('Building CommonJS bundle (lib/index.cjs)...')

	// 1. Build lib/index.cjs
	await build({
		entryPoints: [join(ROOT_DIR, 'src/index.ts')],
		bundle: true,
		platform: 'node',
		target: 'node18',
		format: 'cjs',
		sourcemap: true,
		outfile: join(ROOT_DIR, 'lib/index.cjs'),
		external: EXTERNAL_DEPS,
		footer: {
			js: 'module.exports = Object.assign(module.exports.default || module.exports.makeWASocket, module.exports);'
		}
	})

	console.log('Building WAProto CommonJS bundle (WAProto/index.cjs)...')

	// 2. Build WAProto/index.cjs
	await build({
		entryPoints: [join(ROOT_DIR, 'WAProto/index.js')],
		bundle: true,
		platform: 'node',
		target: 'node18',
		format: 'cjs',
		sourcemap: false,
		outfile: join(ROOT_DIR, 'WAProto/index.cjs'),
		external: ['protobufjs', 'protobufjs/*'],
		footer: {
			js: 'module.exports = Object.assign(module.exports.default || module.exports.proto || {}, module.exports);'
		}
	})

	// 3. Generate TypeScript declaration for CJS (lib/index.d.cts)
	console.log('Generating lib/index.d.cts...')
	const indexDtsContent = `export * from './index.js';
import makeWASocket from './index.js';
export type WASocket = import('./index.js').WASocket;
export { makeWASocket };
export default makeWASocket;
`
	writeFileSync(join(ROOT_DIR, 'lib/index.d.cts'), indexDtsContent)

	// 4. Generate WAProto declaration for CJS if needed
	const waProtoDcts = `export * from './index.js';
import proto from './index.js';
export { proto };
export default proto;
`
	writeFileSync(join(ROOT_DIR, 'WAProto/index.d.cts'), waProtoDcts)

	console.log('✓ CommonJS build completed successfully!')
}

buildCjs().catch(err => {
	console.error('Failed to build CommonJS bundle:', err)
	process.exit(1)
})
