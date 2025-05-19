import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase storage
vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'http://example.com/img.jpg' } }),
      }),
    },
  },
}))

// Mock Issue Store
const mockAddIssue = vi.fn().mockResolvedValue(undefined)
vi.mock('../store/issues', () => ({ useIssueStore: () => ({ addIssue: mockAddIssue }) }))

// Component under test
import IssueReportDialog from './IssueReportDialog'

describe('IssueReportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders and allows category selection and description input', () => {
    const onClose = vi.fn()
    const { getByText, getByPlaceholderText } = render(
      <IssueReportDialog onClose={onClose} position={[1, 2]} />
    )
    // Category buttons
    fireEvent.click(getByText('Traffic and Transport'))
    fireEvent.click(getByText('Climate and Environment'))
    // Description
    const desc = getByPlaceholderText('Describe the issue here...') as HTMLTextAreaElement
    fireEvent.change(desc, { target: { value: 'Test issue' } })
    expect(desc.value).toBe('Test issue')
  })

  it('handles image change and remove', () => {
    const onClose = vi.fn()
    const { getByText, container, getByAltText } = render(
      <IssueReportDialog onClose={onClose} position={[1, 2]} />
    )
    // Simulate file selection
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    // Mock FileReader
    const readAsDataURL = vi.spyOn(FileReader.prototype, 'readAsDataURL')
    fireEvent.change(input, { target: { files: [file] } })
    expect(readAsDataURL).toHaveBeenCalled()
    // No remove image yet
    const removeButton = getByText('✕')
    fireEvent.click(removeButton)
    // Preview gone
    expect(container.querySelector('img')).toBeNull()
  })

  it('submits form and calls addIssue and onClose', async () => {
    const onClose = vi.fn()
    const { getByText, getByPlaceholderText, getByRole } = render(
      <IssueReportDialog onClose={onClose} position={[5, 6]} />
    )
    // Fill form
    fireEvent.click(getByText('Heritage'))
    const desc = getByPlaceholderText('Describe the issue here...')
    fireEvent.change(desc, { target: { value: 'Another issue' } })
    // Submit
    const submitBtn = getByRole('button', { name: 'Submit Report' })
    fireEvent.click(submitBtn)
    await waitFor(() => expect(mockAddIssue).toHaveBeenCalledWith({
      category: 'heritage',
      description: 'Another issue',
      latitude: 5,
      longitude: 6,
      status: 'open',
      image_url: 'http://example.com/img.jpg'
    }))
    expect(onClose).toHaveBeenCalled()
  })
})
