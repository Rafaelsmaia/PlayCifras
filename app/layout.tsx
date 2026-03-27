import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/providers/auth-provider'
import Header from '@/components/Header'
import './globals.css'
import './test.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PlayCifras - Cifras e Tablaturas',
  description: 'Encontre cifras e tablaturas das suas músicas favoritas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <div className="min-h-screen bg-gray-50">{children}</div>
        </AuthProvider>
      </body>
    </html>
  )
}