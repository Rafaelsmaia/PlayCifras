/**
 * Painel UXP PlayCifras para Adobe Premiere (25.6+).
 * Diagramas: troca animada de acordes cronometrada por marcadores (ou BPM).
 * Letra: telas de letra com cifras, trocadas por marcadores de outra cor.
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
  lyColor: ['playcifras.ly.color', '6'],
  lyPer: ['playcifras.ly.per', '2'],
  lyTrack: ['playcifras.ly.track', '3'],
  lySplit: ['playcifras.ly.split', '1'],
}
/** Ajudante com /render-lyrics e quadro do tamanho da sequência. */
const HELPER_MIN_VERSION = 2
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
  tab: 'diagrams',
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

/** Busca de cifra é comum às abas Diagramas (se não for sequência livre) e Letra. */
function updateSongBlock() {
  const tab = dg.tab
  $('song-block').classList.toggle('hidden', tab === 'shorts')
  $('dg-source-field').classList.toggle('hidden', tab !== 'diagrams')
  $('dg-song-source').classList.toggle('hidden', tab === 'diagrams' && dgSource() === 'free')
  const current = $('song-current')
  current.textContent = dg.song ? `${dg.song.title} — ${dg.song.artist}` : ''
  current.classList.toggle('hidden', !dg.song)
  updateVersionSelect()
}

function updateVersionSelect() {
  const versions = (dg.song && dg.song.versions) || []
  const select = $('song-version')
  $('song-version-field').classList.toggle('hidden', versions.length < 2)
  select.innerHTML = ''
  for (const v of versions) {
    const opt = document.createElement('option')
    opt.value = v.slug
    opt.textContent = v.key ? `${v.label} (tom ${v.key})` : v.label
    opt.selected = v.slug === dg.song.slug
    select.appendChild(opt)
  }
}

function applySource() {
  const free = dgSource() === 'free'
  updateSongBlock()
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
  dg.tab = name
  for (const [tab, view] of [
    ['diagrams', 'view-diagrams'],
    ['lyrics', 'view-lyrics'],
    ['shorts', 'view-main'],
  ]) {
    $(`tab-${tab}`).classList.toggle('active', tab === name)
    $(view).classList.toggle('hidden', tab !== name)
  }
  updateSongBlock()
  if (name === 'shorts' && !shorts.length) fetchShorts()
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
    if (dgSource() === 'song') dg.sequence = dg.songSequence
    $('dg-start').value = '1'
    updateSongBlock()
    updateSequenceBox()
    dgStatus(`${dg.songSequence.length} trocas de acorde na cifra`)
    applySequenceToRows()
    setLyricLines(data.lines)
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

/** Tamanho do quadro da sequência: o overlay já sai na posição certa do vídeo. */
async function frameSizeOf(sequence) {
  try {
    const rect = await sequence.getFrameSize()
    const width = Math.round(Number(rect && rect.width))
    const height = Math.round(Number(rect && rect.height))
    if (width > 0 && height > 0) return { width, height }
  } catch {
    /* Premiere sem getFrameSize */
  }
  return { width: 1080, height: 1920 }
}

/** POST no ajudante de render; traduz ajudante parado/antigo em instruções. */
async function callHelper(route, body) {
  let res
  try {
    res = await fetch(`${getHelperUrl()}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(HELPER_OFFLINE_MSG)
  }
  const data = await parseJsonResponse(res)
  if (res.status === 404) throw new Error(HELPER_OUTDATED_MSG)
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

/** Importa o .mov e coloca em `trackIndex` no início do overlay. Devolve o texto de status. */
async function placeRendered(project, sequence, data, trackIndex, label) {
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
  if (!projectItem) return `${data.fileName} está no bin — arraste para ${fmtTime(data.startSec)}.`

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
    }, `PlayCifras ${label}`)
  })
  if (!ok) return `No bin — não coube em V${trackIndex + 1}; arraste para ${fmtTime(data.startSec)}.`
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
    const data = await callHelper('/render-diagrams', {
      marks: visible.map((r) => ({ t: r.t, chord: r.chord })),
      endSec: dg.endSec,
      fps: DG_FPS,
      slug: dgSource() === 'free' ? 'sequencia-livre' : dg.song ? dg.song.slug : undefined,
      siteUrl: getSiteUrl(),
      ...(await frameSizeOf(sequence)),
    })

    dgStatus(data.cached ? 'Cache OK — importando…' : 'Render OK — importando…')
    const trackIndex = Math.max(0, Math.floor(dgNumber('dg-track', 2)) - 1)
    const fallback = await placeRendered(project, sequence, data, trackIndex, 'diagramas')
    if (fallback) return dgStatus(fallback)

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

/* ---------- Letra com cifras ---------- */

/** Linhas maiores que isso viram duas (como "Ainda que a figueira / não floresça"). */
const LY_SPLIT_AT = 28
const PAUSE_RE = /^(pausa|pause|-)$/i

/**
 * rawLines: linhas da cifra ({ text, chords: [{ chord, at }], breakBefore }).
 * lines: as mesmas, já quebradas se "Quebrar linhas longas" estiver ligado.
 * rows: { t, pause, count (null = automático), first, lines }.
 */
const ly = {
  rawLines: [],
  lines: [],
  rows: [],
  endSec: null,
  used: 0,
}

function lyStatus(msg) {
  $('ly-status').textContent = msg || ''
}

function lyColor() {
  return Number($('ly-color').value) || 0
}

function lyPerScreen() {
  return Math.min(3, Math.max(1, Number($('ly-per').value) || 2))
}

function lyStart() {
  return Math.max(0, Math.floor(dgNumber('ly-start', 1)) - 1)
}

/** Quebra no espaço mais perto do meio; cada acorde vai junto com a sua sílaba. */
function splitLongLine(line) {
  const text = line.text
  if (text.length <= LY_SPLIT_AT) return [line]
  let cut = -1
  for (let i = 1; i < text.length - 1; i++) {
    if (text[i] !== ' ') continue
    if (cut < 0 || Math.abs(i - text.length / 2) < Math.abs(cut - text.length / 2)) cut = i
  }
  if (cut < 0) return [line]
  const first = {
    text: text.slice(0, cut),
    chords: line.chords
      .filter((c) => c.at <= cut)
      .map((c) => ({ chord: c.chord, at: Math.min(c.at, cut) })),
    breakBefore: line.breakBefore,
  }
  const second = {
    text: text.slice(cut + 1),
    chords: line.chords
      .filter((c) => c.at > cut)
      .map((c) => ({ chord: c.chord, at: c.at - cut - 1 })),
    breakBefore: false,
  }
  return [...splitLongLine(first), ...splitLongLine(second)]
}

/** `group` = linha original da cifra: as metades de uma linha quebrada ficam na mesma tela. */
function prepareLyricLines() {
  const split = $('ly-split').checked
  ly.lines = ly.rawLines.flatMap((line, group) =>
    (split ? splitLongLine(line) : [line]).map((part) => Object.assign({}, part, { group }))
  )
}

function setLyricLines(lines) {
  ly.rawLines = Array.isArray(lines) ? lines : []
  $('ly-start').value = '1'
  prepareLyricLines()
  assignLyricRows()
  renderLyricRows()
  updateLyricHint()
  lyStatus(
    Array.isArray(lines)
      ? `${ly.rawLines.length} linhas de letra`
      : 'O site ainda não devolve a letra — aguarde o deploy e recarregue a cifra.'
  )
}

/**
 * Quantas linhas a próxima tela pega: linhas da cifra inteiras até "Linhas por tela",
 * sem atravessar estrofe. Uma linha quebrada sozinha pode passar do limite.
 */
function autoCount(cursor) {
  const per = lyPerScreen()
  const groupSize = (i) => {
    let n = 0
    while (i + n < ly.lines.length && ly.lines[i + n].group === ly.lines[i].group) n++
    return n
  }
  let n = 0
  while (cursor + n < ly.lines.length) {
    const next = ly.lines[cursor + n]
    const size = groupSize(cursor + n)
    if (n > 0 && (next.breakBefore || n + size > per)) break
    n += size
  }
  return n
}

function assignLyricRows() {
  let cursor = lyStart()
  for (const row of ly.rows) {
    row.first = cursor
    if (row.pause) {
      row.lines = []
      continue
    }
    const n = row.count != null ? row.count : autoCount(cursor)
    row.lines = ly.lines.slice(cursor, cursor + n)
    cursor += row.lines.length
  }
  ly.used = cursor
}

function renderLyricLines() {
  const box = $('ly-song')
  if (!ly.lines.length) {
    box.classList.add('hidden')
    return
  }
  box.classList.remove('hidden')
  $('ly-title').textContent = dg.song ? `Letra — ${dg.song.title}` : 'Letra'
  const list = $('ly-lines')
  list.innerHTML = ''
  const start = lyStart()
  ly.lines.forEach((line, i) => {
    const el = document.createElement('div')
    el.className =
      'line' +
      (line.breakBefore && i > 0 ? ' break' : '') +
      (i === start ? ' start' : '') +
      (ly.rows.length && i >= start && i < ly.used ? ' used' : '')
    el.innerHTML = `<small>${i + 1}</small><span>${escapeHtml(line.text)}</span>`
    el.addEventListener('click', () => {
      $('ly-start').value = String(i + 1)
      assignLyricRows()
      renderLyricRows()
    })
    list.appendChild(el)
  })
}

function updateLyricHint() {
  const color = COLOR_NAMES[lyColor()]
  $('ly-hint').textContent =
    `Aperte o atalho do marcador ${color} em cada troca de tela da letra. ` +
    `Um marcador chamado "pausa" limpa a tela (trecho instrumental); "fim" define quando a letra some. ` +
    `Atalho: Editar › Atalhos do teclado › busque "marcador" e atribua uma tecla a "Adicionar marcador ${color}".`
}

async function readLyricMarkers() {
  if (busy) return
  try {
    if (!ly.lines.length) throw new Error('Escolha a cifra primeiro')
    const { sequence } = await getActiveSequence()
    const color = lyColor()
    const { markers, fromClips } = await readColoredMarkers(sequence, color)
    if (!markers.length) {
      throw new Error(`Nenhum marcador ${COLOR_NAMES[color]} na sequência nem nos clipes`)
    }
    const endMarker = markers.find((m) => END_RE.test(m.name))
    const changes = markers.filter((m) => !END_RE.test(m.name))
    ly.rows = changes.map((m) => ({ t: m.t, pause: PAUSE_RE.test(m.name), count: null }))
    const seqEnd = await sequenceEndSec(sequence)
    const last = changes.length ? changes[changes.length - 1].t : 0
    ly.endSec = endMarker
      ? endMarker.t
      : Math.min(last + DG_TAIL_SEC, seqEnd != null ? seqEnd : Infinity)
    assignLyricRows()
    renderLyricRows()
    lyStatus(`${changes.length} marcador(es) ${COLOR_NAMES[color]}${fromClips ? ' (do clipe)' : ''}`)
  } catch (e) {
    lyStatus(`Falha: ${e.message || e}`)
  }
}

function renderLyricRows() {
  const box = $('ly-rows')
  box.innerHTML = ''
  box.classList.toggle('hidden', !ly.rows.length)

  ly.rows.forEach((row, k) => {
    const el = document.createElement('div')
    el.className = 'mark-row'
    const text = row.pause
      ? '— pausa —'
      : row.lines.length
        ? row.lines.map((l) => l.text).join(' / ')
        : '(sem letra)'
    el.innerHTML = `<span class="idx">${k + 1}</span>
      <span class="time">${fmtTime(row.t)}</span>
      <span class="text${row.pause ? ' pause' : ''}" title="${escapeHtml(text)}">${escapeHtml(text)}</span>
      ${row.pause ? '' : '<button type="button" class="step" data-d="-1" title="Uma linha a menos">−</button><button type="button" class="step" data-d="1" title="Uma linha a mais">+</button>'}
      <button type="button" class="del" title="Remover">×</button>`

    el.querySelectorAll('.step').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = row.count != null ? row.count : row.lines.length
        row.count = Math.min(4, Math.max(1, current + Number(btn.getAttribute('data-d'))))
        assignLyricRows()
        renderLyricRows()
      })
    })
    el.querySelector('.del').addEventListener('click', () => {
      ly.rows.splice(k, 1)
      assignLyricRows()
      renderLyricRows()
    })
    box.appendChild(el)
  })

  renderLyricLines()
  validateLyricRows()
}

function validateLyricRows() {
  const warnings = []
  const empty = ly.rows.filter((r) => !r.pause && !r.lines.length).length
  if (empty) {
    warnings.push(`${empty} marcador(es) sem letra — a letra acabou antes. Comece numa linha anterior ou remova marcadores.`)
  }
  const remaining = ly.lines.length - ly.used
  if (ly.rows.length && !empty && remaining > 0) {
    warnings.push(`Sobram ${remaining} linha(s) depois do último marcador. OK se for um trecho.`)
  }
  const warn = $('ly-warning')
  warn.textContent = warnings.join(' ')
  warn.classList.toggle('hidden', !warnings.length)
  $('ly-render').disabled = busy || !ly.rows.some((r) => r.lines.length)
}

async function renderLyricsAndPlace() {
  if (busy) return
  const rows = ly.rows.filter((r) => r.pause || r.lines.length)
  if (!rows.some((r) => r.lines.length)) return
  busy = true
  validateLyricRows()

  try {
    const { project, sequence } = await getActiveSequence()
    lyStatus('Renderizando letra (pode demorar)…')
    const data = await callHelper('/render-lyrics', {
      screens: rows.map((r) => ({
        t: r.t,
        lines: r.lines.map((l) => ({ text: l.text, chords: l.chords })),
      })),
      endSec: ly.endSec,
      fps: DG_FPS,
      slug: dg.song ? dg.song.slug : undefined,
      ...(await frameSizeOf(sequence)),
    })

    lyStatus(data.cached ? 'Cache OK — importando…' : 'Render OK — importando…')
    const trackIndex = Math.max(0, Math.floor(dgNumber('ly-track', 3)) - 1)
    const fallback = await placeRendered(project, sequence, data, trackIndex, 'letra')
    lyStatus(fallback || `Letra em V${trackIndex + 1} a partir de ${fmtTime(data.startSec)}`)
  } catch (e) {
    lyStatus(`Falha: ${e.message || e}`)
  } finally {
    busy = false
    validateLyricRows()
  }
}

function wireLyrics() {
  $('ly-color').value = loadPref('lyColor')
  $('ly-per').value = loadPref('lyPer')
  $('ly-track').value = loadPref('lyTrack')
  $('ly-split').checked = loadPref('lySplit') === '1'
  updateLyricHint()

  $('ly-color').addEventListener('change', () => {
    savePref('lyColor', lyColor())
    updateLyricHint()
  })
  $('ly-per').addEventListener('change', () => {
    savePref('lyPer', lyPerScreen())
    for (const row of ly.rows) row.count = null
    assignLyricRows()
    renderLyricRows()
  })
  $('ly-split').addEventListener('change', () => {
    savePref('lySplit', $('ly-split').checked ? '1' : '0')
    prepareLyricLines()
    $('ly-start').value = '1'
    assignLyricRows()
    renderLyricRows()
  })
  $('ly-track').addEventListener('change', () => savePref('lyTrack', $('ly-track').value))
  $('ly-start').addEventListener('change', () => {
    assignLyricRows()
    renderLyricRows()
  })
  $('ly-read').addEventListener('click', () => readLyricMarkers())
  $('ly-render').addEventListener('click', () => renderLyricsAndPlace())
}

const HELPER_OFFLINE_MSG =
  'Ajudante de render não está rodando. Instale com npm run helper:install (uma vez por PC).'
const HELPER_OUTDATED_MSG =
  'Ajudante de render desatualizado: rode git pull e npm run helper:install de novo.'

async function checkHelper() {
  let msg = ''
  try {
    const res = await fetch(`${getHelperUrl()}/health`)
    if (!res.ok) throw new Error()
    const data = await parseJsonResponse(res)
    if (!(Number(data.version) >= HELPER_MIN_VERSION)) msg = HELPER_OUTDATED_MSG
  } catch {
    msg = HELPER_OFFLINE_MSG
  }
  if (msg) {
    dgStatus(msg)
    lyStatus(msg)
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
  $('tab-lyrics').addEventListener('click', () => switchTab('lyrics'))
  $('tab-shorts').addEventListener('click', () => switchTab('shorts'))

  $('dg-search').addEventListener('input', (e) => {
    clearTimeout(dg.searchTimer)
    const q = e.target.value
    dg.searchTimer = setTimeout(() => searchSongs(q), 300)
  })
  $('song-version').addEventListener('change', (e) => loadSong(e.target.value))
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
  wireLyrics()
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
