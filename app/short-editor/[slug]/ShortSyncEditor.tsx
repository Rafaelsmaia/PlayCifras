'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ShortChordMark,
  ShortLyricLine,
  ShortTimeline,
} from '@/lib/video-pipeline/timeline'
import {
  expandChordMarksFromLyricLines,
  itemAtTime,
  sealTrack,
  zeroTrackTimings,
} from '@/lib/video-pipeline/timeline'

type Props = { slug: string }

function formatTime(sec: number) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r.toFixed(2).padStart(5, '0')}`
}

export default function ShortSyncEditor({ slug }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Posição no short (0…durationSec) */
  const playheadRef = useRef(0)
  /** Posição absoluta no MP3 — usada no resume */
  const resumeAbsRef = useRef(0)
  const audioStartRef = useRef(0)
  const durationRef = useRef(40)
  const blobUrlRef = useRef<string | null>(null)

  const [timeline, setTimeline] = useState<ShortTimeline | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAudio, setHasAudio] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [shortTime, setShortTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [selLyric, setSelLyric] = useState(0)
  const [selChord, setSelChord] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportingPremiere, setExportingPremiere] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const audioStart = timeline?.audioStartSec ?? 0
  const duration = timeline?.durationSec ?? 40
  audioStartRef.current = audioStart
  durationRef.current = duration

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setAudioReady(false)
    try {
      const res = await fetch(`/api/shorts/${encodeURIComponent(slug)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar')
      setTimeline(data.timeline)
      setHasAudio(Boolean(data.hasAudio))
      setSelLyric(0)
      setSelChord(0)
      setDirty(false)
      const start = data.timeline?.audioStartSec ?? 0
      playheadRef.current = 0
      resumeAbsRef.current = start
      setShortTime(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  // MP3 em memória (blob) → pause/seek não dependem de HTTP Range
  useEffect(() => {
    if (!hasAudio) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/shorts/${encodeURIComponent(slug)}/audio`
        )
        if (!res.ok) throw new Error('áudio')
        const blob = await res.blob()
        if (cancelled) return
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        const el = audioRef.current
        if (el) {
          el.src = url
          el.load()
        }
      } catch {
        if (!cancelled) setStatus('Falha ao carregar áudio')
      }
    })()
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [hasAudio, slug])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !hasAudio) return

    const onTime = () => {
      const start = audioStartRef.current
      const abs = el.currentTime
      // Ignora reset espúrio para ~0
      if (
        playheadRef.current > 0.3 &&
        abs < 0.2 &&
        resumeAbsRef.current > start + 0.3
      ) {
        return
      }
      resumeAbsRef.current = abs
      const t = abs - start
      const clamped = Math.max(0, Math.min(durationRef.current, t))
      playheadRef.current = clamped
      setShortTime(clamped)
      if (t >= durationRef.current && !el.paused) {
        el.pause()
        setPlaying(false)
      }
    }

    const onPlay = () => setPlaying(true)

    const onPause = () => {
      setPlaying(false)
      // Congela posição ABSOLUTA (não recalcula a partir de currentTime se for lixo)
      const abs =
        el.currentTime > 0.05 ? el.currentTime : resumeAbsRef.current
      resumeAbsRef.current = abs
      const t = abs - audioStartRef.current
      playheadRef.current = Math.max(0, Math.min(durationRef.current, t))
      setShortTime(playheadRef.current)
    }

    const onMeta = () => {
      setAudioDuration(el.duration || 0)
      setAudioReady(true)
      const abs = resumeAbsRef.current || audioStartRef.current
      try {
        el.currentTime = abs
      } catch {
        /* ignore */
      }
    }

    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [hasAudio])

  const liveLyric = useMemo(
    () => (timeline ? itemAtTime(timeline.lyricLines, shortTime) : null),
    [timeline, shortTime]
  )
  const liveChord = useMemo(
    () => (timeline ? itemAtTime(timeline.chordMarks, shortTime) : null),
    [timeline, shortTime]
  )
  const liveLine = liveLyric?.item
  const diagramChord = liveChord?.item.chord || ''

  const seekShort = useCallback(
    (t: number) => {
      const el = audioRef.current
      const clamped = Math.max(0, Math.min(durationRef.current, t))
      const abs = audioStartRef.current + clamped
      playheadRef.current = clamped
      resumeAbsRef.current = abs
      setShortTime(clamped)
      if (el && audioReady) {
        try {
          el.currentTime = abs
        } catch {
          /* ignore */
        }
      }
    },
    [audioReady]
  )

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return

    if (!el.paused) {
      // Pausar: grava posição ANTES
      resumeAbsRef.current = el.currentTime
      const t = el.currentTime - audioStartRef.current
      playheadRef.current = Math.max(0, Math.min(durationRef.current, t))
      setShortTime(playheadRef.current)
      el.pause()
      return
    }

    // Play: retoma da posição congelada
    let abs = resumeAbsRef.current
    if (playheadRef.current >= durationRef.current - 0.05) {
      abs = audioStartRef.current
      playheadRef.current = 0
      resumeAbsRef.current = abs
      setShortTime(0)
    } else if (abs < audioStartRef.current - 0.01) {
      abs = audioStartRef.current + playheadRef.current
      resumeAbsRef.current = abs
    }

    const finishPlay = () => {
      void el.play().catch(() => setStatus('Não foi possível tocar o áudio'))
    }

    if (Math.abs(el.currentTime - abs) > 0.05) {
      let done = false
      const onSeeked = () => {
        if (done) return
        done = true
        el.removeEventListener('seeked', onSeeked)
        finishPlay()
      }
      el.addEventListener('seeked', onSeeked)
      try {
        el.currentTime = abs
      } catch {
        finishPlay()
        return
      }
      window.setTimeout(() => {
        if (done) return
        done = true
        el.removeEventListener('seeked', onSeeked)
        finishPlay()
      }, 250)
    } else {
      finishPlay()
    }
  }, [])

  const patchLyricT = (index: number, t: number) => {
    setTimeline((prev) => {
      if (!prev) return prev
      const lyricLines = prev.lyricLines.map((e) => ({ ...e }))
      const nextT =
        Math.round(Math.max(0, Math.min(prev.durationSec, t)) * 100) / 100
      lyricLines[index] = { ...lyricLines[index], t: nextT }
      for (let i = 1; i < lyricLines.length; i++) {
        if (lyricLines[i].t < lyricLines[i - 1].t) {
          lyricLines[i] = { ...lyricLines[i], t: lyricLines[i - 1].t }
        }
      }
      sealTrack(lyricLines, prev.durationSec)
      return { ...prev, lyricLines }
    })
    setDirty(true)
  }

  const patchChordT = (index: number, t: number) => {
    setTimeline((prev) => {
      if (!prev) return prev
      const chordMarks = prev.chordMarks.map((e) => ({ ...e }))
      const nextT =
        Math.round(Math.max(0, Math.min(prev.durationSec, t)) * 100) / 100
      chordMarks[index] = { ...chordMarks[index], t: nextT }
      for (let i = 1; i < chordMarks.length; i++) {
        if (chordMarks[i].t < chordMarks[i - 1].t) {
          chordMarks[i] = { ...chordMarks[i], t: chordMarks[i - 1].t }
        }
      }
      sealTrack(chordMarks, prev.durationSec)
      return { ...prev, chordMarks }
    })
    setDirty(true)
  }

  const markLyric = useCallback(() => {
    if (!timeline) return
    const t = Math.round(playheadRef.current * 100) / 100
    patchLyricT(selLyric, t)
    if (selLyric + 1 < timeline.lyricLines.length) {
      setSelLyric(selLyric + 1)
      setStatus(`Letra #${selLyric + 1} @ ${formatTime(t)}`)
    } else {
      setStatus(`Última letra @ ${formatTime(t)}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, selLyric])

  const markChord = useCallback(() => {
    if (!timeline) return
    const t = Math.round(playheadRef.current * 100) / 100
    patchChordT(selChord, t)
    if (selChord + 1 < timeline.chordMarks.length) {
      setSelChord(selChord + 1)
      setStatus(
        `Diagrama #${selChord + 1} (${timeline.chordMarks[selChord].chord}) @ ${formatTime(t)}`
      )
    } else {
      setStatus(`Último diagrama @ ${formatTime(t)}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, selChord])

  const setAudioStartFromNow = () => {
    const el = audioRef.current
    if (!timeline) return
    const start =
      Math.round(
        (resumeAbsRef.current || el?.currentTime || 0) * 100
      ) / 100
    setTimeline({ ...timeline, audioStartSec: start })
    setDirty(true)
    playheadRef.current = 0
    resumeAbsRef.current = start
    setShortTime(0)
    if (el) {
      try {
        el.currentTime = start
      } catch {
        /* ignore */
      }
    }
    setStatus(`Intro cortada @ ${formatTime(start)}`)
  }

  const save = async () => {
    if (!timeline) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/shorts/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar')
      setTimeline(data.timeline)
      setDirty(false)
      setStatus('Salvo')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const exportPremiere = async () => {
    setExportingPremiere(true)
    setStatus(null)
    try {
      if (dirty && timeline) {
        const saveRes = await fetch(`/api/shorts/${encodeURIComponent(slug)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeline }),
        })
        const saveData = await saveRes.json()
        if (!saveRes.ok) {
          throw new Error(saveData.error || 'Salve antes de exportar')
        }
        setTimeline(saveData.timeline)
        setDirty(false)
      }
      const res = await fetch(
        `/api/shorts/${encodeURIComponent(slug)}/export-premiere`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withIntroOffset: false }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha no export')
      const warn = data.warning ? ` · ${data.warning}` : ''
      setStatus(
        `Premiere pronto (cifras + diagramas, sem áudio): ${data.outDir}${warn}`
      )
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Erro ao exportar Premiere')
    } finally {
      setExportingPremiere(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        togglePlay()
        return
      }
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault()
        markLyric()
        return
      }
      if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'c') {
        e.preventDefault()
        markChord()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) markChord()
        else markLyric()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seekShort(playheadRef.current - (e.altKey ? 0.1 : 1))
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        seekShort(playheadRef.current + (e.altKey ? 0.1 : 1))
      }
    }
    // capture: true evita o botão Play também receber o Space
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [togglePlay, markLyric, markChord, seekShort])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        Carregando short…
      </div>
    )
  }

  if (error || !timeline) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
        <h1 className="text-xl font-semibold mb-2">Editor de sync</h1>
        <p className="text-red-400">{error || 'Sem timeline'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sem src inicial — preenchido pelo blob */}
      <audio ref={audioRef} preload="auto" className="hidden" />

      <header className="border-b border-zinc-800 px-6 py-4 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Sync do short
          </h1>
          <p className="text-sm text-zinc-400">
            {timeline.artist} — {timeline.title}
            {!audioReady && hasAudio ? (
              <span className="text-zinc-500"> · carregando áudio…</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {dirty ? (
            <span className="text-amber-400 text-sm">não salvo</span>
          ) : null}
          {status ? (
            <span className="text-zinc-400 text-sm max-w-lg truncate">
              {status}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => void exportPremiere()}
            disabled={exportingPremiere}
            className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-4 py-2 text-sm font-medium"
            title="SRT + markers + PNGs — sem áudio"
          >
            {exportingPremiere ? 'Exportando…' : 'Exportar Premiere'}
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr_300px_300px] gap-4 p-4 max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative w-full max-w-[220px] aspect-[9/16] rounded-xl overflow-hidden border border-zinc-700"
            style={{
              background:
                'radial-gradient(ellipse at 30% 20%, #3b1d5c 0%, #1a1028 55%, #0c0814 100%)',
            }}
          >
            <div className="absolute inset-0 p-3 flex flex-col justify-center pr-[40%]">
              <div className="font-mono text-[9px] text-violet-200 whitespace-pre leading-tight mb-1">
                {liveLine?.chordLine || ' '}
              </div>
              <div className="text-xs font-semibold text-white leading-snug">
                {liveLine?.lyric || '…'}
              </div>
            </div>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[36%] flex flex-col items-center gap-1">
              {diagramChord ? (
                <>
                  <div className="text-[10px] font-bold text-violet-100">
                    {diagramChord}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/shorts/${encodeURIComponent(slug)}/chord?name=${encodeURIComponent(diagramChord)}`}
                    alt={diagramChord}
                    className="w-full rounded bg-white"
                  />
                </>
              ) : null}
            </div>
            <div className="absolute bottom-2 inset-x-0 text-center text-[10px] font-semibold">
              PlayCifras
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 text-center">
            {formatTime(shortTime)} / {formatTime(duration)}
            {audioDuration > 0 ? (
              <span className="text-zinc-600">
                {' '}
                · mp3 {formatTime(audioStart + shortTime)}
              </span>
            ) : null}
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={togglePlay}
                disabled={hasAudio && !audioReady}
                className="rounded-md bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {playing ? 'Pausar' : 'Play'}
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={markLyric}
                className="rounded-md bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-semibold"
              >
                Marcar letra (L)
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={markChord}
                className="rounded-md bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold"
              >
                Marcar diagrama (D)
              </button>
              <button
                type="button"
                onClick={() => seekShort(0)}
                className="rounded-md border border-zinc-600 px-3 py-2 text-sm"
              >
                Início
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelLyric(0)
                  setSelChord(0)
                  setStatus('Cursores no #1')
                }}
                className="rounded-md border border-zinc-600 px-3 py-2 text-sm"
              >
                Reset cursores
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!timeline) return
                  const chordMarks = expandChordMarksFromLyricLines(
                    timeline.lyricLines,
                    timeline.durationSec
                  )
                  setTimeline({ ...timeline, chordMarks })
                  setSelChord(0)
                  setDirty(true)
                  setStatus(`Diagramas: ${chordMarks.length}`)
                }}
                className="rounded-md border border-zinc-600 px-3 py-2 text-sm"
              >
                Expandir diagramas
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!timeline) return
                  const lyricLines = zeroTrackTimings(
                    timeline.lyricLines,
                    timeline.durationSec
                  )
                  const chordMarks = zeroTrackTimings(
                    timeline.chordMarks,
                    timeline.durationSec
                  )
                  setTimeline({ ...timeline, lyricLines, chordMarks })
                  setSelLyric(0)
                  setSelChord(0)
                  setDirty(true)
                  setStatus('Tempos zerados — marque com L e D')
                }}
                className="rounded-md border border-amber-700/60 text-amber-200 px-3 py-2 text-sm"
              >
                Zerar tempos
              </button>
              <button
                type="button"
                onClick={setAudioStartFromNow}
                className="rounded-md border border-zinc-600 px-3 py-2 text-sm"
              >
                Cortar intro
              </button>
            </div>

            <label className="block text-xs text-zinc-400">
              Timeline livre
              <input
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={shortTime}
                onChange={(e) => seekShort(parseFloat(e.target.value))}
                className="w-full mt-1 accent-sky-500"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="text-zinc-400">
                Duração (s)
                <input
                  type="number"
                  step={0.1}
                  min={5}
                  value={timeline.durationSec}
                  onChange={(e) => {
                    setTimeline({
                      ...timeline,
                      durationSec: parseFloat(e.target.value) || 40,
                    })
                    setDirty(true)
                  }}
                  className="mt-1 w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1.5"
                />
              </label>
              <label className="text-zinc-400">
                Corte intro (s)
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  value={timeline.audioStartSec ?? 0}
                  onChange={(e) => {
                    const next = parseFloat(e.target.value) || 0
                    setTimeline({ ...timeline, audioStartSec: next })
                    setDirty(true)
                    resumeAbsRef.current = next + playheadRef.current
                    const el = audioRef.current
                    if (el) {
                      try {
                        el.currentTime = next + playheadRef.current
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                  className="mt-1 w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1.5"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 space-y-1">
            <p className="text-zinc-200 font-medium text-sm">Duas faixas</p>
            <p>
              <kbd className="px-1 bg-zinc-800 rounded">L</kbd> / Enter → letra
            </p>
            <p>
              <kbd className="px-1 bg-zinc-800 rounded">D</kbd> / Shift+Enter →
              diagrama
            </p>
            <p className="pt-1">Espaço = play/pausa (retoma de onde parou)</p>
            <p className="pt-1 text-zinc-500">
              Áudio no editor é só referência. O pacote Premiere leva cifras +
              diagramas — o áudio fica no Premiere.
            </p>
          </div>
        </div>

        <TrackList
          title={`Letras (${timeline.lyricLines.length})`}
          accent="sky"
          selected={selLyric}
          liveIndex={liveLyric?.index ?? -1}
          items={timeline.lyricLines.map((ev: ShortLyricLine, i) => ({
            key: `l-${i}`,
            time: ev.t,
            badge: ev.chords.join(' · ') || '—',
            line1: ev.chordLine,
            line2: ev.lyric,
          }))}
          onSelect={setSelLyric}
        />

        <TrackList
          title={`Diagramas (${timeline.chordMarks.length})`}
          accent="violet"
          selected={selChord}
          liveIndex={liveChord?.index ?? -1}
          items={timeline.chordMarks.map((ev: ShortChordMark, i) => ({
            key: `c-${i}`,
            time: ev.t,
            badge: ev.chord,
            line1: '',
            line2: ev.chord,
          }))}
          onSelect={setSelChord}
        />
      </div>
    </div>
  )
}

function TrackList({
  title,
  accent,
  selected,
  liveIndex,
  items,
  onSelect,
}: {
  title: string
  accent: 'sky' | 'violet'
  selected: number
  liveIndex: number
  items: {
    key: string
    time: number
    badge: string
    line1: string
    line2: string
  }[]
  onSelect: (i: number) => void
}) {
  const activeRing =
    accent === 'sky'
      ? 'ring-sky-600 bg-sky-950/80'
      : 'ring-violet-600 bg-violet-950/80'
  const badgeColor = accent === 'sky' ? 'text-sky-300' : 'text-violet-300'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex flex-col max-h-[calc(100vh-7rem)]">
      <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400">
        {title}
      </div>
      <ul className="overflow-y-auto flex-1">
        {items.map((item, i) => {
          const active = i === selected
          const playingHere = i === liveIndex
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={`w-full text-left px-3 py-2 border-b border-zinc-800/80 text-sm ${
                  active
                    ? `${activeRing} ring-1 ring-inset`
                    : playingHere
                      ? 'bg-zinc-800/80'
                      : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex justify-between gap-2 text-[11px] text-zinc-500 mb-0.5">
                  <span>
                    #{i + 1}{' '}
                    <span className={`font-semibold ${badgeColor}`}>
                      {item.badge}
                    </span>
                  </span>
                  <span className="font-mono">{formatTime(item.time)}</span>
                </div>
                {item.line1 ? (
                  <div className="font-mono text-[10px] text-zinc-500 whitespace-pre truncate">
                    {item.line1}
                  </div>
                ) : null}
                <div className="truncate text-zinc-100">{item.line2}</div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
