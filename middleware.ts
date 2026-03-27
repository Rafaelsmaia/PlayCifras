import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Protege rotas sem importar `auth.ts` (Prisma/bcrypt não rodam no Edge).
 * A sessão JWT é validada apenas com o segredo.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })

  const path = request.nextUrl.pathname
  if (
    (path.startsWith('/perfil') || path.startsWith('/favoritos')) &&
    !token
  ) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/perfil/:path*', '/favoritos/:path*'],
}
