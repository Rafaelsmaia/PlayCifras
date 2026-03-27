import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/database'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const name = typeof body.name === 'string' ? body.name.trim() : undefined

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado.' },
        { status: 409 }
      )
    }

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashed,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json(
      { error: 'Não foi possível concluir o cadastro.' },
      { status: 500 }
    )
  }
}
