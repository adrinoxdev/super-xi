// Uso: node scripts/verify-friendlies/run.mjs [nome ...]   (sem nome: roda todos os que existirem)
// Carrega os .check.ts pelo vite (alias @/ e TypeScript), como scripts/verify-league/run.mjs.
import { createServer } from 'vite'
import { existsSync } from 'node:fs'

const ALL = ['ranking', 'tokens', 'fame', 'draw', 'bots', 'provider', 'store', 'strength', 'prematch']
const wanted = process.argv.slice(2)
const names = wanted.length ? wanted : ALL
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
let failed = 0
try {
  for (const name of names) {
    const file = `scripts/verify-friendlies/${name}.check.ts`
    if (!existsSync(file)) {
      if (wanted.length) {
        console.error(`FALTA ${file}`)
        failed++
      } else console.log(`- ${name}: ainda não existe, pulado`)
      continue
    }
    const mod = await server.ssrLoadModule('/' + file)
    const fails = mod.run()
    if (fails.length) {
      failed += fails.length
      console.error(`FALHOU ${name}:\n  ` + fails.join('\n  '))
    } else console.log(`OK ${name}`)
  }
} finally {
  await server.close()
}
if (failed) process.exitCode = 1
