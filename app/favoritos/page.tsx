import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function FavoritosPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login?callbackUrl=/favoritos')
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Favoritos</h1>
      <p className="text-gray-600">Suas cifras salvas aparecerão aqui em breve.</p>
    </main>
  )
}
