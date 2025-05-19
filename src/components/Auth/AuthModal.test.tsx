import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useAuthStore } from '../../lib/services/auth'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../../lib/services/auth', () => ({
  useAuthStore: vi.fn()
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('AuthModal', () => {
  const mockSignIn = vi.fn()
  const mockSignUp = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthStore as any).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp
    })
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AuthModal isOpen={false} onClose={mockOnClose} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders sign in form by default when open', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByText("Don't have an account? Sign up")).toBeInTheDocument()
  })

  it('toggles between sign in and sign up modes', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    // Initially in sign in mode
    expect(screen.getByText('Sign In')).toBeInTheDocument()

    // Click to switch to sign up mode
    await user.click(screen.getByText("Don't have an account? Sign up"))
    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument()

    // Click to switch back to sign in mode
    await user.click(screen.getByText('Already have an account? Sign in'))
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('handles sign in submission', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    // Fill in form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    // Verify sign in was called
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(toast.success).toHaveBeenCalledWith('Signed in successfully!')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles sign up submission', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    // Switch to sign up mode
    await user.click(screen.getByText("Don't have an account? Sign up"))

    // Fill in form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    // Verify sign up was called
    expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'test@example.com')
    expect(toast.success).toHaveBeenCalledWith('Account created successfully!')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles sign in error', async () => {
    const error = new Error('Invalid credentials')
    mockSignIn.mockRejectedValueOnce(error)

    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    // Verify error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('handles sign up error', async () => {
    const error = new Error('Email already exists')
    mockSignUp.mockRejectedValueOnce(error)

    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    // Switch to sign up mode and fill form
    await user.click(screen.getByText("Don't have an account? Sign up"))
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    // Verify error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email already exists')
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes modal when close button is clicked', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Close modal'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('validates required fields', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    const user = userEvent.setup()

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    // Check that required fields are validated
    expect(screen.getByLabelText(/email/i)).toBeInvalid()
    expect(screen.getByLabelText(/password/i)).toBeInvalid()
    expect(mockSignIn).not.toHaveBeenCalled()
  })
}) 