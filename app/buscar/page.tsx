import { Suspense } from 'react'
import BuscarClient from './BuscarClient'

export default function BuscarPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="text-gray-500">Carregando...</p>}>
        <BuscarClient />
      </Suspense>
    </div>
  )
}
