import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso | PlayCifras',
  description: 'Termos de Uso do PlayCifras',
}

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-gray">
      <h1>Termos de Uso</h1>
      <p className="text-sm text-gray-500">Última atualização: julho de 2026</p>
      <p>
        Ao usar o site ou o aplicativo PlayCifras, você concorda com estes termos.
      </p>
      <h2>Serviço</h2>
      <p>
        O PlayCifras oferece cifras, diagramas de acordes e ferramentas relacionadas
        para fins educacionais e de prática musical.
      </p>
      <h2>Conta</h2>
      <p>
        Você é responsável por manter a confidencialidade da sua senha e pelo uso
        da sua conta.
      </p>
      <h2>Conteúdo</h2>
      <p>
        Cifras e materiais podem estar sujeitos a direitos de terceiros. Não
        redistribua conteúdo de forma ilegal.
      </p>
      <h2>Aplicativo móvel</h2>
      <p>
        O app Android/iOS conecta-se à API do PlayCifras. Podemos atualizar o app
        e a API periodicamente.
      </p>
      <h2>Contato</h2>
      <p>
        Dúvidas:{' '}
        <Link href="/privacidade" className="text-violet-700 underline">
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  )
}
