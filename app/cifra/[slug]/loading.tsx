const sk = 'animate-pulse rounded bg-[#e2e8f0]'

function ChordLineSkeleton({ width }: { width: string }) {
  return (
    <div className="block min-h-[1.6em] font-roboto-mono leading-[1.6]">
      <div className={`h-4 ${width} ${sk}`} />
    </div>
  )
}

export default function CifraLoading() {
  const chordLineWidths = [
    'w-[92%]',
    'w-[78%]',
    'w-[85%]',
    'w-[40%]',
    'w-[88%]',
    'w-[72%]',
    'w-[65%]',
    'w-[50%]',
    'w-[80%]',
    'w-[60%]'
  ]

  return (
    <div className="min-h-screen bg-white" aria-busy="true" aria-label="Carregando cifra">
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-5 lg:px-8">
          <div className={`min-h-[90px] w-full sm:min-h-[100px] ${sk}`} />
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-5 lg:px-8">
        {/* Cabeçalho da música */}
        <div className="flex gap-4 pb-6 sm:gap-6 lg:pb-8">
          <div className={`h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24 ${sk}`} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className={`h-9 w-[min(100%,320px)] sm:h-10 ${sk}`} />
              <div className={`h-4 w-24 ${sk}`} />
            </div>
            <div className={`h-6 w-48 sm:h-7 ${sk}`} />
            <div className="flex flex-wrap gap-2">
              <div className={`h-10 w-full max-w-md flex-1 sm:flex-none sm:w-72 ${sk}`} />
              <div className="h-10 w-40 animate-pulse rounded bg-violet-100" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:flex-row lg:items-start lg:gap-10">
          {/* Toolbar */}
          <aside className="hidden shrink-0 lg:flex lg:w-14 lg:flex-col lg:gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`h-11 w-11 ${sk}`} />
            ))}
          </aside>

          {/* Conteúdo da cifra */}
          <section className="min-w-0 flex-1 py-1 lg:py-0">
            <div className="mx-auto w-full max-w-[800px] rounded-lg bg-white px-4 py-5 sm:px-6 sm:py-6">
              <div className="mb-6 flex items-center justify-center gap-3 py-2">
                <span
                  className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-200 border-r-cifra-green border-t-cifra-green"
                  aria-hidden
                />
                <p className="bg-gradient-to-r from-cifra-green to-emerald-600 bg-clip-text text-sm font-medium text-transparent">
                  Carregando cifra…
                </p>
              </div>

              <div className={`mb-4 h-4 w-24 ${sk}`} />
              <div className="space-y-0 font-roboto-mono" style={{ tabSize: 4 }}>
                {chordLineWidths.map((width, i) => (
                  <ChordLineSkeleton key={i} width={width} />
                ))}
              </div>
            </div>
          </section>

          {/* Sidebar: vídeo */}
          <aside className="w-full shrink-0 lg:w-[420px] xl:w-[480px]">
            <div className={`aspect-video w-full ${sk}`} />
          </aside>
        </div>
      </main>
    </div>
  )
}
