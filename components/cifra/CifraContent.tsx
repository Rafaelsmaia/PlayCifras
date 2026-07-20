/** Bloco da cifra renderizado no servidor (HTML já processado). */
export function CifraContent({ html }: { html: string }) {
  return (
    <pre
      className="cifra-content m-0 whitespace-pre-wrap border-0 bg-transparent p-0 font-roboto-mono text-base leading-[1.6]"
      style={{ tabSize: 4 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
