import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RegisterForm } from './RegisterForm'

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock authService.createUser
const mockCreateUser = vi.fn()
vi.mock('../lib/services/authService', () => ({
  createUser: (...args: any[]) => mockCreateUser(...args),
}))

// Mock toast
const mockSuccess = vi.fn()
const mockError = vi.fn()
vi.mock('react-hot-toast', () => ({
  default: {
    success: (msg: string) => mockSuccess(msg),
    error: (msg: string) => mockError(msg),
  },
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits form successfully and navigates', async () => {
    // Arrange: successful createUser
    mockCreateUser.mockResolvedValueOnce({})
    const { getByLabelText, getByRole } = render(<RegisterForm />)

    // Fill out form fields
    fireEvent.change(getByLabelText(/Emri/i), { target: { value: 'John Doe' } })
    fireEvent.change(getByLabelText(/Email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(getByLabelText(/Fjalëkalimi/i), { target: { value: 'password123' } })
    fireEvent.change(getByLabelText(/Roli/i), { target: { value: 'institution' } })

    // Act: submit form
    fireEvent.click(getByRole('button', { name: /Regjistrohu/i }))

    // Assert: loading state, service call, toasts, navigation
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledOnce()
      expect(mockCreateUser).toHaveBeenCalledWith({
        emri: 'John Doe',
        email: 'john@example.com',
        password_hash: 'password123',
        roli: 'institution',
        leveli: 0,
        pike_eksperience: 0,
      })
      expect(mockSuccess).toHaveBeenCalledWith('Regjistrimi u krye me sukses!')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('shows error toast on registration failure', async () => {
    // Arrange: failing createUser
    mockCreateUser.mockRejectedValueOnce(new Error('Failed'))
    const { getByLabelText, getByRole } = render(<RegisterForm />)

    // Fill only required fields
    fireEvent.change(getByLabelText(/Emri/i), { target: { value: 'Jane' } })
    fireEvent.change(getByLabelText(/Email/i), { target: { value: 'jane@example.com' } })
    fireEvent.change(getByLabelText(/Fjalëkalimi/i), { target: { value: 'pwd' } })

    // Act: submit form
    fireEvent.click(getByRole('button', { name: /Regjistrohu/i }))

    // Assert: error toast
    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('Gabim gjatë regjistrimit. Ju lutem provoni përsëri.')
      // Should not navigate on failure
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})
