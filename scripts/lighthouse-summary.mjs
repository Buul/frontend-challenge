// Prints the median (representative) run of each audited page per profile, from `.lighthouseci/<profile>/manifest.json`.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const rows = []
for (const profile of ['desktop', 'mobile']) {
  const dir = join('.lighthouseci', profile)
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) continue
  for (const entry of JSON.parse(readFileSync(manifestPath, 'utf8')).filter((run) => run.isRepresentativeRun)) {
    const report = JSON.parse(readFileSync(entry.jsonPath, 'utf8'))
    const score = (id) => Math.round(report.categories[id].score * 100)
    const metric = (id) => report.audits[id].displayValue
    rows.push({
      perfil: profile,
      página: new URL(entry.url).pathname,
      Performance: score('performance'),
      Acessibilidade: score('accessibility'),
      'Boas práticas': score('best-practices'),
      SEO: score('seo'),
      LCP: metric('largest-contentful-paint'),
      CLS: metric('cumulative-layout-shift'),
      TBT: metric('total-blocking-time'),
    })
  }
}

if (rows.length === 0) console.log('Nenhum resultado. Rode `pnpm lighthouse` antes.')
else console.table(rows)
