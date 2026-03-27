import { Suspense } from 'react'
import BuscarClient from './BuscarClient'

export default function BuscarPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-6">
      <Suspense
        fallback={
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
            Carregando busca...
          </div>
        }
      >
        <BuscarClient />
      </Suspense>
    </div>
  )
}
