import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock MonsterIcon
vi.mock('./MonsterIcon', () => ({
  __esModule: true,
  default: () => <div data-testid="monster-icon" />,
}))

// Component under test
import ARQRCodeModal from './ARQRCodeModal'
import { Issue } from '../store/issues'

describe('ARQRCodeModal component', () => {
  const mockOnClose = vi.fn()
  const baseIssue: Issue = { id: '1', category: 'ghost', description: '', location: '', title: '' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders null when closed or no issue', () => {
    const { container: c1 } = render(
      <ARQRCodeModal isOpen={false} onClose={mockOnClose} issue={baseIssue} issueIndex={1} />
    )
    expect(c1.firstChild).toBeNull()

    const { container: c2 } = render(
      <ARQRCodeModal isOpen={true} onClose={mockOnClose} issue={null} issueIndex={1} />
    )
    expect(c2.firstChild).toBeNull()
  })

  it('displays correct QR code image based on index and category', () => {
    const { getByAltText } = render(
      <ARQRCodeModal isOpen={true} onClose={mockOnClose} issue={baseIssue} issueIndex={2} />
    )
    const img = getByAltText('ghost Monster AR QR Code') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('/KosovARi.png')
  })

  it('shows fallback error message when image fails to load', () => {
    const { getByAltText, queryByAltText, getByText } = render(
      <ARQRCodeModal isOpen={true} onClose={mockOnClose} issue={baseIssue} issueIndex={3} />
    )
    const img = getByAltText('ghost Monster AR QR Code')
    // simulate image error
    fireEvent.error(img)

    // original img should be removed
    expect(queryByAltText('ghost Monster AR QR Code')).toBeNull()
    // fallback message
    expect(getByText(/QR Code not found\./i)).toBeInTheDocument()
    expect(getByText(/Monster1.png/)).toBeInTheDocument()
  })

  it('calls onClose when close buttons clicked', () => {
    const { getAllByRole } = render(
      <ARQRCodeModal isOpen={true} onClose={mockOnClose} issue={baseIssue} issueIndex={1} />
    )
    // Two close buttons: header and footer
    const buttons = getAllByRole('button', { name: /✕|Close|close/i })
    buttons.forEach(btn => fireEvent.click(btn))
    expect(mockOnClose).toHaveBeenCalledTimes(buttons.length)
  })
})
