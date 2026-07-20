import Script from 'next/script'

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || ''

/** Carrega o script do AdSense uma vez no layout (só se houver client id). */
export function AdSenseScript() {
  if (!ADSENSE_CLIENT) return null

  return (
    <Script
      id="adsense-loader"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  )
}
