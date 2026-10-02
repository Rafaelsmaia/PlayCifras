/**
 * Renderiza overlay transparente (ProRes 4444) para Premiere.
 *
 *   npx tsx scripts/video-pipeline/render-overlay.ts <slug>
 *   npx tsx scripts/video-pipeline/render-overlay.ts <slug> --force
 */
import { renderShortOverlay } from '../../lib/video-pipeline/render-overlay'

async function main() {
  const args = process.argv.slice(2)
  const slug = args.find((a) => !a.startsWith('-'))
  if (!slug) {
    console.error('Uso: render-overlay.ts <slug> [--force]')
    process.exit(1)
  }

  const result = await renderShortOverlay(slug, {
    force: args.includes('--force'),
    onLog: (msg) => console.log(msg),
  })

  console.log(
    result.cached
      ? `✓ Cache: ${result.overlayPath}`
      : `✓ Overlay: ${result.overlayPath}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
