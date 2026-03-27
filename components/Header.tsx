'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Menu, User, Heart, Music, LogOut, CircleUser } from 'lucide-react'
import SearchBar from '@/components/SearchBar'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { data: session, status } = useSession()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isLoading = status === 'loading'

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-cifra-green" />
              <span className="text-2xl font-bold text-cifra-green">PlayCifras</span>
            </Link>
          </div>

          <div className="mx-8 flex min-w-0 flex-1 max-w-2xl">
            <SearchBar />
          </div>

          <div className="flex items-center space-x-4">
            {session?.user ? (
              <Link
                href="/favoritos"
                className="p-2 text-gray-600 hover:text-cifra-green transition-colors"
                aria-label="Favoritos"
              >
                <Heart className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                className="p-2 text-gray-400 cursor-not-allowed"
                aria-label="Favoritos (faça login)"
                title="Faça login para ver favoritos"
              >
                <Heart className="h-5 w-5" />
              </button>
            )}

            {isLoading ? (
              <div className="h-9 w-24 rounded-lg bg-gray-100 animate-pulse" />
            ) : session?.user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cifra-green/15 text-cifra-green">
                      <User className="h-5 w-5" />
                    </span>
                  )}
                  <span className="hidden sm:inline max-w-[140px] truncate text-sm font-medium text-gray-800">
                    {session.user.name || session.user.email}
                  </span>
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50"
                    role="menu"
                  >
                    <Link
                      href="/perfil"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Perfil
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false)
                        void signOut({ callbackUrl: '/' })
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-[#ff6b00] bg-transparent px-4 py-2.5 text-sm font-bold text-[#ff6b00] transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] focus-visible:ring-offset-2"
              >
                <CircleUser className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="whitespace-nowrap">Entrar ou criar conta</span>
              </Link>
            )}

            <button
              type="button"
              className="md:hidden p-2 text-gray-600 hover:text-cifra-green transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
