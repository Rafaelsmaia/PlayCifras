import type { Metadata } from 'next'
import {
  Fredoka,
  Inter,
  Montserrat,
  Nunito,
  Poppins,
  Roboto_Mono,
} from 'next/font/google'
import { AuthProvider } from '@/components/providers/auth-provider'
import Header from '@/components/Header'
import MobileBottomNav from '@/components/MobileBottomNav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-montserrat',
})
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
})
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
})
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
})
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto-mono',
})

export const metadata: Metadata = {
  title: 'PlayCifras - Cifras e Tablaturas',
  description: 'Encontre cifras e tablaturas das suas músicas favoritas',
  icons: {
    icon: [{ url: '/images/icon.png', type: 'image/png' }],
    apple: '/images/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || ''

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${montserrat.variable} ${nunito.variable} ${poppins.variable} ${fredoka.variable} ${robotoMono.variable}`}
    >
      <head>
        {adsenseClient ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <div className="min-h-screen bg-gray-50 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {children}
          </div>
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
