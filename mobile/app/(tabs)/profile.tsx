import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { colors } from '@/constants/theme'
import { getApiBaseUrl } from '@/lib/api'

const PRIVACY_URL = `${getApiBaseUrl()}/privacidade`
const TERMS_URL = `${getApiBaseUrl()}/termos`

export default function ProfileScreen() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.hint}>Faça login para sincronizar favoritos.</Text>
        <Pressable style={styles.btn} onPress={() => router.push('/login')}>
          <Text style={styles.btnText}>Entrar</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.link}>Privacidade</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(TERMS_URL)}>
          <Text style={styles.link}>Termos de uso</Text>
        </Pressable>
        <Text style={styles.api}>API: {getApiBaseUrl()}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user.name || 'Músico'}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Pressable
        style={[styles.btn, styles.btnOutline]}
        onPress={() => void logout()}
      >
        <Text style={[styles.btnText, { color: colors.primary }]}>Sair</Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}>
        <Text style={styles.link}>Privacidade</Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openURL(TERMS_URL)}>
        <Text style={styles.link}>Termos de uso</Text>
      </Pressable>
      <Text style={styles.api}>API: {getApiBaseUrl()}</Text>
    </View>
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
  container: { flex: 1, padding: 24, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  email: { color: colors.textMuted, marginTop: 6, marginBottom: 24 },
  hint: { color: colors.textMuted, marginVertical: 12, textAlign: 'center' },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  link: {
    marginTop: 16,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  api: {
    marginTop: 24,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
