import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Link, router, useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors } from '@/constants/theme'

type Fav = {
  id: string
  songId: string
  song: {
    title: string
    slug: string
    artist?: { name: string }
  }
}

export default function FavoritesScreen() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<Fav[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ favorites: Fav[] }>(
        '/api/mobile/favorites',
        { auth: true }
      )
      setItems(data.favorites || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha')
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Favoritos</Text>
        <Text style={styles.hint}>Entre para ver suas cifras salvas.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.btnText}>Entrar</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(f) => f.id}
      refreshing={loading}
      onRefresh={load}
      ListEmptyComponent={
        !loading ? (
          <Text style={styles.empty}>Nenhum favorito ainda.</Text>
        ) : null
      }
      ListHeaderComponent={
        error ? <Text style={styles.error}>{error}</Text> : null
      }
      renderItem={({ item }) => (
        <Link href={`/cifra/${item.song.slug}`} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{item.song.title}</Text>
            <Text style={styles.cardSub}>
              {item.song.artist?.name || ''}
            </Text>
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
  list: { padding: 16, backgroundColor: colors.background, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  hint: { color: colors.textMuted, marginVertical: 12, textAlign: 'center' },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontWeight: '700', fontSize: 16, color: colors.text },
  cardSub: { color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  error: { color: colors.danger, marginBottom: 8 },
})
