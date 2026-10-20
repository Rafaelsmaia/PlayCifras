/**
 * Ajudante de render PlayCifras: servidor local (porta 3917) que renderiza os overlays
 * do plugin do Premiere (Remotion → ProRes 4444 com alpha): troca animada de diagramas,
 * letra com cifras, tablatura (casas branco→roxo) e ritmo (setas) como PNG transparente.
 * Digitações vêm do site (/api/plugin/chord-shapes); nada de banco aqui.
 */
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { appendFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { ensureBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer'

const HELPER_VERSION = 5
/** Mude quando o visual da composição mudar (invalida o cache). */
const RENDER_VERSION = 8
const PORT = Number(process.env.PLAYCIFRAS_HELPER_PORT || 3917)
const DEFAULT_SITE = 'https://playcifras.vercel.app'
/** Tempo antes do 1º marcador para o card entrar. */
const LEAD_IN_SEC = 0.6

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR =
  process.env.PLAYCIFRAS_OVERLAY_DIR ||
  path.join(os.homedir(), 'Documents', 'PlayCifras', 'Overlays')
const LOG_FILE = path.join(ROOT, 'helper', 'helper.log')

/** Progresso do render atual — o plugin consulta em GET /progress. */
const progressState = { busy: false, percent: 0, phase: '', label: '' }

function setProgress(partial) {
  Object.assign(progressState, partial)
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stdout.write(line)
  appendFile(LOG_FILE, line).catch(() => {})
}

let serveUrlPromise = null
function getServeUrl() {
  if (!serveUrlPromise) {
    log('Montando composição Remotion…')
    serveUrlPromise = bundle({
      entryPoint: path.join(ROOT, 'src', 'diagram-index.ts'),
      publicDir: path.join(ROOT, 'public'),
    })
      .then((url) => {
        log('Composição pronta.')
        return url
      })
      .catch((err) => {
        serveUrlPromise = null
        throw err
      })
  }
  return serveUrlPromise
}

/** Um render por vez (Remotion já usa todos os núcleos). */
let queue = Promise.resolve()
function enqueue(fn) {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

async function exists(p) {
  try {
    return (await stat(p)).size > 0
  } catch {
    return false
  }
}

function safeSlug(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'diagramas'
}

async function fetchShapes(siteUrl, chords) {
  const res = await fetch(`${siteUrl}/api/plugin/chord-shapes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chords }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Site respondeu HTTP ${res.status}`)
  return { shapes: data.shapes || {}, missing: data.missing || [] }
}

const round3 = (n) => Math.round(n * 1000) / 1000

/** Quadro da sequência do Premiere (padrão 1080×1920 para plugins antigos). */
function frameSize(body) {
  const clamp = (n, fallback) => {
    const v = Math.round(Number(n))
    return Number.isFinite(v) && v >= 240 && v <= 4096 ? v : fallback
  }
  return { width: clamp(body.width, 1080), height: clamp(body.height, 1920) }
}

/** Overlay começa LEAD_IN antes do 1º evento; tempos ficam relativos a esse início. */
function timing(body, events) {
  const fps = Math.min(60, Math.max(12, Math.round(Number(body.fps) || 24)))
  const startSec = Math.max(0, events[0].t - LEAD_IN_SEC)
  const lastRel = events[events.length - 1].t - startSec
  const durationSec = round3(Math.max(Number(body.endSec) - startSec || 0, lastRel + 1))
  return { fps, startSec, durationSec }
}

async function renderDiagrams(body) {
  const siteUrl = String(body.siteUrl || DEFAULT_SITE).replace(/\/$/, '')
  const marks = (Array.isArray(body.marks) ? body.marks : [])
    .map((m) => ({ t: Number(m.t), chord: String(m.chord || '').trim() }))
    .filter((m) => Number.isFinite(m.t) && m.chord)
    .sort((a, b) => a.t - b.t)
  if (!marks.length) throw new Error('Nenhum marcador com acorde')

  const { fps, startSec, durationSec } = timing(body, marks)
  const relMarks = marks.map((m) => ({ t: round3(m.t - startSec), chord: m.chord }))
  const { shapes, missing } = await fetchShapes(
    siteUrl,
    Array.from(new Set(marks.map((m) => m.chord)))
  )
  const props = { marks: relMarks, shapes, durationSec, fps, ...frameSize(body) }
  const result = await renderOverlay({
    compositionId: 'DiagramOverlay',
    props,
    slug: body.slug,
    force: body.force,
    label: `${marks.length} acordes`,
  })
  return { ...result, startSec, durationSec, missingChords: missing }
}

async function renderLyrics(body) {
  const screens = (Array.isArray(body.screens) ? body.screens : [])
    .map((s) => ({
      t: Number(s.t),
      lines: (Array.isArray(s.lines) ? s.lines : []).slice(0, 4).map((l) => ({
        text: String(l.text || ''),
        chords: (Array.isArray(l.chords) ? l.chords : [])
          .map((c) => ({ chord: String(c.chord || '').trim(), at: Math.max(0, Number(c.at) || 0) }))
          .filter((c) => c.chord),
      })),
    }))
    .filter((s) => Number.isFinite(s.t))
    .sort((a, b) => a.t - b.t)
  if (!screens.some((s) => s.lines.length)) throw new Error('Nenhuma tela com letra')

  const { fps, startSec, durationSec } = timing(body, screens)
  const props = {
    screens: screens.map((s) => ({ t: round3(s.t - startSec), lines: s.lines })),
    durationSec,
    fps,
    ...frameSize(body),
  }
  const result = await renderOverlay({
    compositionId: 'LyricsOverlay',
    props,
    slug: `${safeSlug(body.slug)}-letra`,
    force: body.force,
    label: `${screens.length} telas`,
  })
  return { ...result, startSec, durationSec }
}

/** Imagem estática (PNG transparente) com o rótulo e as setas da batida. */
async function renderRhythm(body) {
  const strokes = (Array.isArray(body.strokes) ? body.strokes : [])
    .filter((s) => s === 'down' || s === 'up')
    .slice(0, 16)
  if (!strokes.length) throw new Error('Monte o ritmo com pelo menos uma seta')
  const cy = Number(body.centerY)
  const props = {
    strokes,
    label: String(body.label ?? 'Ritmo:').slice(0, 40),
    centerY: Number.isFinite(cy) ? Math.min(0.95, Math.max(0.05, cy)) : undefined,
    ...frameSize(body),
  }
  return renderOverlay({
    compositionId: 'RhythmOverlay',
    props,
    slug: 'ritmo',
    force: body.force,
    label: `${strokes.length} setas`,
    still: true,
  })
}

/** Tablatura animada: casas passam de branco para roxo conforme os marks. */
async function renderTab(body) {
  const columns = (Array.isArray(body.columns) ? body.columns : [])
    .map((col) =>
      (Array.isArray(col) ? col : []).slice(0, 6).map((v) => {
        if (v == null || v === '') return null
        const n = Number(v)
        return Number.isFinite(n) ? Math.trunc(n) : null
      })
    )
    .filter((col) => col.length > 0)
  if (!columns.length) throw new Error('Nenhuma coluna de tablatura')

  const chords = Array.isArray(body.chords)
    ? body.chords.map((c) => String(c || '').slice(0, 12))
    : []

  const marks = (Array.isArray(body.marks) ? body.marks : [])
    .map((m) => ({ t: Number(m.t), col: Math.max(0, Math.floor(Number(m.col))) }))
    .filter((m) => Number.isFinite(m.t) && m.col < columns.length)
    .sort((a, b) => a.t - b.t)
  if (!marks.length) throw new Error('Nenhum marcador de tempo para a tab')

  const { fps, startSec, durationSec } = timing(body, marks)
  const cy = Number(body.centerY)
  const frame = frameSize(body)
  const u = Math.min(frame.width, frame.height) / 1080
  const even = (n) => Math.max(2, Math.round(n / 2) * 2)
  const staffW = Math.ceil((14 * 2 + 22) * u + columns.length * 34 * u + 28 * u + 48 * u)
  const width = even(Math.min(16384, Math.max(frame.width, staffW)))
  const props = {
    columns,
    chords,
    marks: marks.map((m) => ({ t: round3(m.t - startSec), col: m.col })),
    durationSec,
    fps,
    centerY: Number.isFinite(cy) ? Math.min(0.95, Math.max(0.05, cy)) : undefined,
    layoutWidth: frame.width,
    width,
    height: frame.height,
  }
  const result = await renderOverlay({
    compositionId: 'TabOverlay',
    props,
    slug: `${safeSlug(body.slug)}-tab`,
    force: body.force,
    label: `${marks.length} notas`,
  })
  return { ...result, startSec, durationSec }
}

async function renderOverlay({ compositionId, props, slug, force, label, still = false }) {
  const hash = createHash('sha1')
    .update(JSON.stringify({ v: RENDER_VERSION, id: compositionId, props }))
    .digest('hex')
    .slice(0, 10)

  await mkdir(OUT_DIR, { recursive: true })
  const fileName = `${safeSlug(slug)}-${hash}.${still ? 'png' : 'mov'}`
  const overlayPath = path.join(OUT_DIR, fileName)
  const result = { overlayPath, fileName }

  setProgress({ busy: true, percent: 0, phase: 'preparando', label: String(label || '') })

  if (!force && (await exists(overlayPath))) {
    log(`Cache: ${fileName}`)
    setProgress({ busy: false, percent: 100, phase: 'cache', label: String(label || '') })
    return { ...result, cached: true }
  }

  setProgress({ busy: true, percent: 2, phase: 'preparando', label: String(label || '') })
  const serveUrl = await getServeUrl()
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: props,
  })
  const t0 = Date.now()
  if (still) {
    log(`Renderizando ${fileName} (${label}, ${props.width}×${props.height})…`)
    setProgress({ busy: true, percent: 40, phase: 'renderizando', label: String(label || '') })
    await renderStill({
      composition,
      serveUrl,
      inputProps: props,
      frame: 0,
      imageFormat: 'png',
      overwrite: true,
      output: overlayPath,
    })
    log(`Pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s: ${overlayPath}`)
    setProgress({ busy: false, percent: 100, phase: 'pronto', label: String(label || '') })
    return { ...result, cached: false }
  }
  log(`Renderizando ${fileName} (${props.durationSec}s, ${label}, ${props.width}×${props.height})…`)
  setProgress({ busy: true, percent: 5, phase: 'renderizando', label: String(label || '') })
  await renderMedia({
    composition,
    serveUrl,
    inputProps: props,
    codec: 'prores',
    proResProfile: '4444',
    imageFormat: 'png',
    pixelFormat: 'yuva444p10le',
    muted: true,
    overwrite: true,
    outputLocation: overlayPath,
    onProgress: ({ progress }) => {
      const pct = Math.max(5, Math.min(99, Math.round(Number(progress) * 100)))
      setProgress({ busy: true, percent: pct, phase: 'renderizando', label: String(label || '') })
    },
  })
  log(`Pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s: ${overlayPath}`)
  setProgress({ busy: false, percent: 100, phase: 'pronto', label: String(label || '') })
  return { ...result, cached: false }
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) reject(new Error('Pedido grande demais'))
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('JSON inválido'))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') return send(res, 204, {})

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, version: HELPER_VERSION, outDir: OUT_DIR })
  }

  if (req.method === 'GET' && url.pathname === '/progress') {
    return send(res, 200, { ok: true, ...progressState })
  }

  const routes = {
    '/render-diagrams': renderDiagrams,
    '/render-lyrics': renderLyrics,
    '/render-rhythm': renderRhythm,
    '/render-tab': renderTab,
  }
  if (req.method === 'POST' && routes[url.pathname]) {
    try {
      const body = await readJson(req)
      const result = await enqueue(async () => {
        try {
          return await routes[url.pathname](body)
        } catch (err) {
          setProgress({
            busy: false,
            percent: 0,
            phase: 'erro',
            label: err instanceof Error ? err.message : String(err),
          })
          throw err
        }
      })
      return send(res, 200, { ok: true, ...result })
    } catch (err) {
      log(`Erro: ${err && err.stack ? err.stack : err}`)
      return send(res, 500, { error: err instanceof Error ? err.message : String(err) })
    }
  }

  send(res, 404, { error: 'Rota não encontrada' })
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log(`Porta ${PORT} ocupada — o ajudante provavelmente já está rodando.`)
    process.exit(0)
  }
  log(`Falha no servidor: ${err.message}`)
  process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
  log(`Ajudante PlayCifras v${HELPER_VERSION} em http://localhost:${PORT} · saída: ${OUT_DIR}`)
  ensureBrowser()
    .then(() => getServeUrl())
    .catch((err) => log(`Aquecimento falhou: ${err.message}`))
})
