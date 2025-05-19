import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth store
vi.mock('../lib/services/auth', () => ({
  useAuthStore: () => ({ user: { auth_id: 'user1' } })
}))

// Mock supabase with chainable builder
vi.mock('../lib/supabase', () => {
  const unsubscribe = vi.fn()
  const subscription = { unsubscribe }
  const channel = vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(() => subscription) }))

  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  builder.insert = vi.fn().mockResolvedValue({ error: null })
  builder.delete = vi.fn().mockResolvedValue({ error: null })
  // thenable for fetchLikeCount
  builder.then = (onFulfilled: any) => onFulfilled({ data: [], count: 3, error: null })

  const from = vi.fn(() => builder)
  return { supabase: { channel, from } }
})

// Mock toast
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

// Component under test
import LikeButton from './LikeButton'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

describe('LikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial count and subscribes to changes', () => {
    const onUpdate = vi.fn()
    const { getByText } = render(<LikeButton issueId="iss1" initialCount={2} onUpdate={onUpdate} />)
    expect(getByText('2 likes')).toBeInTheDocument()
    expect(supabase.channel).toHaveBeenCalledWith('likes_changes')
  })

  it('increments like on click and calls onUpdate', async () => {
    const onUpdate = vi.fn()
    const { getByText } = render(<LikeButton issueId="iss1" initialCount={1} onUpdate={onUpdate} />)

    fireEvent.click(getByText('1 like'))
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('likes')
      // First update is +1
      expect(onUpdate).toHaveBeenCalledWith(2)
      expect(getByText('2 likes')).toBeInTheDocument()
    })
  })

  it('cleans up subscription on unmount', () => {
    const { unmount } = render(<LikeButton issueId="iss1" />)
    unmount()
    const subscription = supabase.channel().subscribe()
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })
})
