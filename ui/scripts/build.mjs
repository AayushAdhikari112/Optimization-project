import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { build } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'dist')
const configPath = path.join(root, 'tsconfig.json')
const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))

const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root)
const program = ts.createProgram(config.fileNames, config.options)
const diagnostics = ts.getPreEmitDiagnostics(program)

if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName: file => file,
    getNewLine: () => ts.sys.newLine,
  }))
  process.exit(1)
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })

await Promise.all([
  build({
    entryPoints: [path.join(root, 'src/main/index.ts')],
    outfile: path.join(output, 'main/index.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  }),
  build({
    entryPoints: [path.join(root, 'src/preload/index.ts')],
    outfile: path.join(output, 'main/preload.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  }),
  build({
    entryPoints: [path.join(root, 'src/renderer/index.ts')],
    outfile: path.join(output, 'renderer/index.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
  }),
  build({
    entryPoints: [path.join(root, 'src/test-bundle.ts')],
    outfile: path.join(output, 'test-lib.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  }),
])

await Promise.all([
  cp(path.join(root, 'src/renderer/index.html'), path.join(output, 'renderer/index.html')),
  cp(path.join(root, 'src/renderer/styles.css'), path.join(output, 'renderer/styles.css')),
  cp(path.join(root, 'catalog'), path.join(output, 'catalog'), { recursive: true }),
])