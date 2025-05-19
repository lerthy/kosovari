import React from 'react'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

// Mock auth store
vi.mock('../lib/services/auth', () => ({ useAuthStore: () => ({ user: { roli: 'admin' } }) }))

// Mock issue store
const sampleIssues = [
  { id: '1', description: 'A', category: 'traffic', status: 'open', created_at: '2025-01-01' },
  { id: '2', description: 'B', category: 'environment', status: 'in_progress', created_at: '2025-02-02' },
  { id: '3', description: 'C', category: 'economy', status: 'resolved', created_at: '2025-03-03' }
]
const mockFetchIssues = vi.fn().mockResolvedValue(undefined)
const mockUpdateStatus = vi.fn().mockResolvedValue(undefined)
vi.mock('../store/issues', () => ({ useIssueStore: () => ({
  issues: sampleIssues,
  fetchIssues: mockFetchIssues,
  updateIssueStatus: mockUpdateStatus
}) }))

// Mock toast
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
import toast from 'react-hot-toast'

// Component under test
import { Admin } from './Admin'

describe('Admin component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects non-admin users', () => {
    // override auth store
    vi.mocked(require('../lib/services/auth').useAuthStore).mockReturnValue({ user: { roli: 'user' } })
    render(<Admin />)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('renders stats and table after loading', async () => {
    render(<Admin />)
    // loading spinner shown initially
    expect(screen.getByRole('status')).toBeInTheDocument()
    // wait for fetch
    await waitFor(() => expect(mockFetchIssues).toHaveBeenCalled())
    // spinner gone
    expect(screen.queryByRole('status')).toBeNull()
    // stats cards
    expect(screen.getByText('Total Issues')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Open Issues')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    // table rows
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('filters issues by status', async () => {
    render(<Admin />)
    await waitFor(() => expect(mockFetchIssues).toHaveBeenCalled())
    const select = screen.getByRole('combobox')
    // filter to open
    fireEvent.change(select, { target: { value: 'open' } })
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.queryByText('B')).toBeNull()
    // filter to resolved
    fireEvent.change(select, { target: { value: 'resolved' } })
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.queryByText('A')).toBeNull()
  })

  it('updates status and shows toast', async () => {
    render(<Admin />)
    await waitFor(() => expect(mockFetchIssues).toHaveBeenCalled())
    // find first row select
    const statusSelects = screen.getAllByRole('combobox')
    const issueSelect = statusSelects[1] // second combobox in table
    fireEvent.change(issueSelect, { target: { value: 'resolved' } })
    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith('1', 'resolved'))
    expect(toast.success).toHaveBeenCalledWith('Status updated successfully')
  })
})
