import type { Metadata } from 'next'
import { Inter, Montserrat, Roboto_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/providers/auth-provider'
import Header from '@/components/Header'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-montserrat',
})
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto-mono',
})

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
    <html lang="pt-BR" className={`${montserrat.variable} ${robotoMono.variable}`}>
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <div className="min-h-screen bg-gray-50">{children}</div>
        </AuthProvider>
      </body>
    </html>
  )
}