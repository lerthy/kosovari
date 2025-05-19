import { describe, it, vi, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Register from '../pages/Register'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
const mockSignUp = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../lib/services/auth', () => ({
  useAuthStore: () => ({
    signUp: mockSignUp,
  }),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('<Register />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form inputs and button', () => {
    render(<Register />, { wrapper: MemoryRouter })

    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter your full name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<Register />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: 'differentpass' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows error when password is too short', async () => {
    render(<Register />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: '123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: '123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows error when name is missing', async () => {
    render(<Register />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('calls signUp and navigates on successful registration', async () => {
    mockSignUp.mockResolvedValueOnce({ user: {} })

    render(<Register />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: 'Jane Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Jane Doe')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('displays error if signUp fails', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('Email already in use'))

    render(<Register />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'taken@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: 'Someone' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
    })
  })

  it('navigates to login when clicking login link', () => {
    render(<Register />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: /already have an account\? sign in/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
