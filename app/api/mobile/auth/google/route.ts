import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { issueMobileSession } from '@/lib/mobile-auth'

/**
 * Troca idToken do Google (obtido no app Expo) por accessToken PlayCifras.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { idToken?: string }
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : ''
    if (!idToken) {
      return NextResponse.json({ error: 'idToken obrigatório' }, { status: 400 })
    }

    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    )
    if (!googleRes.ok) {
      return NextResponse.json(
        { error: 'idToken Google inválido' },
        { status: 401 }
      )
    }

    const payload = (await googleRes.json()) as {
      sub?: string
      email?: string
      email_verified?: string
      name?: string
      picture?: string
      aud?: string
    }

    const clientIds = [
      process.env.AUTH_GOOGLE_ID,
      process.env.AUTH_GOOGLE_IOS_ID,
      process.env.AUTH_GOOGLE_ANDROID_ID,
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ].filter(Boolean) as string[]

    if (
      clientIds.length &&
      payload.aud &&
      !clientIds.includes(payload.aud)
    ) {
      return NextResponse.json(
        { error: 'Audience Google não autorizada' },
        { status: 401 }
      )
    }

    if (!payload.sub || !payload.email) {
      return NextResponse.json(
        { error: 'Token Google incompleto' },
        { status: 401 }
      )
    }

    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: payload.sub,
        },
      },
      include: { user: true },
    })

    let user = account?.user

    if (!user) {
      const byEmail = await prisma.user.findUnique({
        where: { email: payload.email },
      })
      if (byEmail) {
        user = byEmail
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: payload.sub,
            },
          },
          create: {
            userId: byEmail.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: payload.sub,
            id_token: idToken,
          },
          update: { id_token: idToken },
        })
      } else {
        user = await prisma.user.create({
          data: {
            email: payload.email,
            name: payload.name || null,
            image: payload.picture || null,
            emailVerified:
              payload.email_verified === 'true' ? new Date() : null,
            accounts: {
              create: {
                type: 'oauth',
                provider: 'google',
                providerAccountId: payload.sub,
                id_token: idToken,
              },
            },
          },
        })
      }
    }

    const session = await issueMobileSession(user)
    return NextResponse.json({ ok: true, ...session })
  } catch (e) {
    console.error('[mobile/auth/google]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha no login Google' },
      { status: 500 }
    )
  }
}
