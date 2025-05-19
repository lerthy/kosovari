import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks
vi.mock('./MonsterIcon', () => ({ __esModule: true, default: () => <div data-testid="monster-icon" /> }))
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('../lib/services/auth', () => ({ useAuthStore: () => ({ user: { perdorues_id: 123, email: 'test@example.com' } }) }))

// Mock supabase with internal spies
vi.mock('../lib/supabase', () => {
  const unsubscribeAuth = vi.fn()
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockResolvedValue({ data: { subscription: { unsubscribe: unsubscribeAuth } } })
  }
  const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }

  const fromMock = vi.fn(() => ({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
  }))
  return { supabase: { from: fromMock, channel: vi.fn(() => mockChannel), auth } }
})

// Component under test
import IssueDetailModal from './IssueDetailModal'
import { Issue } from '../store/issues'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

const baseIssue: Issue = { id: '1', category: 'ghost', description: 'Desc', location: '', title: '', created_at: '2025-05-01T00:00:00Z' }

describe('IssueDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders null when closed', () => {
    const { container } = render(<IssueDetailModal isOpen={false} onClose={vi.fn()} issue={baseIssue} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders issue details and handles like and comment', async () => {
    const onClose = vi.fn()
    const onLikeUpdate = vi.fn()
    const { getByText, getByRole, getByPlaceholderText } = render(
      <IssueDetailModal isOpen onClose={onClose} issue={baseIssue} onLikeUpdate={onLikeUpdate} />
    )
    // Description
    expect(getByText('Desc')).toBeInTheDocument()
    // Like button shows count
    const likeBtn = getByRole('button', { name: /0/ })
    fireEvent.click(likeBtn)
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('perdoruesit_likes'))
    expect(onLikeUpdate).toHaveBeenCalledWith(baseIssue.id, 0)

    // Comment textarea and submit
    const textarea = getByPlaceholderText(/Write your comment/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Nice!' } })
    const submit = getByRole('button', { name: /Post Comment/ })
    fireEvent.click(submit)
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('perdoruesit_comments'))
    expect(textarea.value).toBe('')
    expect(toast.success).toHaveBeenCalledWith('Comment posted successfully')
  })
})
