'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Heart, Share, Download } from 'lucide-react'
import Link from 'next/link'
import ChordPopup, { type ChordPopupDiagramData } from '@/components/ChordPopup'
import ProfessionalChordDiagram from '@/components/ProfessionalChordDiagram'
import { extractUniqueChords, parseLineSegments } from '@/lib/chord-markup'

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
  artist: {
    name: string
    slug: string
  }
  chords: Array<{
    id: string
    name: string
    frets: string
    fingering: string
    barre: boolean
    barreFret?: number
    openStrings: string
    mutedStrings: string
  }>
}

function toDiagramData(
  chordName: string,
  available: Song['chords']
): ChordPopupDiagramData | undefined {
  const chordData = available.find((c) => c.name === chordName)
  if (!chordData) return undefined
  return {
    frets: JSON.parse(chordData.frets) as number[],
    fingering: JSON.parse(chordData.fingering) as number[],
    barres: chordData.barre
      ? [
          {
            fromString: 1,
            toString: 6,
            fret: chordData.barreFret || 1
          }
        ]
      : []
  }
}

export default function CifraPage({ params }: { params: { slug: string } }) {
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChord, setSelectedChord] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const response = await fetch(`/api/songs/${params.slug}`)
        if (response.ok) {
          const data = await response.json()
          setSong(data)
        }
      } catch (error) {
        console.error('Error fetching song:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSong()
  }, [params.slug])

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
    if (!song || !selectedChord) return undefined
    return toDiagramData(selectedChord, song.chords || [])
  }, [song, selectedChord])

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Carregando cifra...</div>
        </div>
      </div>
    )
  }

  if (!song) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Cifra não encontrada</div>
          <Link
            href="/"
            style={{
              color: '#00a651',
              textDecoration: 'none',
              marginTop: '16px',
              display: 'inline-block'
            }}
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  const chordsInContent = extractUniqueChords(song.content)
  const availableChords = song.chords || []
  const contentLines = song.content.split('\n')

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <header className="header">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '64px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <ArrowLeft style={{ height: '20px', width: '20px' }} />
                <span style={{ fontSize: '16px' }}>Voltar</span>
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Heart style={{ height: '16px', width: '16px' }} />
                {song.likes}
              </button>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Share style={{ height: '16px', width: '16px' }} />
                Compartilhar
              </button>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Download style={{ height: '16px', width: '16px' }} />
                PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
          <div className="card">
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                {song.title}
              </h1>
              <p style={{ fontSize: '18px', color: '#666', marginBottom: '16px' }}>
                {song.artist.name}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px',
                  flexWrap: 'wrap'
                }}
              >
                {song.key && (
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Tom: {song.key}
                  </span>
                )}
                {song.tempo && (
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#f3e5f5',
                      color: '#7b1fa2',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {song.tempo} BPM
                  </span>
                )}
                {song.difficulty && (
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#e8f5e8',
                      color: '#2e7d32',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {song.difficulty}
                  </span>
                )}
              </div>
            </div>

            <div
              className="cifra-content"
              style={{
                fontFamily: "'Roboto Mono', 'Courier New', monospace",
                lineHeight: 1.35,
                wordBreak: 'break-word',
                fontSize: 15,
                color: '#333',
                tabSize: 4
              }}
            >
              {contentLines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  style={{ whiteSpace: 'pre', lineHeight: 1.35, minHeight: '1.35em' }}
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
                      return (
                        <span
                          key={`${lineIndex}-${segIndex}`}
                          className="chord"
                          style={{
                            color: '#00a651',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            padding: '0 1px'
                          }}
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

          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              Acordes
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}
            >
              {chordsInContent.map((chordName) => {
                const chordData = availableChords.find((c) => c.name === chordName)
                return (
                  <div
                    key={chordName}
                    style={{
                      padding: '12px',
                      border:
                        selectedChord === chordName ? '2px solid #00a651' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor:
                        selectedChord === chordName ? '#f0f9ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                    onClick={() =>
                      setSelectedChord(selectedChord === chordName ? null : chordName)
                    }
                  >
                    <ProfessionalChordDiagram
                      chordName={chordName}
                      chordData={
                        chordData
                          ? {
                              frets: JSON.parse(chordData.frets) as number[],
                              fingering: JSON.parse(chordData.fingering) as number[],
                              barres: chordData.barre
                                ? [
                                    {
                                      fromString: 1,
                                      toString: 6,
                                      fret: chordData.barreFret || 1
                                    }
                                  ]
                                : []
                            }
                          : undefined
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <ChordPopup
        chordName={selectedChord ?? ''}
        chordData={popupDiagramData}
        isVisible={showPopup && !!selectedChord}
        position={popupPosition}
      />
    </div>
  )
}
