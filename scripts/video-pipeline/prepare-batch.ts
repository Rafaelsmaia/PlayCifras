/**
 * Prepara vários shorts em lote.
 *
 * Uso:
 *   npx tsx scripts/video-pipeline/prepare-batch.ts slug1 slug2 ...
 *   npx tsx scripts/video-pipeline/prepare-batch.ts --artist=fernanda-brum --limit=5
 *   npx tsx scripts/video-pipeline/prepare-batch.ts --artist=fernanda-brum --limit=5 --whisper
 */
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { prisma } from '../../lib/database'

function getArg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : null
}

async function resolveSlugs(): Promise<string[]> {
  const positional = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('-'))
  if (positional.length) return positional

  const artist = getArg('artist')
  const limit = Math.max(1, parseInt(getArg('limit') || '5', 10) || 5)
  if (!artist) {
    console.error(
      'Uso: prepare-batch.ts <slug...>  OU  --artist=<slug> --limit=5 [--whisper]'
    )
    process.exit(1)
  }

  const songs = await prisma.song.findMany({
    where: { isPublic: true, artist: { slug: artist } },
    orderBy: [{ views: 'desc' }, { title: 'asc' }],
    take: limit,
    select: { slug: true, title: true },
  })
  console.log(
    `Artista ${artist}: ${songs.length} músicas`,
    songs.map((s) => s.title)
  )
  return songs.map((s) => s.slug)
}

function runPrepare(slug: string, extra: string[]): Promise<number> {
  return new Promise((resolve) => {
    const args = [
      'tsx',
      'scripts/video-pipeline/prepare-short.ts',
      slug,
      ...extra,
    ]
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function main() {
  const whisper = process.argv.includes('--whisper')
  const duration = getArg('duration')
  const extra = [
    ...(duration ? [`--duration=${duration}`] : ['--duration=40']),
    ...(whisper ? ['--whisper'] : []),
  ]

  const slugs = await resolveSlugs()
  let ok = 0
  let fail = 0
  for (const slug of slugs) {
    console.log(`\n======== ${slug} ========`)
    const code = await runPrepare(slug, extra)
    if (code === 0) ok += 1
    else fail += 1
  }
  console.log('\nBatch concluído.', { ok, fail, total: slugs.length })
  if (fail) process.exitCode = 1
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
