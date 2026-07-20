/** Serializa SVG → PNG e dispara download no navegador. */

type TextOverlay = {
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  fill: string
  anchor: string
}

function isCustomTitleFont(fontFamilyAttr: string | null): boolean {
  if (!fontFamilyAttr) return false
  return (
    fontFamilyAttr.includes('--font-') ||
    /Nunito|Montserrat|Poppins|Fredoka|Inter|Roboto Mono/i.test(fontFamilyAttr)
  )
}

/**
 * Textos com fonte do next/font (CSS var) não funcionam no SVG isolado
 * (blob → Image → canvas). Extraímos e redesenhamos no canvas com a fonte
 * já carregada na página.
 */
function extractCustomTextOverlays(
  liveSvg: SVGSVGElement,
  clone: SVGSVGElement
): TextOverlay[] {
  const liveTexts = liveSvg.querySelectorAll('text')
  const cloneTexts = clone.querySelectorAll('text')
  const overlays: TextOverlay[] = []

  liveTexts.forEach((el, i) => {
    const target = cloneTexts[i]
    if (!target) return

    const attr = el.getAttribute('font-family')
    const cs = getComputedStyle(el)

    if (isCustomTitleFont(attr)) {
      overlays.push({
        text: el.textContent ?? '',
        x: Number(el.getAttribute('x') || 0),
        y: Number(el.getAttribute('y') || 0),
        fontSize: Number(
          el.getAttribute('font-size') || parseFloat(cs.fontSize) || 13
        ),
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight || '700',
        fill: el.getAttribute('fill') || '#222',
        anchor: el.getAttribute('text-anchor') || 'middle'
      })
      target.textContent = ''
      return
    }

    if (cs.fontFamily) {
      target.setAttribute('font-family', cs.fontFamily)
    }
  })

  return overlays
}

function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: TextOverlay[],
  pixelRatio: number
) {
  for (const o of overlays) {
    if (!o.text) continue
    ctx.font = `${o.fontWeight} ${o.fontSize * pixelRatio}px ${o.fontFamily}`
    ctx.fillStyle = o.fill
    ctx.textAlign =
      o.anchor === 'middle' ? 'center' : o.anchor === 'end' ? 'right' : 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(o.text, o.x * pixelRatio, o.y * pixelRatio)
  }
}

async function ensureFontsLoaded(overlays: TextOverlay[]): Promise<void> {
  await document.fonts.ready
  await Promise.all(
    overlays.map((o) => {
      const spec = `${o.fontWeight} ${o.fontSize}px ${o.fontFamily}`
      return document.fonts.load(spec, o.text || 'Acorde')
    })
  )
}

export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  pixelRatio = 3
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  const overlays = extractCustomTextOverlays(svg, clone)
  await ensureFontsLoaded(overlays)

  const vb = clone.viewBox.baseVal
  const w = vb?.width || svg.clientWidth || Number(svg.getAttribute('width')) || 120
  const h =
    vb?.height || svg.clientHeight || Number(svg.getAttribute('height')) || 160

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(clone)
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Falha ao carregar SVG'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w * pixelRatio))
    canvas.height = Math.max(1, Math.round(h * pixelRatio))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    drawTextOverlays(ctx, overlays, pixelRatio)

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    )
    if (!pngBlob) throw new Error('Falha ao gerar PNG')

    const pngUrl = URL.createObjectURL(pngBlob)
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(pngUrl)
  } finally {
    URL.revokeObjectURL(url)
  }
}
