/**
 * Auth Bearer JWT para o app React Native (independente dos cookies NextAuth).
 */
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/database'

const MOBILE_ISS = 'playcifras-mobile'
const MOBILE_AUD = 'playcifras-app'
const TOKEN_TTL = '30d'

export type MobileUser = {
  id: string
  email: string | null
  name: string | null
  image: string | null
}

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.MOBILE_JWT_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET (ou MOBILE_JWT_SECRET) não configurado')
  }
  return new TextEncoder().encode(secret)
}

export function toMobileUser(user: {
  id: string
  email: string | null
  name: string | null
  image: string | null
}): MobileUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  }
}

export async function signMobileAccessToken(user: MobileUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    image: user.image,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(MOBILE_ISS)
    .setAudience(MOBILE_AUD)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret())
}

export async function verifyMobileAccessToken(
  token: string
): Promise<MobileUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: MOBILE_ISS,
      audience: MOBILE_AUD,
    })
    const id = payload.sub
    if (!id) return null
    return {
      id,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
      image: typeof payload.image === 'string' ? payload.image : null,
    }
  } catch {
    return null
  }
}

export function bearerFromRequest(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!h) return null
  const m = /^Bearer\s+(.+)$/i.exec(h.trim())
  return m?.[1]?.trim() || null
}

export async function requireMobileUser(
  req: Request
): Promise<MobileUser | Response> {
  const token = bearerFromRequest(req)
  if (!token) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const user = await verifyMobileAccessToken(token)
  if (!user) {
    return Response.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }
  // Confirma que o usuário ainda existe
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, image: true },
  })
  if (!dbUser) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 401 })
  }
  return toMobileUser(dbUser)
}

export async function issueMobileSession(user: {
  id: string
  email: string | null
  name: string | null
  image: string | null
}) {
  const mobileUser = toMobileUser(user)
  const accessToken = await signMobileAccessToken(mobileUser)
  return { accessToken, user: mobileUser }
}
