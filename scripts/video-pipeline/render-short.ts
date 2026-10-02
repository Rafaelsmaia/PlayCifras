/**
 * Copia o short preparado para video-shorts/public/short e renderiza MP4.
 *
 * Uso:
 *   npx tsx scripts/video-pipeline/render-short.ts amo-o-senhor-fernanda-brum
 */
import { cp, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const slug = process.argv.slice(2).find((a) => !a.startsWith('-'))
  if (!slug) {
    console.error('Uso: npx tsx scripts/video-pipeline/render-short.ts <slug>')
    process.exit(1)
  }

  const src = path.join(process.cwd(), 'exports', 'shorts', slug)
  if (!(await exists(path.join(src, 'timeline.json')))) {
    console.error(
      'Short não preparado. Rode: npm run short:prepare --',
      slug
    )
    process.exit(1)
  }

  const dest = path.join(process.cwd(), 'video-shorts', 'public', 'short')
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })

  const outDir = path.join(process.cwd(), 'video-shorts', 'out')
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, `${slug}.mp4`)

  console.log('Render Remotion →', path.relative(process.cwd(), outFile))
  const code: number = await new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'remotion',
        'render',
        'src/index.ts',
        'Short',
        outFile,
      ],
      {
        cwd: path.join(process.cwd(), 'video-shorts'),
        stdio: 'inherit',
        shell: true,
      }
    )
    child.on('close', (c) => resolve(c ?? 1))
  })

  if (code !== 0) process.exit(code)
  console.log('✓', path.relative(process.cwd(), outFile))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
