import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { colors } from '@/constants/theme'

type SongHit = {
  id?: string
  title: string
  slug: string
  artist?: { name: string } | string
}

export default function SearchScreen() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SongHit[]>([])
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (term: string) => {
    const query = term.trim()
    if (query.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{
        songs?: SongHit[]
        results?: SongHit[]
      }>(`/api/search?q=${encodeURIComponent(query)}&type=songs&limit=30`)
      const list = data.songs || data.results || []
      setResults(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na busca')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Música ou artista…"
        placeholderTextColor={colors.textMuted}
        value={q}
        onChangeText={(t) => {
          setQ(t)
          void search(t)
        }}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(item, i) => item.slug || item.id || String(i)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const artistName =
            typeof item.artist === 'string'
              ? item.artist
              : item.artist?.name || ''
          return (
            <Link href={`/cifra/${item.slug}`} asChild>
              <Pressable style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.sub}>{artistName}</Text>
              </Pressable>
            </Link>
          )
        }}
        ListEmptyComponent={
          q.trim().length >= 2 && !loading ? (
            <Text style={styles.empty}>Nenhum resultado</Text>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  sub: { color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24 },
  error: { color: colors.danger, marginBottom: 8 },
})
