/**
 * Lê arquivos em public/images/artistas e define Artist.image como /images/artistas/<arquivo>.
 * O nome do arquivo (sem extensão) deve ser igual ao slug do artista no banco.
 *
 * Uso: npx tsx scripts/match-artist-images.ts
 */
import { prisma } from '../lib/database'
import * as fs from 'fs'
import * as path from 'path'

const DIR = path.join(process.cwd(), 'public', 'images', 'artistas')
const PREFIX = '/images/artistas'

function slugFromFile(file: string): string {
  return file.replace(/\.(jpe?g|png|webp|avif|gif)$/i, '')
}

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))

  for (const file of files) {
    const slug = slugFromFile(file)
    const image = `${PREFIX}/${file}`

    const updated = await prisma.artist.updateMany({
      where: { slug },
      data: { image }
    })

    if (updated.count === 0) {
      console.warn(`Nenhum artista com slug "${slug}" (arquivo: ${file})`)
      continue
    }

    console.log(`${slug} -> ${image}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
