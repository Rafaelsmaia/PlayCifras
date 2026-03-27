'use client'

import { useState } from 'react'
import { 
  Home, 
  Search, 
  Music, 
  Star, 
  Clock, 
  TrendingUp,
  Users,
  Settings,
  ChevronDown
} from 'lucide-react'

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)

  const menuItems = [
    { icon: Home, label: 'Início', active: true },
    { icon: Search, label: 'Buscar', active: false },
    { icon: Music, label: 'Cifras', active: false },
    { icon: Star, label: 'Favoritos', active: false },
    { icon: Clock, label: 'Recentes', active: false },
    { icon: TrendingUp, label: 'Populares', active: false },
  ]

  const categories = [
    'Rock',
    'Pop',
    'MPB',
    'Sertanejo',
    'Funk',
    'Gospel',
    'Jazz',
    'Blues',
    'Country',
    'Reggae'
  ]

  return (
    <aside className={`bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${
      isExpanded ? 'w-64' : 'w-16'
    }`}>
      <div className="p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center w-full p-2 text-gray-600 hover:text-cifra-green transition-colors"
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${!isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              <a
                href="#"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-cifra-green text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {isExpanded && <span className="font-medium">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categorias</h3>
            <ul className="space-y-1">
              {categories.map((category, index) => (
                <li key={index}>
                  <a
                    href="#"
                    className="block px-3 py-1 text-sm text-gray-600 hover:text-cifra-green hover:bg-gray-50 rounded transition-colors"
                  >
                    {category}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </aside>
  )
}
