import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Link } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { colors } from '@/constants/theme'

type SongRow = {
  id: string
  title: string
  slug: string
  artist?: { name: string; image?: string | null }
  views?: number
}

type Ranking = {
  songs: SongRow[]
  artists?: { name: string; slug: string; image?: string | null }[]
}

export default function HomeScreen() {
  const [data, setData] = useState<Ranking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<Ranking>('/api/home/ranking')
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.hint}>
          Confira EXPO_PUBLIC_API_URL e se o npm run dev está rodando.
        </Text>
        <Pressable onPress={load} style={styles.btn}>
          <Text style={styles.btnText}>Tentar de novo</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data?.songs || []}
      keyExtractor={(item) => item.id || item.slug}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.brand}>PlayCifras</Text>
          <Text style={styles.subtitle}>Cifras em alta</Text>
        </View>
      }
      refreshing={loading}
      onRefresh={load}
      renderItem={({ item }) => (
        <Link href={`/cifra/${item.slug}`} asChild>
          <Pressable style={styles.card}>
            {item.artist?.image ? (
              <Image
                source={{ uri: item.artist.image }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {(item.artist?.name || item.title || '?').charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {item.artist?.name || 'Artista'}
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  list: { padding: 16, paddingBottom: 40, backgroundColor: colors.background },
  header: { marginBottom: 16 },
  brand: { fontSize: 28, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontWeight: '700', color: colors.primary, fontSize: 18 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 8 },
  hint: { color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },
})
