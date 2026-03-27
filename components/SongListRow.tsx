import Link from 'next/link'
import { Music, Eye } from 'lucide-react'

export interface SongListRowSong {
  id: string
  title: string
  slug: string
  views: number
  key: string | null
}

interface SongListRowProps {
  rank: number
  song: SongListRowSong
}

export default function SongListRow({ rank, song }: SongListRowProps) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition-colors">
      <td className="py-3 pl-2 pr-2 text-center text-sm font-medium text-gray-400 w-10 tabular-nums">
        {rank}
      </td>
      <td className="py-3 pr-3 w-14">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gray-100 text-cifra-green">
          <Music className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
      </td>
      <td className="py-3 pr-4 min-w-0">
        <Link
          href={`/cifra/${song.slug}`}
          className="font-medium text-gray-900 hover:text-cifra-green transition-colors line-clamp-2"
        >
          {song.title}
        </Link>
      </td>
      <td className="py-3 px-2 text-right text-sm text-gray-600 tabular-nums whitespace-nowrap">
        <span className="inline-flex items-center gap-1 justify-end">
          <Eye className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
          {song.views.toLocaleString('pt-BR')}
        </span>
      </td>
      <td className="py-3 pl-2 text-right text-sm text-gray-700 whitespace-nowrap">
        {song.key ? (
          <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
            {song.key}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  )
}
