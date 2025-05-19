// ReportProblem.test.tsx
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportProblem from './ReportProblem';

// Mocks
vi.mock('../store/issues', () => ({
  useIssueStore: () => ({
    addIssue: vi.fn(),
  }),
  IssueCategory: {
    TRAFFIC: 'traffic',
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: 'https://fakeurl.com/image.jpg' },
        }),
      }),
    },
  },
}));

vi.mock('leaflet', () => {
  const mapMock = {
    setView: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn(),
    remove: vi.fn(),
  };
  const tileLayerMock = () => ({ addTo: vi.fn() });
  return {
    map: () => mapMock,
    tileLayer: tileLayerMock,
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      setLatLng: vi.fn(),
    })),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('ReportProblem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form and disables submit when required fields are empty', () => {
    render(<ReportProblem />, { wrapper: BrowserRouter });
    
    expect(screen.getByText(/Report Problem/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Report/i })).toBeDisabled();
  });

  it('allows selecting a category and entering description', async () => {
    render(<ReportProblem />, { wrapper: BrowserRouter });

    fireEvent.click(screen.getByText(/Traffic and Transport/i));
    fireEvent.change(screen.getByPlaceholderText(/Describe the problem here/i), {
      target: { value: 'Broken traffic light' },
    });

    expect(screen.getByDisplayValue('Broken traffic light')).toBeInTheDocument();
    expect(screen.getByText(/Traffic and Transport/i)).toHaveClass('bg-green-50');
  });

  it('handles image upload preview', async () => {
    render(<ReportProblem />, { wrapper: BrowserRouter });

    const file = new File(['dummy content'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Add Photo/i).parentElement?.querySelector('input');
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText(/Preview/i)).toBeInTheDocument();
    });
  });
});
