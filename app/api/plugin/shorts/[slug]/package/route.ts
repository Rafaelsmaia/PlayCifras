import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import {
  buildPremiereZip,
  listPremierePackageFiles,
} from '@/lib/video-pipeline/plugin-premiere'

type Ctx = { params: { slug: string } }

/**
 * GET /api/plugin/shorts/:slug/package
 *   ?format=zip   → application/zip (default)
 *   ?format=json  → lista de arquivos + localPaths (mesmo PC)
 */
export async function GET(req: Request, { params }: Ctx) {
  const slug = params.slug
  const url = new URL(req.url)
  const format = url.searchParams.get('format') || 'zip'
  const withIntroOffset = url.searchParams.get('withIntroOffset') === '1'

  try {
    if (format === 'json') {
      const listed = await listPremierePackageFiles(slug)
      return NextResponse.json({
        ok: true,
        slug,
        warning: listed.warning,
        pngCount: listed.pngCount,
        outDir: listed.outDir,
        localPaths: listed.localPaths,
        files: listed.files.map((f) => ({
          relativePath: f.relativePath,
          url: `/api/plugin/shorts/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(f.relativePath)}`,
        })),
      })
    }

    const { zipPath, warning, pngCount, files } = await buildPremiereZip(slug, {
      withIntroOffset,
    })
    const buf = await readFile(zipPath)
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}-premiere.zip"`,
      'Content-Length': String(buf.byteLength),
      'X-PlayCifras-Warning': warning ? encodeURIComponent(warning) : '',
      'X-PlayCifras-Png-Count': String(pngCount),
      'X-PlayCifras-File-Count': String(files.length),
    })
    return new NextResponse(new Uint8Array(buf), { status: 200, headers })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Falha ao gerar pacote Premiere',
      },
      { status: 500 }
    )
  }
}
