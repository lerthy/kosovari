import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock for getSession
const mockGetSession = vi.fn()
const mockUnsubscribe = vi.fn()
let capturedCallback: (() => void) | null = null

// Mock modules
vi.mock('../lib/services/auth', () => ({
  useAuthStore: () => ({ getSession: mockGetSession }),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: () => void) => {
        capturedCallback = callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      }
    }
  }
}))

// Component under test
import { AuthProvider } from './AuthProvider'

// Test suite
describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCallback = null
  })

  it('calls getSession on mount and on auth state change, and unsubscribes on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <div data-testid="child" />
      </AuthProvider>
    )

    // Initial getSession call
    expect(mockGetSession).toHaveBeenCalledTimes(1)

    // Simulate auth state change
    expect(capturedCallback).toBeInstanceOf(Function)
    capturedCallback!()
    expect(mockGetSession).toHaveBeenCalledTimes(2)

    // Unmount and ensure unsubscribe called
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('renders its children', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <span data-testid="inner">Hello</span>
      </AuthProvider>
    )
    expect(getByTestId('inner')).toHaveTextContent('Hello')
  })
})
