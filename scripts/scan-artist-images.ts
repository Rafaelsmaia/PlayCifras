/**
 * Lista ficheiros em public/images/artistas e artistas no DB sem imagem.
 * Uso: npx tsx scripts/scan-artist-images.ts
 */
import { prisma } from '../lib/database'
import * as fs from 'fs'
import * as path from 'path'

const DIR = path.join(process.cwd(), 'public', 'images', 'artistas')

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(f))
  const slugsFromFiles = new Set(files.map((f) => f.replace(/\.(jpe?g|png|webp|avif|gif|svg)$/i, '')))

  const artists = await prisma.artist.findMany({
    select: { slug: true, name: true, image: true },
  })
  const noImage = artists.filter((a) => !a.image)
  const withImage = artists.filter((a) => a.image)

  console.log('Ficheiros em artistas/:', files.length, files.join(', '))
  console.log('Artistas no DB:', artists.length, '| com imagem:', withImage.length, '| sem:', noImage.length)

  const missingFileForSlug = noImage.filter((a) => slugsFromFiles.has(a.slug))
  console.log('\nSem image no DB mas existe ficheiro com mesmo slug:', missingFileForSlug.length)
  for (const a of missingFileForSlug) console.log(' ', a.slug)

  const orphanFiles = Array.from(slugsFromFiles).filter(
    (slug) => !artists.some((a) => a.slug === slug)
  )
  console.log('\nFicheiros sem artista no DB (slug):', orphanFiles.join(', ') || '(nenhum)')

  await prisma.$disconnect()
}

main()
