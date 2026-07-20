'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

type AdBannerProps = {
  /** Identificador do slot (para analytics / múltiplos banners) */
  slot?: 'cifra-top'
  className?: string
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || ''
const SLOT_IDS: Record<NonNullable<AdBannerProps['slot']>, string> = {
  'cifra-top': process.env.NEXT_PUBLIC_ADSENSE_SLOT_CIFRA_TOP?.trim() || '',
}

/**
 * Faixa de anúncio no estilo Cifra Club (entre header e título da música).
 * Com NEXT_PUBLIC_ADSENSE_* preenchidos, carrega o bloco AdSense;
 * sem credenciais, mantém o espaço reservado (leaderboard ~728×90).
 */
export function AdBanner({ slot = 'cifra-top', className = '' }: AdBannerProps) {
  const pushed = useRef(false)
  const adSlot = SLOT_IDS[slot]
  const enabled = Boolean(ADSENSE_CLIENT && adSlot)

  useEffect(() => {
    if (!enabled || pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* AdSense ainda não carregou ou bloqueador */
    }
  }, [enabled])

  return (
    <div
      className={`print:hidden ${className}`}
      aria-label="Publicidade"
      data-ad-slot={slot}
    >
      <div className="flex min-h-[90px] w-full items-center justify-center overflow-hidden bg-[#f0f0f0] sm:min-h-[100px]">
        {enabled ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: 90 }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={adSlot}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        ) : (
          <span className="select-none text-[11px] uppercase tracking-[0.14em] text-gray-400">
            Publicidade
          </span>
        )}
      </div>
    </div>
  )
}
