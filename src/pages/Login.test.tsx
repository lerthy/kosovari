import { describe, it, vi, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../pages/Login'
import { MemoryRouter } from 'react-router-dom'

// Mocks
const mockNavigate = vi.fn()
const mockSignIn = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../lib/services/auth', () => ({
  useAuthStore: () => ({
    signIn: mockSignIn,
  }),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('<Login />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form', () => {
    render(<Login />, { wrapper: MemoryRouter })

    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('allows input and submits successfully', async () => {
    mockSignIn.mockResolvedValueOnce(undefined)

    render(<Login />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows error toast on failed login', async () => {
    const error = new Error('Invalid credentials')
    mockSignIn.mockRejectedValueOnce(error)

    const { getByPlaceholderText, getByRole } = render(<Login />, {
      wrapper: MemoryRouter,
    })

    fireEvent.change(getByPlaceholderText(/email address/i), {
      target: { value: 'fail@example.com' },
    })
    fireEvent.change(getByPlaceholderText(/password/i), {
      target: { value: 'wrongpass' },
    })

    fireEvent.click(getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Sign in')
    })

    expect(mockSignIn).toHaveBeenCalledWith('fail@example.com', 'wrongpass')
  })

  it('navigates to register page on button click', () => {
    render(<Login />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/register')
  })
})
