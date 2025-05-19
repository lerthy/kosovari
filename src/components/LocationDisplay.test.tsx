// Mocks at top
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock services/location
vi.mock('../lib/services/location', () => {
  const mockPosition = {
    coords: { latitude: 10, longitude: 20, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: 123456789
  }
  return {
    isGeolocationAvailable: () => true,
    getCurrentLocation: vi.fn().mockResolvedValue(mockPosition),
    formatCoordinates: vi.fn((lat, lng) => `${lat},${lng}`),
  }
})

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))

// Mock permissions API before component import
const mockQuery = vi.fn().mockResolvedValue({ state: 'granted', addEventListener: vi.fn() })
Object.defineProperty(navigator, 'permissions', { value: { query: mockQuery } })

// Spy window.open
const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

// Component and mocks imports
import LocationDisplay from './LocationDisplay'
import { getCurrentLocation, formatCoordinates } from '../lib/services/location'
import { toast } from 'react-hot-toast'

describe('LocationDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches location on mount and displays coordinates', async () => {
    const onUpdate = vi.fn()
    const { getByText } = render(<LocationDisplay onLocationUpdate={onUpdate} />)

    await waitFor(() => expect(getCurrentLocation).toHaveBeenCalled())
    expect(onUpdate).toHaveBeenCalled()
    expect(getByText('Coordinates:')).toBeInTheDocument()
    expect(getByText('10,20')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Location updated successfully')
  })

  it('navigates to location when Navigate clicked', async () => {
    const { findByText } = render(<LocationDisplay />)
    await waitFor(() => expect(getCurrentLocation).toHaveBeenCalled())
    const navBtn = await findByText('Navigate')
    fireEvent.click(navBtn)
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=10,20', '_blank'
    )
  })

  it('shows prompt when permissionState is prompt', () => {
    mockQuery.mockResolvedValueOnce({ state: 'prompt', addEventListener: vi.fn() })
    const { getByText } = render(<LocationDisplay />)
    expect(getByText(/allow location access/i)).toBeInTheDocument()
  })

  it('handles geolocation unavailable', () => {
    // Override availability
    vi.mocked(require('../lib/services/location').isGeolocationAvailable).mockReturnValue(false)
    const { getByText } = render(<LocationDisplay />)
    expect(getByText('Geolocation is not supported by your browser')).toBeInTheDocument()
  })
})
