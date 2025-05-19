import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'

// Mock categoryMonsters
vi.mock('../store/issues', () => ({
  categoryMonsters: {
    traffic: '/traffic.png',
    environment: '/environment.png',
    economy: '/economy.png',
    living: '/living.png',
    damage: '/damage.png',
    heritage: '/heritage.png'
  }
}))

// Component under test
import MonsterIcon from './MonsterIcon'
import { categoryMonsters } from '../store/issues'

describe('MonsterIcon', () => {
  it('renders an img with correct src, alt and size classes', () => {
    const { getByAltText } = render(<MonsterIcon category="traffic" size="large" className="extra" />)
    const img = getByAltText('traffic monster') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toContain(categoryMonsters.traffic)
    expect(img).toHaveClass('w-20 h-20')
    expect(img).toHaveClass('object-contain')
    expect(img.parentElement).toHaveClass('relative extra')
  })

  it('falls back to emoji on image error', () => {
    const { getByAltText, queryByAltText, getByText } = render(<MonsterIcon category="environment" size="small" />)
    // simulate image error
    const img = getByAltText('environment monster')
    fireEvent.error(img)

    // original img should be removed
    expect(queryByAltText('environment monster')).toBeNull()
    // fallback emoji element
    const emojiDiv = getByText('🌱')
    expect(emojiDiv).toBeInTheDocument()
    // The emoji element should have size classes
    expect(emojiDiv).toHaveClass('w-8')
    expect(emojiDiv).toHaveClass('h-8')
    // And flex container class
    expect(emojiDiv).toHaveClass('flex','items-center','justify-center','bg-gray-100','rounded-full')
  })

  it('uses medium size by default', () => {
    const { getByAltText } = render(<MonsterIcon category="economy" />)
    const img = getByAltText('economy monster')
    expect(img).toHaveClass('w-12 h-12')
  })
})
