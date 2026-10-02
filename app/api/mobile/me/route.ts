import { NextResponse } from 'next/server'
import { requireMobileUser } from '@/lib/mobile-auth'

export async function GET(req: Request) {
  const userOrRes = await requireMobileUser(req)
  if (userOrRes instanceof Response) return userOrRes
  return NextResponse.json({ ok: true, user: userOrRes })
}
