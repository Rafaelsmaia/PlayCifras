'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import ChordPopup, { type ChordPopupDiagramData } from '@/components/ChordPopup'
import ProfessionalChordDiagram from '@/components/ProfessionalChordDiagram'
import {
  CifraToolbar,
  CifraSongHeader,
  CifraVideoPlaceholder
} from '@/components/cifra/CifraPageLayout'

/** Verde Cifra Club — acordes no corpo da cifra (monoespaçado, sem trocar de fonte). */
const CIFRA_BODY_CHORD_GREEN = '#00a651'
import { extractUniqueChords, parseLineSegments } from '@/lib/chord-markup'
import { normalizeArtistImage } from '@/lib/artist-image'

interface Song {
  id: string
  title: string
  slug: string
  key?: string
  tempo?: number
  difficulty?: string
  content: string
  views: number
  likes: number
  createdAt: string
  /** Diagramas do dicionário global (vindos de GET /api/songs/[slug]). */
  chordDictionary?: Record<string, ChordPopupDiagramData>
  artist: {
    name: string
    slug: string
    image?: string | null
  }
}

function slugFromParams(raw: string | string[] | undefined): string {
  if (raw == null) return ''
  return Array.isArray(raw) ? raw[0] ?? '' : raw
}

function safeDecodePathSegment(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export default function CifraPage() {
  const routeParams = useParams()
  const pathname = usePathname()
  const slugFromPath =
    pathname && pathname.startsWith('/cifra')
      ? safeDecodePathSegment(
          pathname.replace(/^\/cifra\//, '').split('/').filter(Boolean)[0] ?? ''
        )
      : ''
  const slug =
    slugFromParams(routeParams?.slug as string | string[] | undefined) || slugFromPath

  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChord, setSelectedChord] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [showPopup, setShowPopup] = useState(false)
  const [dictionaryChords, setDictionaryChords] = useState<
    Record<string, ChordPopupDiagramData> | null
  >(null)

  useEffect(() => {
    if (!slug) return

    setLoading(true)
    setSong(null)
    setDictionaryChords(null)

    const fetchSong = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[cifra/page] slug (fetch):', slug)
        }
        const response = await fetch(`/api/songs/${encodeURIComponent(slug)}`)
        if (response.ok) {
          const data = (await response.json()) as Song
          if (process.env.NODE_ENV === 'development') {
            console.log('[cifra/page] song carregada:', data?.id, data?.title, 'chordDictionary keys:', data?.chordDictionary ? Object.keys(data.chordDictionary).length : 0)
          }
          setSong(data)
          setDictionaryChords(data.chordDictionary ?? {})
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[cifra/page] API não OK:', response.status, slug)
          }
        }
      } catch (error) {
        console.error('Error fetching song:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchSong()
  }, [slug])

  useEffect(() => {
    if (!song?.id) return

    const registerView = async () => {
      try {
        await fetch(`/api/songs/view/${song.id}`, {
          method: 'POST'
        })
      } catch (error) {
        console.error('Error registering song view:', error)
      }
    }

    void registerView()
  }, [song?.id])

  const chordDiagramMap = useMemo(() => {
    const m = new Map<string, ChordPopupDiagramData | undefined>()
    if (!song) return m
    const dict = dictionaryChords ?? {}
    for (const chordName of extractUniqueChords(song.content)) {
      m.set(chordName, dict[chordName])
    }
    return m
  }, [song, dictionaryChords])

  const resolveChordDiagram = useCallback(
    (chordName: string) => chordDiagramMap.get(chordName),
    [chordDiagramMap]
  )

  const handleChordPointer = useCallback((chordName: string, event: React.MouseEvent) => {
    setSelectedChord(chordName)
    setPopupPosition({ x: event.clientX, y: event.clientY })
    setShowPopup(true)
  }, [])

  const handleChordLeave = useCallback(() => {
    setShowPopup(false)
    setSelectedChord(null)
  }, [])

  const popupDiagramData = useMemo(() => {
    if (!selectedChord) return undefined
    return resolveChordDiagram(selectedChord)
  }, [selectedChord, resolveChordDiagram])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  if (!slug) {
    return (
      <div className="min-h-screen bg-white">
        <div className="py-16 text-center text-gray-600">Carregando cifra...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="py-16 text-center text-gray-600">Carregando cifra...</div>
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-white">
        <div className="py-16 text-center text-gray-600">
          Cifra não encontrada
          <br />
          <Link href="/" className="mt-4 inline-block text-cifra-green">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  const chordsInContent = extractUniqueChords(song.content)
  const contentLines = song.content.split(/\r?\n/)
  const artistImg = normalizeArtistImage(song.artist.image)

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-5 lg:px-8">
        <CifraSongHeader
          title={song.title}
          artistName={song.artist.name}
          artistSlug={song.artist.slug}
          artistImage={artistImg}
          views={song.views}
          likes={song.likes}
        />

        <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:flex-row lg:items-start lg:gap-10">
          <aside className="shrink-0 print:hidden lg:w-14 lg:self-start">
            <CifraToolbar onPrint={handlePrint} />
          </aside>

          <section className="min-w-0 flex-1 py-1 lg:py-0">
            <div className="mx-auto w-full max-w-[800px] rounded-lg bg-[#ffffff] px-4 py-5 sm:px-6 sm:py-6">
              {song.key && (
                <p
                  className="mb-3 font-roboto-mono text-sm font-bold sm:text-base"
                  style={{ color: CIFRA_BODY_CHORD_GREEN }}
                >
                  Tom: {song.key}
                </p>
              )}

              {(song.tempo || song.difficulty) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {song.tempo && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800">
                      {song.tempo} BPM
                    </span>
                  )}
                  {song.difficulty && (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800">
                      {song.difficulty}
                    </span>
                  )}
                </div>
              )}

              <div
                className="cifra-content font-roboto-mono"
                style={{ tabSize: 4 }}
              >
                {contentLines.map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className="block min-h-[1.6em] font-roboto-mono leading-[1.6]"
                  >
                    {line === '' ? (
                      <span aria-hidden="true">{'\u00A0'}</span>
                    ) : (
                      parseLineSegments(line).map((seg, segIndex) => {
                        if (seg.type === 'text') {
                          return (
                            <span key={`${lineIndex}-${segIndex}`}>{seg.value}</span>
                          )
                        }
                        const chordName = seg.value
                        if (seg.variant === 'bracket') {
                          /* Colchetes invisíveis (visibility:hidden) mantêm a largura em mono — alinhamento com a fonte original [Am7] */
                          return (
                            <span
                              key={`${lineIndex}-${segIndex}`}
                              className="cifra-chord cursor-pointer"
                              onMouseEnter={(e) => handleChordPointer(chordName, e)}
                              onMouseMove={(e) => handleChordPointer(chordName, e)}
                              onMouseLeave={handleChordLeave}
                            >
                              <span aria-hidden className="invisible select-none">
                                [
                              </span>
                              <span style={{ color: CIFRA_BODY_CHORD_GREEN }}>
                                {chordName}
                              </span>
                              <span aria-hidden className="invisible select-none">
                                ]
                              </span>
                            </span>
                          )
                        }
                        return (
                          <span
                            key={`${lineIndex}-${segIndex}`}
                            className="cifra-chord cursor-pointer"
                            style={{ color: CIFRA_BODY_CHORD_GREEN }}
                            onMouseEnter={(e) => handleChordPointer(chordName, e)}
                            onMouseMove={(e) => handleChordPointer(chordName, e)}
                            onMouseLeave={handleChordLeave}
                          >
                            {chordName}
                          </span>
                        )
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="w-full shrink-0 print:hidden lg:w-[300px] xl:w-[320px]">
            <div className="print:hidden">
              <CifraVideoPlaceholder posterUrl={artistImg} />
            </div>

            <div className="mt-8 lg:mt-10">
              <h3 className="mb-3 text-base font-bold text-gray-900">Acordes</h3>
              <div className="grid max-h-[min(60vh,520px)] grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden sm:gap-3">
                {chordsInContent.map((chordName) => {
                  const chordData = chordDiagramMap.get(chordName)
                  return (
                    <div
                      key={chordName}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer rounded-md border border-gray-100 p-2 transition sm:p-3 ${
                        selectedChord === chordName
                          ? 'border-violet-500 bg-violet-50/50'
                          : 'hover:border-gray-200'
                      }`}
                      onClick={() =>
                        setSelectedChord(selectedChord === chordName ? null : chordName)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedChord(selectedChord === chordName ? null : chordName)
                        }
                      }}
                    >
                      <ProfessionalChordDiagram
                        chordName={chordName}
                        chordData={chordData}
                        dictionaryReady={dictionaryChords !== null}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <ChordPopup
        chordName={selectedChord ?? ''}
        chordData={popupDiagramData}
        dictionaryReady={dictionaryChords !== null}
        isVisible={showPopup && !!selectedChord}
        position={popupPosition}
      />
    </div>
  )
}
