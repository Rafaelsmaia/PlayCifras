import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/database'
import { issueMobileSession } from '@/lib/mobile-auth'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string
      password?: string
    }
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.password) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos.' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos.' },
        { status: 401 }
      )
    }

    const session = await issueMobileSession(user)
    return NextResponse.json({ ok: true, ...session })
  } catch (e) {
    console.error('[mobile/auth/login]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha no login' },
      { status: 500 }
    )
  }
}
