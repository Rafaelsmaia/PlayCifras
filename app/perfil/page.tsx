import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login?callbackUrl=/perfil')
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Perfil</h1>
      <p className="text-gray-600">
        Logado como <strong>{session.user.email}</strong>
      </p>
    </main>
  )
}
