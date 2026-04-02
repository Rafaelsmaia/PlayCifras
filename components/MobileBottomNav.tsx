'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { Home, Search, User } from 'lucide-react'

const items = [
  { href: '/', label: 'Início', icon: Home, match: (p: string) => p === '/' },
  {
    href: '/buscar',
    label: 'Busca',
    icon: Search,
    match: (p: string) => p === '/buscar' || p.startsWith('/buscar?')
  },
  {
    href: '/perfil',
    label: 'Perfil',
    icon: User,
    match: (p: string) => p.startsWith('/perfil')
  }
] as const

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm print:hidden md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] px-2 py-1.5 text-[11px] font-semibold transition-colors',
                active
                  ? 'border-t-cifra-green text-cifra-green'
                  : 'border-t-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={active ? 2.25 : 2}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
