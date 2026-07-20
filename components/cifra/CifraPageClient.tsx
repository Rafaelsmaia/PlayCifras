'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ChordPopup from '@/components/ChordPopup'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { CifraToolbar } from '@/components/cifra/CifraPageLayout'
import { CifraVideoPlaceholder } from '@/components/cifra/CifraVideoPlaceholder'
import { CHORD_PURPLE } from '@/components/cifra/constants'

type CifraPageClientProps = {
  songId: string
  chordsInContent: string[]
  chordDictionary: Record<string, ChordPopupDiagramData>
  songKey?: string | null
  tempo?: number | null
  difficulty?: string | null
  artistImg: string | null
  youtubeVideoId?: string | null
  songTitle?: string
  children: ReactNode
}

export default function CifraPageClient({
  songId,
  chordsInContent,
  chordDictionary,
  songKey,
  tempo,
  difficulty,
  artistImg,
  youtubeVideoId,
  songTitle,
  children
}: CifraPageClientProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const registerView = async () => {
      try {
        await fetch(`/api/songs/view/${songId}`, { method: 'POST' })
      } catch (error) {
        console.error('Error registering song view:', error)
      }
    }
    void registerView()
  }, [songId])

  const [selectedChord, setSelectedChord] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [showPopup, setShowPopup] = useState(false)

  const chordDiagramMap = useMemo(() => {
    const m = new Map<string, ChordPopupDiagramData | undefined>()
    for (const chordName of chordsInContent) {
      m.set(chordName, chordDictionary[chordName])
    }
    return m
  }, [chordsInContent, chordDictionary])

  const resolveChordDiagram = useCallback(
    (chordName: string) => chordDiagramMap.get(chordName),
    [chordDiagramMap]
  )

  const handleChordPointer = useCallback((chordName: string, event: MouseEvent) => {
    setSelectedChord(chordName)
    setPopupPosition({ x: event.clientX, y: event.clientY })
    setShowPopup(true)
  }, [])

  const handleChordLeave = useCallback(() => {
    setShowPopup(false)
    setSelectedChord(null)
  }, [])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return

    const onEnter = (event: Event) => {
      const el = event.currentTarget as HTMLElement
      const chord = el.getAttribute('data-chord')
      if (chord) handleChordPointer(chord, event as MouseEvent)
    }

    const onMove = (event: Event) => {
      const el = event.currentTarget as HTMLElement
      const chord = el.getAttribute('data-chord')
      if (chord) handleChordPointer(chord, event as MouseEvent)
    }

    const onLeave = () => handleChordLeave()

    const chordEls = Array.from(root.querySelectorAll<HTMLElement>('.cifra-chord'))
    chordEls.forEach((el) => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
    })

    return () => {
      chordEls.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [children, handleChordPointer, handleChordLeave])

  const popupDiagramData = useMemo(() => {
    if (!selectedChord) return undefined
    return resolveChordDiagram(selectedChord)
  }, [selectedChord, resolveChordDiagram])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <>
      <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="shrink-0 print:hidden lg:w-14 lg:self-start">
          <CifraToolbar onPrint={handlePrint} />
        </aside>

        <section className="min-w-0 flex-1 py-1 lg:py-0">
          <div className="mx-auto w-full max-w-[800px] rounded-lg bg-[#ffffff] px-4 py-5 sm:px-6 sm:py-6">
            {songKey && (
              <p
                className="mb-3 font-roboto-mono text-sm font-bold sm:text-base"
                style={{ color: CHORD_PURPLE }}
              >
                Tom: {songKey}
              </p>
            )}

            {(tempo || difficulty) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {tempo && (
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800">
                    {tempo} BPM
                  </span>
                )}
                {difficulty && (
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
                    {difficulty}
                  </span>
                )}
              </div>
            )}

            <div ref={contentRef}>{children}</div>
          </div>
        </section>

        <aside className="w-full shrink-0 print:hidden lg:sticky lg:top-24 lg:w-[420px] xl:w-[480px]">
          <div className="print:hidden">
            <CifraVideoPlaceholder
              youtubeVideoId={youtubeVideoId}
              posterUrl={artistImg}
              title={songTitle ? `Clipe — ${songTitle}` : 'Clipe da música'}
            />
          </div>
        </aside>
      </div>

      <ChordPopup
        chordName={selectedChord ?? ''}
        chordData={popupDiagramData}
        dictionaryReady
        isVisible={showPopup && !!selectedChord}
        position={popupPosition}
      />
    </>
  )
}
