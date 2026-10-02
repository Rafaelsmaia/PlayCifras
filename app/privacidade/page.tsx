import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacidade | PlayCifras',
  description: 'Política de Privacidade do PlayCifras',
}

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-gray">
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-gray-500">Última atualização: julho de 2026</p>
      <p>
        O PlayCifras (&quot;nós&quot;) opera o site e o aplicativo móvel PlayCifras. Esta
        política descreve quais dados coletamos e como os usamos.
      </p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Conta: nome, e-mail e senha (criptografada) ou dados do login Google.</li>
        <li>Uso: cifras favoritas, preferências e métricas agregadas de visualização.</li>
        <li>Técnicos: logs de erro e diagnósticos do app/site.</li>
      </ul>
      <h2>Como usamos</h2>
      <p>
        Para autenticar você, sincronizar favoritos entre dispositivos, melhorar o
        produto e cumprir obrigações legais.
      </p>
      <h2>Compartilhamento</h2>
      <p>
        Não vendemos seus dados. Podemos usar provedores de infraestrutura
        (hospedagem, autenticação) sob contratos de confidencialidade.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar exclusão ou correção da conta pelo e-mail de contato
        do PlayCifras.
      </p>
      <p>
        <Link href="/termos" className="text-violet-700 underline">
          Ver Termos de Uso
        </Link>
      </p>
    </main>
  )
}
