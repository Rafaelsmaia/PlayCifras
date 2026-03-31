const sk = 'bg-[#e2e8f0] animate-pulse rounded'

export function SongRowSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`h-12 w-12 shrink-0 rounded-md ${sk}`} />
      <div className="w-7 shrink-0">
        <div className={`mx-auto h-4 w-5 ${sk}`} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`h-4 w-[72%] max-w-[220px] ${sk}`} />
        <div className={`h-3 w-[48%] max-w-[140px] ${sk}`} />
      </div>
    </div>
  )
}

export function SongsGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <SongRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function ArtistCircleSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`mb-2 h-[88px] w-[88px] shrink-0 rounded-full sm:h-24 sm:w-24 ${sk}`}
      />
      <div className={`h-3 w-24 max-w-[100px] sm:max-w-[120px] ${sk}`} />
    </div>
  )
}

export function ArtistsRowSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-7 md:gap-x-3">
      {Array.from({ length: count }, (_, i) => (
        <ArtistCircleSkeleton key={i} />
      ))}
    </div>
  )
}
