import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const TOKEN_KEY = 'playcifras.accessToken'

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  // Android emulator → host machine
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000'
  return 'http://localhost:3000'
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    return
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = options
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const nextHeaders = new Headers(headers || {})
  if (!nextHeaders.has('Content-Type') && rest.body) {
    nextHeaders.set('Content-Type', 'application/json')
  }
  if (auth) {
    const token = await getAccessToken()
    if (token) nextHeaders.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, { ...rest, headers: nextHeaders })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError(
      res.ok ? 'Resposta inválida da API' : `HTTP ${res.status}`,
      res.status
    )
  }

  if (!res.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`
    throw new ApiError(err, res.status)
  }

  return data as T
}
