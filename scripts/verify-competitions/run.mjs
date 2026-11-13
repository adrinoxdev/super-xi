import { createServer } from 'vite'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const [mode = 'check', file = 'scripts/verify-competitions/baseline.json'] = process.argv.slice(2)
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error'
})
try {
  const mod = await server.ssrLoadModule('/scripts/verify-competitions/harness.ts')
  const out = JSON.stringify(mod.run(), null, 1)
  if (mode === 'write') {
    writeFileSync(file, out)
    console.log(`baseline gravada em ${file} (${out.length} bytes)`)
  } else {
    if (!existsSync(file)) throw new Error(`baseline ausente: ${file}`)
    if (readFileSync(file, 'utf8') === out) console.log('OK: saida identica a baseline')
    else {
      const actual = file.replace(/\.json$/, '.actual.json')
      writeFileSync(actual, out)
      console.error(`DIFERENTE da baseline. Compare: git diff --no-index ${file} ${actual}`)
      process.exitCode = 1
    }
  }
} finally {
  await server.close()
}
