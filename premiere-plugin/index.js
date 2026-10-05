/**
 * Painel UXP PlayCifras para Adobe Premiere (25.6+).
 * Diagramas: troca animada de acordes cronometrada por marcadores (ou BPM).
 * Shorts: overlay Remotion (ProRes alpha) na timeline + pacote SRT/PNG.
 */
const uxp = require('uxp')
const { entrypoints, storage } = uxp
const localFileSystem = storage.localFileSystem
const premierepro = require('premierepro')

const SETTINGS_KEY = 'playcifras.apiUrl'
const DEFAULT_API = 'http://localhost:3000'
const SITE_KEY = 'playcifras.siteUrl'
const DEFAULT_SITE = 'https://playcifras.vercel.app'
const HELPER_KEY = 'playcifras.helperUrl'
/** 127.0.0.1 e não localhost: o ajudante só escuta em IPv4. */
const DEFAULT_HELPER = 'http://127.0.0.1:3917'

/** @type {{ slug: string, title: string, artist: string, durationSec: number, synced: boolean, lyricCount: number, chordCount: number, diagramCount: number, warning?: string }[]} */
let shorts = []
/** @type {typeof shorts[0] | null} */
let selected = null
let uiReady = false
let memoryApiUrl = DEFAULT_API
let busy = false

function $(id) {
  return document.getElementById(id)
}

function getApiUrl() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(SETTINGS_KEY) || DEFAULT_API
    }
  } catch {
    /* ignore */
  }
  return memoryApiUrl || DEFAULT_API
}

function setApiUrl(url) {
  const clean = (url || DEFAULT_API).trim().replace(/\/$/, '')
  memoryApiUrl = clean
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, clean)
    }
  } catch {
    /* ignore */
  }
  return clean
}

function setStatus(msg) {
  const el = $('status')
  if (el) el.textContent = msg || ''
}

function setBusy(on) {
  busy = on
  const overlayBtn = $('btn-overlay')
  const importBtn = $('btn-import')
  if (overlayBtn) overlayBtn.disabled = on || !selected
  if (importBtn) importBtn.disabled = on || !selected
}

function showSettings(show) {
  $('view-settings').classList.toggle('hidden', !show)
  $('view-app').classList.toggle('hidden', show)
  if (show) {
    $('api-url').value = getApiUrl()
    $('site-url').value = getSiteUrl()
    $('helper-url').value = getHelperUrl()
  }
}

function readUrlSetting(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function writeUrlSetting(key, value, fallback) {
  const clean = (value || fallback).trim().replace(/\/$/, '')
  try {
    localStorage.setItem(key, clean)
  } catch {
    /* ignore */
  }
}

function getSiteUrl() {
  return readUrlSetting(SITE_KEY, DEFAULT_SITE)
}

function getHelperUrl() {
  return readUrlSetting(HELPER_KEY, DEFAULT_HELPER)
}

function showDetail(item) {
  selected = item
  const box = $('detail')
  if (!item) {
    box.classList.add('hidden')
    return
  }
  box.classList.remove('hidden')
  $('detail-title').textContent = item.title
  $('detail-meta').textContent = [
    item.artist,
    `${item.lyricCount} letras`,
    `${item.chordCount} acordes`,
    `${item.diagramCount} diagramas`,
    `${item.durationSec}s`,
  ]
    .filter(Boolean)
    .join(' · ')

  const warn = $('detail-warning')
  if (item.warning || !item.synced) {
    warn.textContent =
      item.warning ||
      'Sincronize no editor PlayCifras (L/D) antes do overlay.'
    warn.classList.remove('hidden')
  } else {
    warn.classList.add('hidden')
  }

  if (!busy) {
    $('btn-overlay').disabled = false
    $('btn-import').disabled = false
  }
}

function renderList(filter) {
  const list = $('list')
  list.innerHTML = ''
  const q = (filter || '').trim().toLowerCase()
  const items = shorts.filter((s) => {
    if (!q) return true
    return (
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q)
    )
  })

  if (!items.length) {
    const empty = document.createElement('div')
    empty.className = 'item'
    empty.innerHTML =
      '<div class="item-sub">Nenhum short preparado. Rode npm run short:prepare e sincronize no editor.</div>'
    list.appendChild(empty)
    return
  }

  for (const item of items) {
    const el = document.createElement('div')
    el.className =
      'item' + (selected && selected.slug === item.slug ? ' active' : '')
    el.setAttribute('role', 'listitem')
    el.innerHTML = `
      <div class="item-title">${escapeHtml(item.title)}</div>
      <div class="item-sub">${escapeHtml(item.artist)} · ${escapeHtml(
      item.slug
    )}</div>
      <div class="badges">
        <span class="badge ${item.synced ? 'ok' : 'warn'}">${
          item.synced ? 'Pronto' : 'Sem sync'
        }</span>
        <span class="badge">${item.diagramCount} PNG</span>
      </div>
    `
    el.addEventListener('click', () => {
      showDetail(item)
      renderList($('search').value)
    })
    list.appendChild(el)
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function parseJsonResponse(res) {
  const raw = await res.text()
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(
      res.ok
        ? 'Resposta inválida da API'
        : `API HTTP ${res.status} (não-JSON). Confira npm run dev.`
    )
  }
}

async function fetchShorts() {
  const base = getApiUrl()
  setStatus('Carregando…')
  try {
    const res = await fetch(`${base}/api/plugin/shorts`)
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    shorts = data.shorts || []
    setStatus(`${shorts.length} short(s)`)
    renderList($('search').value)
  } catch (e) {
    shorts = []
    renderList('')
    setStatus(`Erro: ${e.message || e}`)
  }
}

/** Coloca overlay.mov em V2 no playhead. */
async function placeOverlay() {
  if (!selected || busy) return
  setBusy(true)
  const base = getApiUrl()
  const slug = selected.slug

  try {
    setStatus('Renderizando overlay (pode demorar)…')
    const renderRes = await fetch(
      `${base}/api/plugin/shorts/${encodeURIComponent(slug)}/render-overlay`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      }
    )
    const renderData = await parseJsonResponse(renderRes)
    if (!renderRes.ok) {
      throw new Error(renderData.error || `HTTP ${renderRes.status}`)
    }

    const overlayPath = renderData.overlayPath
    if (!overlayPath) throw new Error('API não retornou overlayPath')

    setStatus(
      renderData.cached
        ? 'Cache OK — importando overlay…'
        : 'Render OK — importando overlay…'
    )

    const project = await premierepro.Project.getActiveProject()
    if (!project) throw new Error('Abra um projeto no Premiere')

    const sequence = await project.getActiveSequence()
    if (!sequence) throw new Error('Abra uma sequência na timeline')

    let insertionBin = null
    try {
      insertionBin = await project.getInsertionBin()
    } catch {
      insertionBin = null
    }

    const imported = await project.importFiles(
      [overlayPath],
      true,
      insertionBin,
      false
    )
    if (!imported) throw new Error('importFiles falhou para overlay.mov')

    const projectItem = await findProjectItemByName(project, 'overlay.mov')
    if (!projectItem) {
      setStatus(
        'Overlay no bin — arraste para V2 manualmente (item não encontrado via API).'
      )
      return
    }

    let playhead
    try {
      playhead = await sequence.getPlayerPosition()
    } catch {
      playhead = premierepro.TickTime.TIME_ZERO
    }

    const sequenceEditor = premierepro.SequenceEditor.getEditor(sequence)
    let videoTrackIndex = 1
    try {
      const count = await sequence.getVideoTrackCount()
      if (typeof count === 'number' && count <= 1) videoTrackIndex = 1
      else if (typeof count === 'number') videoTrackIndex = Math.min(1, count)
    } catch {
      videoTrackIndex = 1
    }

    let ok = false
    project.lockedAccess(() => {
      ok = project.executeTransaction((compoundAction) => {
        const action = sequenceEditor.createOverwriteItemAction(
          projectItem,
          playhead,
          videoTrackIndex,
          0
        )
        compoundAction.addAction(action)
      }, 'PlayCifras overlay')
    })

    if (!ok) {
      setStatus(
        'Overlay no bin — falha ao colocar na timeline; arraste para V2.'
      )
      return
    }

    setStatus(
      `Overlay em V${videoTrackIndex + 1} no playhead${
        renderData.cached ? ' (cache)' : ''
      }`
    )
  } catch (e) {
    setStatus(`Falha: ${e.message || e}`)
  } finally {
    setBusy(false)
  }
}

async function findProjectItemByName(project, nameHint) {
  const root = await project.getRootItem()
  const needle = String(nameHint).toLowerCase()
  return walkItems(root, needle)
}

async function walkItems(folder, needle) {
  let items = []
  try {
    if (typeof folder.getItems === 'function') {
      items = await folder.getItems()
    } else if (typeof folder.children !== 'undefined') {
      items = folder.children
    }
  } catch {
    return null
  }
  if (!items || !items.length) return null

  for (const item of items) {
    let name = ''
    try {
      name = (item.name || (await item.getName?.()) || '').toLowerCase()
    } catch {
      name = ''
    }
    if (name.includes(needle) || name.endsWith('.mov')) {
      if (name.includes('overlay') || name.includes(needle)) {
        return item
      }
    }
    try {
      const nested = await walkItems(item, needle)
      if (nested) return nested
    } catch {
      /* not a folder */
    }
  }

  // 2ª passagem: qualquer .mov recente
  for (const item of items) {
    let name = ''
    try {
      name = (item.name || '').toLowerCase()
    } catch {
      continue
    }
    if (name.endsWith('.mov')) return item
  }
  return null
}

async function importSelected() {
  if (!selected || busy) return
  setBusy(true)
  setStatus('Preparando pacote SRT/PNG…')

  const base = getApiUrl()
  const slug = selected.slug

  try {
    const res = await fetch(
      `${base}/api/plugin/shorts/${encodeURIComponent(slug)}/package?format=json`
    )
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

    let paths = []

    if (Array.isArray(data.localPaths) && data.localPaths.length) {
      const localOk = await pathsLookLocal(data.localPaths)
      if (localOk) {
        paths = data.localPaths.filter((p) => /\.(srt|png|csv)$/i.test(p))
        setStatus(`Importando ${paths.length} arquivo(s)…`)
      }
    }

    if (!paths.length) {
      setStatus('Baixando arquivos…')
      paths = await downloadPackageFiles(base, slug, data.files || [])
    }

    if (!paths.length) throw new Error('Pacote sem arquivos')

    const project = await premierepro.Project.getActiveProject()
    if (!project) throw new Error('Abra um projeto no Premiere')

    let insertionBin = null
    try {
      insertionBin = await project.getInsertionBin()
    } catch {
      insertionBin = null
    }

    const ok = await project.importFiles(paths, true, insertionBin, false)
    if (!ok) throw new Error('importFiles retornou false')

    const warn = data.warning ? ` · ${data.warning}` : ''
    setStatus(`Peças no bin: ${paths.length}${warn}`)
  } catch (e) {
    setStatus(`Falha: ${e.message || e}`)
  } finally {
    setBusy(false)
  }
}

async function pathsLookLocal(paths) {
  const base = getApiUrl()
  return /localhost|127\.0\.0\.1/i.test(base) && paths.length > 0
}

async function downloadPackageFiles(base, slug, files) {
  const dataFolder = await localFileSystem.getDataFolder()
  let packFolder
  try {
    packFolder = await dataFolder.getEntry(slug)
  } catch {
    packFolder = await dataFolder.createFolder(slug)
  }

  let diagramsFolder
  try {
    diagramsFolder = await packFolder.getEntry('diagrams')
  } catch {
    diagramsFolder = await packFolder.createFolder('diagrams')
  }

  const nativePaths = []
  const importable = files.filter((f) =>
    /\.(srt|png|csv)$/i.test(f.relativePath)
  )

  for (const f of importable) {
    const url = f.url.startsWith('http') ? f.url : `${base}${f.url}`
    const res = await fetch(url)
    if (!res.ok) continue
    const buf = await res.arrayBuffer()

    const parts = f.relativePath.split('/')
    const fileName = parts[parts.length - 1]
    const isDiagram = parts[0] === 'diagrams'

    const folder = isDiagram ? diagramsFolder : packFolder
    const file = await folder.createFile(fileName, { overwrite: true })
    await file.write(buf, { format: storage.formats.binary })
    nativePaths.push(file.nativePath)
  }

  return nativePaths
}

/* ---------- Diagramas animados ---------- */

const DG_PREFS = {
  color: ['playcifras.dg.color', '0'],
  mode: ['playcifras.dg.mode', 'manual'],
  bpm: ['playcifras.dg.bpm', '90'],
  beats: ['playcifras.dg.beats', '4'],
  track: ['playcifras.dg.track', '2'],
  source: ['playcifras.dg.source', 'song'],
  free: ['playcifras.dg.free', ''],
  loop: ['playcifras.dg.loop', '1'],
}
const DG_FPS = 30
/** Sem marcador "fim": o último acorde fica na tela por este tempo. */
const DG_TAIL_SEC = 4
const TICKS_PER_SECOND = 254016000000
const CHORD_RE = /^[A-G](#|b)?[^\s]*$/
const END_RE = /^(fim|end)$/i
const COLOR_NAMES = ['verde', 'vermelho', 'roxo', 'laranja', 'amarelo', 'branco', 'azul', 'ciano']

/**
 * rows: { t, chord, beats?, source: 'seq' | 'marker' | 'user', beyond? }
 * clickStart / seqEnd só no modo click.
 */
const dg = {
  song: null,
  /** Sequência ativa (da cifra ou livre). */
  sequence: [],
  songSequence: [],
  freeTimer: null,
  rows: [],
  endSec: null,
  clickStart: 0,
  seqEnd: null,
  searchTimer: null,
}

function loadPref(key) {
  const [storageKey, fallback] = DG_PREFS[key]
  try {
    return localStorage.getItem(storageKey) || fallback
  } catch {
    return fallback
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(DG_PREFS[key][0], String(value))
  } catch {
    /* ignore */
  }
}

function dgStatus(msg) {
  $('dg-status').textContent = msg || ''
}

function dgMode() {
  return $('dg-mode').value === 'click' ? 'click' : 'manual'
}

function dgColor() {
  return Number($('dg-color').value) || 0
}

function dgNumber(id, fallback) {
  const n = Number($(id).value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function startIndex() {
  return Math.max(0, Math.floor(dgNumber('dg-start', 1)) - 1)
}

function dgSource() {
  return $('dg-source').value === 'free' ? 'free' : 'song'
}

/** Só a sequência livre pode repetir em loop. */
function dgLoop() {
  return dgSource() === 'free' && $('dg-loop').checked
}

function seqChordAt(k) {
  const len = dg.sequence.length
  if (!len) return ''
  const i = startIndex() + k
  if (dgLoop()) return dg.sequence[i % len]
  return dg.sequence[i] || ''
}

function parseFreeSequence(text) {
  const tokens = String(text || '').split(/[\s,;|]+/).filter(Boolean)
  return {
    chords: tokens.filter((t) => CHORD_RE.test(t)),
    ignored: tokens.filter((t) => !CHORD_RE.test(t)),
  }
}

function updateSequenceBox() {
  const box = $('dg-song')
  if (!dg.sequence.length) {
    box.classList.add('hidden')
    return
  }
  $('dg-song-title').textContent =
    dgSource() === 'free'
      ? `Sequência livre — ${dg.sequence.length} acorde(s)`
      : dg.song
        ? `${dg.song.title} — ${dg.song.artist}`
        : ''
  box.classList.remove('hidden')
  renderSequence()
}

function applySource() {
  const free = dgSource() === 'free'
  $('dg-song-source').classList.toggle('hidden', free)
  $('dg-free-source').classList.toggle('hidden', !free)
  if (free) {
    dg.sequence = parseFreeSequence($('dg-free').value).chords
    checkFreeDiagrams()
  } else {
    dg.sequence = dg.songSequence
  }
  $('dg-start').value = '1'
  updateSequenceBox()
  applySequenceToRows()
}

function onFreeInput() {
  savePref('free', $('dg-free').value)
  dg.sequence = parseFreeSequence($('dg-free').value).chords
  updateSequenceBox()
  applySequenceToRows()
  clearTimeout(dg.freeTimer)
  dg.freeTimer = setTimeout(checkFreeDiagrams, 600)
}

/** Avisa na hora quais acordes digitados não têm diagrama na biblioteca. */
async function checkFreeDiagrams() {
  const info = $('dg-free-info')
  const { chords, ignored } = parseFreeSequence($('dg-free').value)
  const notes = []
  if (ignored.length) notes.push(`Ignorados (não parecem acorde): ${ignored.join(', ')}.`)
  const unique = Array.from(new Set(chords))
  if (unique.length) {
    try {
      const res = await fetch(`${getSiteUrl()}/api/plugin/chord-shapes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chords: unique }),
      })
      const data = await parseJsonResponse(res)
      if (res.ok && data.missing && data.missing.length) {
        notes.push(`Sem diagrama (o card mostra só o nome): ${data.missing.join(', ')}.`)
      } else if (res.ok) {
        notes.push('Todos os acordes têm diagrama.')
      }
    } catch {
      /* site fora do ar: o render avisa depois */
    }
  }
  info.textContent = notes.join(' ')
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

function switchTab(name) {
  const diagrams = name === 'diagrams'
  $('tab-diagrams').classList.toggle('active', diagrams)
  $('tab-shorts').classList.toggle('active', !diagrams)
  $('view-diagrams').classList.toggle('hidden', !diagrams)
  $('view-main').classList.toggle('hidden', diagrams)
  if (!diagrams && !shorts.length) fetchShorts()
}

function updateModeUi() {
  const click = dgMode() === 'click'
  const color = COLOR_NAMES[dgColor()]
  $('dg-click-opts').classList.toggle('hidden', !click)
  $('dg-read').textContent = click ? 'Ler marcador inicial' : 'Ler marcadores'
  $('dg-mode-hint').textContent = click
    ? `Coloque um marcador ${color} no 1º tempo do primeiro acorde. Os tempos vêm do BPM; ajuste os tempos de cada acorde na lista se precisar.`
    : `Com o áudio sincronizado, toque e aperte M em cada troca de acorde (sem clipe selecionado). Só marcadores ${color} contam. Marcador com nome de acorde (ex.: Am) usa esse nome; um chamado "fim" define quando o card some.`
}

async function searchSongs(q) {
  const box = $('dg-results')
  if (!q.trim()) {
    box.classList.add('hidden')
    return
  }
  try {
    const res = await fetch(
      `${getSiteUrl()}/api/search?type=songs&limit=8&q=${encodeURIComponent(q)}`
    )
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    box.innerHTML = ''
    const songs = data.songs || []
    if (!songs.length) {
      box.innerHTML = '<div class="item"><div class="item-sub">Nada encontrado</div></div>'
    }
    for (const s of songs) {
      const el = document.createElement('div')
      el.className = 'item'
      el.innerHTML = `<div class="item-title">${escapeHtml(s.title)}</div>
        <div class="item-sub">${escapeHtml(s.artist?.name || '')}</div>`
      el.addEventListener('click', () => {
        box.classList.add('hidden')
        loadSong(s.slug)
      })
      box.appendChild(el)
    }
    box.classList.remove('hidden')
  } catch (e) {
    dgStatus(`Busca: ${e.message || e}`)
  }
}

async function loadSong(slug) {
  dgStatus('Carregando cifra…')
  try {
    const res = await fetch(
      `${getSiteUrl()}/api/plugin/songs/${encodeURIComponent(slug)}/chords`
    )
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    dg.song = data
    dg.songSequence = data.sequence || []
    dg.sequence = dg.songSequence
    $('dg-start').value = '1'
    updateSequenceBox()
    dgStatus(`${dg.sequence.length} trocas de acorde na cifra`)
    applySequenceToRows()
  } catch (e) {
    dgStatus(`Falha: ${e.message || e}`)
  }
}

function renderSequence() {
  const box = $('dg-sequence')
  box.innerHTML = ''
  const start = startIndex()
  const used = dg.rows.filter((r) => !r.beyond).length
  const wrapped = dgLoop() && start + used > dg.sequence.length
  dg.sequence.forEach((chord, i) => {
    const el = document.createElement('span')
    el.className =
      'chip' +
      (i === start ? ' start' : '') +
      (wrapped || (i >= start && i < start + used) ? ' used' : '')
    el.innerHTML = `<small>${i + 1}</small>${escapeHtml(chord)}`
    el.addEventListener('click', () => {
      $('dg-start').value = String(i + 1)
      applySequenceToRows()
    })
    box.appendChild(el)
  })
}

/** Reaplica a cifra às linhas (após trocar de música ou de acorde inicial). */
function applySequenceToRows() {
  if (dgMode() === 'click' && dg.rows.length) {
    buildClickRows()
  } else {
    dg.rows.forEach((row, k) => {
      if (row.source === 'seq') row.chord = seqChordAt(k)
    })
  }
  renderRows()
}

function buildClickRows() {
  const beats = dgNumber('dg-beats', 4)
  let count = Math.max(0, dg.sequence.length - startIndex())
  if (dgLoop() && dg.seqEnd != null && dg.sequence.length) {
    const chordSec = (beats * 60) / dgNumber('dg-bpm', 90)
    count = Math.min(500, Math.ceil((dg.seqEnd - dg.clickStart) / chordSec))
  }
  dg.rows = Array.from({ length: count }, (_, k) => ({
    t: 0,
    chord: seqChordAt(k),
    beats,
    source: 'seq',
  }))
  recalcClick()
}

function recalcClick() {
  const spb = 60 / dgNumber('dg-bpm', 90)
  let t = dg.clickStart
  for (const row of dg.rows) {
    row.t = t
    row.beyond = dg.seqEnd != null && t >= dg.seqEnd
    t += (row.beats || 1) * spb
  }
  dg.endSec = dg.seqEnd != null ? Math.min(t, dg.seqEnd) : t
}

async function getActiveSequence() {
  const project = await premierepro.Project.getActiveProject()
  if (!project) throw new Error('Abra um projeto no Premiere')
  const sequence = await project.getActiveSequence()
  if (!sequence) throw new Error('Abra uma sequência na timeline')
  return { project, sequence }
}

function tickSeconds(tt) {
  if (!tt) return 0
  if (typeof tt.seconds === 'number') return tt.seconds
  if (tt.ticks != null) return Number(tt.ticks) / TICKS_PER_SECOND
  return 0
}

function secondsToTickTime(sec) {
  const TickTime = premierepro.TickTime
  if (typeof TickTime.createWithSeconds === 'function') {
    return TickTime.createWithSeconds(sec)
  }
  return TickTime.createWithTicks(String(Math.round(sec * TICKS_PER_SECOND)))
}

async function coloredMarkersOf(owner, colorIndex) {
  const markers = await premierepro.Markers.getMarkers(owner)
  const list = (await markers.getMarkers()) || []
  const out = []
  for (const m of list) {
    let idx
    try {
      idx = Number(await m.getColorIndex())
    } catch {
      continue
    }
    if (colorIndex != null && idx !== colorIndex) continue
    out.push({
      t: tickSeconds(await m.getStart()),
      name: String((await m.getName()) || '').trim(),
      color: idx,
    })
  }
  return out
}

/** Marcadores de clipe (M com clipe selecionado), convertidos para tempo da sequência. */
async function readClipMarkers(sequence, colorIndex) {
  const tracks = []
  for (const [count, get] of [
    ['getVideoTrackCount', 'getVideoTrack'],
    ['getAudioTrackCount', 'getAudioTrack'],
  ]) {
    try {
      const n = await sequence[count]()
      for (let i = 0; i < n; i++) tracks.push(await sequence[get](i))
    } catch {
      /* ignore */
    }
  }

  const out = []
  for (const track of tracks) {
    let items = []
    try {
      items = (await track.getTrackItems(1, false)) || []
    } catch {
      continue
    }
    for (const item of items) {
      try {
        const projectItem = await item.getProjectItem()
        const clip = premierepro.ClipProjectItem.cast(projectItem)
        if (!clip) continue
        const start = tickSeconds(await item.getStartTime())
        const inPoint = tickSeconds(await item.getInPoint())
        const outPoint = tickSeconds(await item.getOutPoint())
        let speed = 1
        try {
          speed = Number(await item.getSpeed()) || 1
        } catch {
          speed = 1
        }
        for (const m of await coloredMarkersOf(clip, colorIndex)) {
          if (m.t < inPoint - 1e-3 || m.t > outPoint + 1e-3) continue
          out.push({ t: start + (m.t - inPoint) / Math.abs(speed), name: m.name, color: m.color })
        }
      } catch {
        /* item sem marcadores (gráfico, ajuste…) */
      }
    }
  }
  return out
}

function dedupeByTime(list) {
  const sorted = list.slice().sort((a, b) => a.t - b.t)
  const out = []
  for (const m of sorted) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.t - m.t) < 1 / 60) {
      if (!last.name && m.name) last.name = m.name
      continue
    }
    out.push(Object.assign({}, m))
  }
  return out
}

/** Marcadores da sequência; se não houver, usa os de clipe. */
async function readColoredMarkers(sequence, colorIndex) {
  let seqMarkers = []
  try {
    seqMarkers = await coloredMarkersOf(sequence, colorIndex)
  } catch {
    seqMarkers = []
  }
  if (seqMarkers.length) return { markers: dedupeByTime(seqMarkers), fromClips: false }
  const clipMarkers = await readClipMarkers(sequence, colorIndex)
  return { markers: dedupeByTime(clipMarkers), fromClips: true }
}

async function sequenceEndSec(sequence) {
  try {
    const end = tickSeconds(await sequence.getEndTime())
    return end > 0 ? end : null
  } catch {
    return null
  }
}

async function readMarkers() {
  if (busy) return
  try {
    const { sequence } = await getActiveSequence()
    const color = dgColor()
    const { markers, fromClips } = await readColoredMarkers(sequence, color)
    if (!markers.length) {
      const any = (await readColoredMarkers(sequence, null)).markers
      const found = Array.from(new Set(any.map((m) => COLOR_NAMES[m.color] || `cor ${m.color}`)))
      throw new Error(
        any.length
          ? `Nenhum marcador ${COLOR_NAMES[color]}; achei ${any.length} de outra cor (${found.join(', ')}). Troque a cor no painel.`
          : `Nenhum marcador ${COLOR_NAMES[color]} na sequência nem nos clipes`
      )
    }
    const origin = fromClips ? ' (do clipe)' : ''
    const seqEnd = await sequenceEndSec(sequence)

    if (dgMode() === 'click') {
      if (!dg.sequence.length) {
        throw new Error('Escolha a cifra ou digite a sequência livre para o modo click')
      }
      dg.clickStart = markers[0].t
      dg.seqEnd = seqEnd
      buildClickRows()
      dgStatus(`Início em ${fmtTime(dg.clickStart)}${origin}`)
    } else {
      const endMarker = markers.find((m) => END_RE.test(m.name))
      const changes = markers.filter((m) => !END_RE.test(m.name))
      dg.rows = changes.map((m, k) => {
        const named = CHORD_RE.test(m.name)
        return {
          t: m.t,
          chord: named ? m.name : seqChordAt(k),
          source: named ? 'marker' : 'seq',
        }
      })
      const last = changes.length ? changes[changes.length - 1].t : 0
      dg.endSec = endMarker
        ? endMarker.t
        : Math.min(last + DG_TAIL_SEC, seqEnd != null ? seqEnd : Infinity)
      dgStatus(`${changes.length} marcador(es) ${COLOR_NAMES[color]}${origin}`)
    }
    renderRows()
  } catch (e) {
    dgStatus(`Falha: ${e.message || e}`)
  }
}

function renderRows() {
  const box = $('dg-rows')
  box.innerHTML = ''
  const click = dgMode() === 'click'
  const visible = dg.rows.filter((r) => !r.beyond)
  box.classList.toggle('hidden', !visible.length)

  visible.forEach((row, k) => {
    const el = document.createElement('div')
    el.className = 'mark-row'
    el.innerHTML = `<span class="idx">${k + 1}</span>
      <span class="time">${fmtTime(row.t)}</span>
      <input type="text" value="${escapeHtml(row.chord)}" placeholder="acorde" />
      ${click ? `<input type="number" min="1" max="32" value="${row.beats}" title="Tempos" />` : ''}
      <button type="button" class="del" title="Remover">×</button>`

    const chordInput = el.querySelector('input[type="text"]')
    chordInput.addEventListener('input', () => {
      row.chord = chordInput.value.trim()
      row.source = 'user'
      validateRows()
    })
    if (click) {
      const beatsInput = el.querySelector('input[type="number"]')
      beatsInput.addEventListener('change', () => {
        row.beats = Math.max(1, Number(beatsInput.value) || 1)
        recalcClick()
        renderRows()
      })
    }
    el.querySelector('.del').addEventListener('click', () => {
      dg.rows.splice(dg.rows.indexOf(row), 1)
      if (click) recalcClick()
      renderRows()
    })
    box.appendChild(el)
  })

  if (dg.sequence.length) renderSequence()
  validateRows()
}

function validateRows() {
  const visible = dg.rows.filter((r) => !r.beyond)
  const warnings = []
  const empty = visible.filter((r) => !r.chord).length
  const invalid = visible.filter((r) => r.chord && !CHORD_RE.test(r.chord))

  if (empty) {
    warnings.push(
      dg.sequence.length
        ? `${empty} marcador(es) sem acorde — há mais marcadores que acordes restantes na sequência.`
        : `${empty} marcador(es) sem acorde — escolha a cifra, digite a sequência livre ou nomeie os marcadores (ex.: Am).`
    )
  }
  if (invalid.length) {
    warnings.push(`Não parece acorde: ${invalid.map((r) => r.chord).join(', ')}`)
  }
  if (dgMode() === 'manual' && !dgLoop() && dg.sequence.length && visible.length) {
    const remaining = dg.sequence.length - startIndex()
    if (!empty && visible.length < remaining) {
      const next = seqChordAt(visible.length)
      warnings.push(
        `${visible.length} marcadores para ${remaining} acordes restantes (próximo seria ${next}). OK se for um trecho.`
      )
    }
  }
  const beyond = dg.rows.length - visible.length
  if (beyond) warnings.push(`${beyond} acorde(s) passam do fim da sequência e ficam de fora.`)

  const rowsEls = $('dg-rows').querySelectorAll('input[type="text"]')
  visible.forEach((r, k) => {
    if (rowsEls[k]) rowsEls[k].classList.toggle('invalid', !r.chord || !CHORD_RE.test(r.chord))
  })

  const warn = $('dg-warning')
  warn.textContent = warnings.join(' ')
  warn.classList.toggle('hidden', !warnings.length)
  $('dg-render').disabled = busy || !visible.length || empty > 0
}

async function findItemByName(folder, name) {
  let items = []
  try {
    const asFolder =
      typeof folder.getItems === 'function'
        ? folder
        : premierepro.FolderItem && premierepro.FolderItem.cast
          ? premierepro.FolderItem.cast(folder)
          : null
    if (!asFolder || typeof asFolder.getItems !== 'function') return null
    items = (await asFolder.getItems()) || []
  } catch {
    return null
  }
  for (const item of items) {
    if (String(item.name || '') === name) return item
  }
  for (const item of items) {
    const nested = await findItemByName(item, name)
    if (nested) return nested
  }
  return null
}

async function renderDiagramsAndPlace() {
  if (busy) return
  const visible = dg.rows.filter((r) => !r.beyond && r.chord)
  if (!visible.length) return
  busy = true
  validateRows()

  try {
    const { project, sequence } = await getActiveSequence()
    dgStatus('Renderizando animação (pode demorar)…')
    let res
    try {
      res = await fetch(`${getHelperUrl()}/render-diagrams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks: visible.map((r) => ({ t: r.t, chord: r.chord })),
          endSec: dg.endSec,
          fps: DG_FPS,
          slug: dgSource() === 'free' ? 'sequencia-livre' : dg.song ? dg.song.slug : undefined,
          siteUrl: getSiteUrl(),
        }),
      })
    } catch {
      throw new Error(HELPER_OFFLINE_MSG)
    }
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

    dgStatus(data.cached ? 'Cache OK — importando…' : 'Render OK — importando…')
    let insertionBin = null
    try {
      insertionBin = await project.getInsertionBin()
    } catch {
      insertionBin = null
    }
    const imported = await project.importFiles([data.overlayPath], true, insertionBin, false)
    if (!imported) throw new Error('Falha ao importar o .mov')

    const projectItem =
      (insertionBin && (await findItemByName(insertionBin, data.fileName))) ||
      (await findItemByName(await project.getRootItem(), data.fileName))
    if (!projectItem) {
      dgStatus(`${data.fileName} está no bin — arraste para ${fmtTime(data.startSec)}.`)
      return
    }

    const trackIndex = Math.max(0, Math.floor(dgNumber('dg-track', 2)) - 1)
    const editor = premierepro.SequenceEditor.getEditor(sequence)
    let ok = false
    project.lockedAccess(() => {
      ok = project.executeTransaction((compoundAction) => {
        compoundAction.addAction(
          editor.createOverwriteItemAction(
            projectItem,
            secondsToTickTime(data.startSec),
            trackIndex,
            0
          )
        )
      }, 'PlayCifras diagramas')
    })
    if (!ok) {
      dgStatus(`No bin — não coube em V${trackIndex + 1}; arraste para ${fmtTime(data.startSec)}.`)
      return
    }

    const missing = data.missingChords && data.missingChords.length
      ? ` · sem digitação: ${data.missingChords.join(', ')}`
      : ''
    dgStatus(`Animação em V${trackIndex + 1} a partir de ${fmtTime(data.startSec)}${missing}`)
  } catch (e) {
    dgStatus(`Falha: ${e.message || e}`)
  } finally {
    busy = false
    validateRows()
  }
}

const HELPER_OFFLINE_MSG =
  'Ajudante de render não está rodando. Instale com npm run helper:install (uma vez por PC).'

async function checkHelper() {
  try {
    const res = await fetch(`${getHelperUrl()}/health`)
    if (!res.ok) throw new Error()
  } catch {
    dgStatus(HELPER_OFFLINE_MSG)
  }
}

function wireDiagrams() {
  $('dg-color').value = loadPref('color')
  $('dg-mode').value = loadPref('mode')
  $('dg-bpm').value = loadPref('bpm')
  $('dg-beats').value = loadPref('beats')
  $('dg-track').value = loadPref('track')
  $('dg-source').value = loadPref('source')
  $('dg-free').value = loadPref('free')
  $('dg-loop').checked = loadPref('loop') === '1'
  updateModeUi()
  applySource()

  $('dg-source').addEventListener('change', () => {
    savePref('source', dgSource())
    applySource()
  })
  $('dg-free').addEventListener('input', () => onFreeInput())
  $('dg-loop').addEventListener('change', () => {
    savePref('loop', $('dg-loop').checked ? '1' : '0')
    applySequenceToRows()
  })

  $('tab-diagrams').addEventListener('click', () => switchTab('diagrams'))
  $('tab-shorts').addEventListener('click', () => switchTab('shorts'))

  $('dg-search').addEventListener('input', (e) => {
    clearTimeout(dg.searchTimer)
    const q = e.target.value
    dg.searchTimer = setTimeout(() => searchSongs(q), 300)
  })
  $('dg-mode').addEventListener('change', () => {
    savePref('mode', dgMode())
    dg.rows = []
    updateModeUi()
    renderRows()
  })
  $('dg-color').addEventListener('change', () => {
    savePref('color', dgColor())
    updateModeUi()
  })
  $('dg-bpm').addEventListener('change', () => {
    savePref('bpm', $('dg-bpm').value)
    if (dgMode() === 'click' && dg.rows.length) {
      recalcClick()
      renderRows()
    }
  })
  $('dg-beats').addEventListener('change', () => {
    savePref('beats', $('dg-beats').value)
    if (dgMode() === 'click' && dg.rows.length) {
      buildClickRows()
      renderRows()
    }
  })
  $('dg-track').addEventListener('change', () => savePref('track', $('dg-track').value))
  $('dg-start').addEventListener('change', () => applySequenceToRows())
  $('dg-read').addEventListener('click', () => readMarkers())
  $('dg-render').addEventListener('click', () => renderDiagramsAndPlace())
}

function wireUi() {
  wireDiagrams()
  $('btn-settings').addEventListener('click', () => showSettings(true))
  $('btn-back').addEventListener('click', () => showSettings(false))
  $('btn-save-settings').addEventListener('click', () => {
    setApiUrl($('api-url').value)
    writeUrlSetting(SITE_KEY, $('site-url').value, DEFAULT_SITE)
    writeUrlSetting(HELPER_KEY, $('helper-url').value, DEFAULT_HELPER)
    showSettings(false)
    checkHelper()
  })
  $('btn-refresh').addEventListener('click', () => fetchShorts())
  $('search').addEventListener('input', (e) => renderList(e.target.value))
  $('btn-close-detail').addEventListener('click', () => {
    selected = null
    showDetail(null)
    renderList($('search').value)
  })
  $('btn-overlay').addEventListener('click', () => placeOverlay())
  $('btn-import').addEventListener('click', () => importSelected())
}

entrypoints.setup({
  panels: {
    'playcifras.panel': {
      show() {
        if (!uiReady) {
          wireUi()
          uiReady = true
        }
        checkHelper()
      },
    },
  },
})
