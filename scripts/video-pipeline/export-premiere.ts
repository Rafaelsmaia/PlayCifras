/**
 * CLI: pacote Premiere (cifras + diagramas, sem áudio).
 *
 *   npx tsx scripts/video-pipeline/export-premiere.ts <slug>
 *   npx tsx scripts/video-pipeline/export-premiere.ts <slug> --with-intro-offset
 */
import path from 'node:path'
import { exportPremierePackage } from '../../lib/video-pipeline/export-premiere-package'

async function main() {
  const slug = process.argv.slice(2).find((a) => !a.startsWith('-'))
  if (!slug) {
    console.error(
      'Uso: export-premiere.ts <slug> [--with-intro-offset]'
    )
    process.exit(1)
  }

  const result = await exportPremierePackage(slug, {
    withIntroOffset: process.argv.includes('--with-intro-offset'),
  })

  console.log(
    '✓ Pacote Premiere (sem áudio):',
    path.relative(process.cwd(), result.outDir)
  )
  console.log(
    result.relative
      ? '  tempos: relativos ao short'
      : `  tempos: +intro ${result.offset}s`
  )
  if (result.warning) console.warn('  ⚠', result.warning)
  console.log(
    `  SRT + markers + ${result.pngCount} diagramas → premiere/`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
