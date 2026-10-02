// Reads the Lighthouse CI runs in `.lighthouseci/<profile>/`, keeps the median (representative) run of each page and
// profile, copies its HTML and JSON reports to `lighthouse/` (versioned) and writes `lighthouse/RESULTS.md` with the
// scores, metrics, tool versions, environment and run conditions. Also prints the table.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'lighthouse'
const PAGES = { '/': 'home', '/nfts/nft-1': 'detail' }

const rows = []
const environments = new Map()

for (const profile of ['desktop', 'mobile']) {
  const dir = join('.lighthouseci', profile)
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) continue
  const runs = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const entry of runs.filter((run) => run.isRepresentativeRun)) {
    const report = JSON.parse(readFileSync(entry.jsonPath, 'utf8'))
    const path = new URL(entry.url).pathname
    const name = `${profile}-${PAGES[path] ?? path.replace(/\W+/g, '-')}`
    const score = (id) => Math.round(report.categories[id].score * 100)
    const metric = (id) => report.audits[id].displayValue
    rows.push({
      perfil: profile,
      página: path,
      Performance: score('performance'),
      Acessibilidade: score('accessibility'),
      'Boas práticas': score('best-practices'),
      SEO: score('seo'),
      LCP: metric('largest-contentful-paint'),
      CLS: metric('cumulative-layout-shift'),
      TBT: metric('total-blocking-time'),
      relatório: name,
      execuções: runs.filter((run) => run.url === entry.url).length,
    })
    const { throttling, screenEmulation, formFactor, throttlingMethod } = report.configSettings
    environments.set(profile, {
      lighthouse: report.lighthouseVersion,
      browser: report.environment.hostUserAgent,
      benchmarkIndex: report.environment.benchmarkIndex,
      formFactor,
      screen: `${screenEmulation.width}×${screenEmulation.height} @${screenEmulation.deviceScaleFactor}x`,
      throttling: `${throttlingMethod}: RTT ${throttling.rttMs} ms, ${Math.round(throttling.throughputKbps)} kbps, CPU ${throttling.cpuSlowdownMultiplier}×`,
      fetchTime: report.fetchTime,
    })
    rows.at(-1).files = [entry.htmlPath, entry.jsonPath]
  }
}

if (rows.length === 0) {
  console.log('Nenhum resultado. Rode `pnpm lighthouse` antes.')
  process.exit(0)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const row of rows) {
  const [html, json] = row.files
  copyFileSync(html, join(OUT, `${row.relatório}.report.html`))
  copyFileSync(json, join(OUT, `${row.relatório}.report.json`))
  delete row.files
}

const table = [
  '| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Relatório |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(
    (row) =>
      `| ${row.perfil} | \`${row.página}\` | ${row.Performance} | ${row.Acessibilidade} | ${row['Boas práticas']} | ${row.SEO} | ${row.LCP} | ${row.CLS} | ${row.TBT} | [HTML](${row.relatório}.report.html) · [JSON](${row.relatório}.report.json) |`,
  ),
]
const envLines = [...environments].map(
  ([profile, env]) =>
    `- **${profile}:** Lighthouse ${env.lighthouse}; ${env.browser}; tela ${env.screen} (${env.formFactor}); ${env.throttling}; benchmark index ${env.benchmarkIndex}; medido em ${env.fetchTime}.`,
)
const lhciVersion = JSON.parse(readFileSync('node_modules/@lhci/cli/package.json', 'utf8')).version
const nodeVersion = process.version

writeFileSync(
  join(OUT, 'RESULTS.md'),
  `# Lighthouse

Mediana de ${rows[0].execuções} execuções por página e perfil (\`pnpm lighthouse\`), no build de produção (\`pnpm build && pnpm preview\`) com o cenário padrão dos mocks.
Cada linha é a execução representativa (mediana) escolhida pelo Lighthouse CI; os relatórios completos estão ao lado.

${table.join('\n')}

## Ferramentas e ambiente

- Lighthouse CI ${lhciVersion}, Node ${nodeVersion}, ${process.platform}/${process.arch}.
${envLines.join('\n')}

## Condições

- Servidor local (\`vite preview\` em 127.0.0.1:4318), sem rede externa: imagens, fontes e scripts vêm do próprio build.
- MSW ativo e com o estado limpo (cada execução abre um perfil novo do Chrome); o tempo real conecta normalmente.
- Desktop usa o preset \`desktop\` do Lighthouse; mobile usa a emulação e o throttling padrão (Moto G Power, 4G lento, CPU 4×).
`,
)

console.table(rows)
console.log(`Relatórios medianos e RESULTS.md gravados em ${OUT}/`)
