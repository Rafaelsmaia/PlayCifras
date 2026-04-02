'use client'

import { Heart, Eye, Star, Clock } from 'lucide-react'

interface Cifra {
  id: number
  title: string
  artist: string
  difficulty: string
  views: number
  rating: number
  chords: string[]
  image: string
}

interface CifraCardProps {
  cifra: Cifra
}

export default function CifraCard({ cifra }: CifraCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil':
        return 'bg-violet-100 text-violet-800'
      case 'Médio':
        return 'bg-yellow-100 text-yellow-800'
      case 'Difícil':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`
    }
    return views.toString()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start space-x-3">
        <div className="w-12 h-12 bg-cifra-green rounded-lg flex items-center justify-center text-white font-bold text-lg">
          {cifra.artist.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{cifra.title}</h3>
          <p className="text-sm text-gray-600 truncate">{cifra.artist}</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(cifra.difficulty)}`}>
              {cifra.difficulty}
            </span>
            <div className="flex items-center text-xs text-gray-500">
              <Star className="h-3 w-3 text-yellow-400 mr-1" />
              {cifra.rating}
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-red-500 transition-colors">
          <Heart className="h-4 w-4" />
        </button>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <div className="flex items-center">
            <Eye className="h-3 w-3 mr-1" />
            {formatViews(cifra.views)}
          </div>
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            3 min
          </div>
        </div>
        <div className="flex space-x-1">
          {cifra.chords.slice(0, 3).map((chord, index) => (
            <span key={index} className="bg-cifra-green text-white text-xs px-2 py-1 rounded">
              {chord}
            </span>
          ))}
          {cifra.chords.length > 3 && (
            <span className="text-xs text-gray-500">+{cifra.chords.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  )
}
