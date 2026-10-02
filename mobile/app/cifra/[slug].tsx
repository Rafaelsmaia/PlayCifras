import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { parseCifraContent, type LineSegment } from '@/lib/chord-markup'
import { ChordDiagram } from '@/components/ChordDiagram'
import { colors } from '@/constants/theme'

type SongPayload = {
  id: string
  title: string
  slug: string
  content: string
  key?: string | null
  chordsInContent?: string[]
  chordDictionary?: Record<
    string,
    { frets?: unknown; fingering?: unknown; name?: string }
  >
  artist?: { name: string }
}

function CifraLine({
  segments,
  onChordPress,
}: {
  segments: LineSegment[]
  onChordPress: (chord: string) => void
}) {
  if (!segments.length) {
    return <Text style={styles.line}>{'\u00A0'}</Text>
  }
  return (
    <Text style={styles.line}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <Text key={i} style={styles.lyric}>
              {seg.value}
            </Text>
          )
        }
        return (
          <Text
            key={i}
            style={styles.chord}
            onPress={() => onChordPress(seg.value)}
          >
            {seg.value}
          </Text>
        )
      })}
    </Text>
  )
}

export default function CifraScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [song, setSong] = useState<SongPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChord, setSelectedChord] = useState<string | null>(null)
  const [favBusy, setFavBusy] = useState(false)
  const [isFav, setIsFav] = useState(false)

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<SongPayload>(
        `/api/songs/${encodeURIComponent(slug)}`
      )
      setSong(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar cifra')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!user || !song?.id) {
      setIsFav(false)
      return
    }
    ;(async () => {
      try {
        const data = await apiFetch<{
          favorites: { songId: string }[]
        }>('/api/mobile/favorites', { auth: true })
        setIsFav(data.favorites.some((f) => f.songId === song.id))
      } catch {
        /* ignore */
      }
    })()
  }, [user, song?.id])

  const lines = useMemo(
    () => (song?.content ? parseCifraContent(song.content) : []),
    [song?.content]
  )

  const toggleFav = useCallback(async () => {
    if (!user) return
    if (!song?.id) return
    setFavBusy(true)
    try {
      if (isFav) {
        await apiFetch(`/api/mobile/favorites?songId=${song.id}`, {
          method: 'DELETE',
          auth: true,
        })
        setIsFav(false)
      } else {
        await apiFetch('/api/mobile/favorites', {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ songId: song.id }),
        })
        setIsFav(true)
      }
    } catch {
      /* ignore */
    } finally {
      setFavBusy(false)
    }
  }, [user, song?.id, isFav])

  useLayoutEffect(() => {
    navigation.setOptions({
      title: song?.title || 'Cifra',
      headerRight: () =>
        user ? (
          <Pressable
            onPress={() => void toggleFav()}
            disabled={favBusy}
            style={{ marginRight: 4, padding: 6 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={24}
              color={colors.primary}
            />
          </Pressable>
        ) : null,
    })
  }, [navigation, song?.title, user, isFav, favBusy, toggleFav])

  const diagram = selectedChord
    ? song?.chordDictionary?.[selectedChord]
    : null

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (error || !song) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Cifra não encontrada'}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.meta}>
          {song.artist?.name || ''}
          {song.key ? ` · Tom ${song.key}` : ''}
        </Text>
        {lines.map((segs, i) => (
          <CifraLine
            key={i}
            segments={segs}
            onChordPress={setSelectedChord}
          />
        ))}
      </ScrollView>

      <Modal
        visible={Boolean(selectedChord)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedChord(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedChord(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedChord}</Text>
            {diagram ? (
              <ChordDiagram
                frets={diagram.frets as number[] | undefined}
                fingering={diagram.fingering as number[] | undefined}
              />
            ) : (
              <Text style={styles.modalBody}>
                Diagrama não disponível para este acorde.
              </Text>
            )}
            <Pressable
              style={styles.modalBtn}
              onPress={() => setSelectedChord(null)}
            >
              <Text style={styles.modalBtnText}>Fechar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: { padding: 16, paddingBottom: 48 },
  meta: { color: colors.textMuted, marginBottom: 16, fontSize: 14 },
  line: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  lyric: { color: colors.text },
  chord: {
    color: colors.chord,
    fontWeight: '700',
  },
  error: { color: colors.danger },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalBody: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: colors.text,
    marginBottom: 16,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '700' },
})
