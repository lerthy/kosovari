import React from 'react'
import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'react-hot-toast'

// Mocks
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))
vi.mock('../lib/services/location', () => ({
  getCurrentLocation: vi.fn(),
  formatCoordinates: vi.fn((lat, lng) => `${lat},${lng}`),
}))
vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn() },
}))

// Mock store
type Selector<T> = (state: T) => any
const mockFetchIssues = vi.fn()
vi.mock('../store/issues', () => ({
  useIssueStore: (selector: Selector<{ fetchIssues: typeof mockFetchIssues }>) =>
    selector({ fetchIssues: mockFetchIssues }),
}))

// Mock MapController and MapView
const mockSetCenter = vi.fn()
const mockSetZoom = vi.fn()
class MockController {
  setCenter = mockSetCenter
  setZoom = mockSetZoom
}
vi.mock('../controllers/MapController', () => ({
  MapController: vi.fn(() => new MockController()),
}))
vi.mock('../views/MapView', () => ({
  MapView: () => <div data-testid="mapview" />,
}))

// Component under test
import { Home } from './Home'
import { getCurrentLocation } from '../lib/services/location'

// Test suite
describe('Home component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders map view and calls fetchIssues and location request', async () => {
    // Prepare mock position
    const mockPosition = { coords: { latitude: 1, longitude: 2 } } as GeolocationPosition
    ;(getCurrentLocation as unknown as vi.Mock).mockResolvedValue(mockPosition)

    render(<Home />)

    // MapView should be in the document
    expect(document.querySelector('[data-testid="mapview"]')).toBeInTheDocument()

    // fetchIssues should be called once
    expect(mockFetchIssues).toHaveBeenCalledTimes(1)

    // wait for async location effect
    await waitFor(() => {
      expect(getCurrentLocation).toHaveBeenCalled()
      // controller methods should have been called
      expect(mockSetCenter).toHaveBeenCalledWith([1, 2])
      expect(mockSetZoom).toHaveBeenCalledWith(16)
    })
  })

  it('shows error toast if location request fails', async () => {
    // Mock failure
    ;(getCurrentLocation as unknown as vi.Mock).mockRejectedValue(new Error('fail'))
    render(<Home />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Please allow location access to see your coordinates'
      )
      // "Allow location access" button should appear
      expect(document.querySelector('button')).toBeInTheDocument()
      expect(document.querySelector('button')?.textContent).toMatch(/Allow location access/i)
    })
  })
})