import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-gray-600">
          Carregando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
