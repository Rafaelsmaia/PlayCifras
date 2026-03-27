'use client'

import Link from 'next/link'
import { Star, Eye, Clock, Music } from 'lucide-react'

interface SongCardProps {
  song: {
    id: string
    title: string
    slug: string
    key?: string
    tempo?: number
    difficulty?: string
    views: number
    likes: number
    createdAt: string
    artist: {
      name: string
      slug: string
    }
    chords: Array<{
      name: string
    }>
  }
}

export default function SongCard({ song }: SongCardProps) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Fácil':
        return 'bg-green-100 text-green-800'
      case 'Médio':
        return 'bg-yellow-100 text-yellow-800'
      case 'Difícil':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Link href={`/cifra/${song.slug}`} className="block">
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            <Music className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-lg">
              {song.title}
            </h3>
            <p className="text-sm text-gray-600 truncate mb-2">
              {song.artist.name}
            </p>
            
            <div className="flex items-center space-x-4 mb-3">
              {song.difficulty && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(song.difficulty)}`}>
                  {song.difficulty}
                </span>
              )}
              
              {song.key && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Tom: {song.key}
                </span>
              )}
              
              {song.tempo && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  {song.tempo} BPM
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                {song.views.toLocaleString()}
              </div>
              
              <div className="flex items-center">
                <Star className="h-3 w-3 mr-1" />
                {song.likes}
              </div>
              
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(song.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
            
            {song.chords.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {song.chords.slice(0, 6).map((chord, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {chord.name}
                    </span>
                  ))}
                  {song.chords.length > 6 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      +{song.chords.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
