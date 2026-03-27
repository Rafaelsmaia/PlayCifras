'use client'

import { Music, Users } from 'lucide-react'

interface Artist {
  id: number
  name: string
  cifras: number
  image: string
}

interface ArtistCardProps {
  artist: Artist
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer text-center">
      <div className="w-16 h-16 bg-cifra-green rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
        {artist.name.charAt(0)}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 truncate">{artist.name}</h3>
      <div className="flex items-center justify-center text-sm text-gray-600">
        <Music className="h-4 w-4 mr-1" />
        {artist.cifras} cifras
      </div>
    </div>
  )
}
