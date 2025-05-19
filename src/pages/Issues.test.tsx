import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../store/issues', () => ({
  useIssueStore: jest.fn(),
}));
jest.mock('../lib/services/location', () => ({
  getCurrentLocation: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({
  supabase: { channel: () => ({ on: () => ({ subscribe: jest.fn(), unsubscribe: jest.fn() }) }) }
}));

import { useIssueStore } from '../store/issues';
import Issues from './Issues';

describe('Issues Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('renders loading spinner when loading and no issues', () => {
    (useIssueStore as jest.Mock).mockReturnValue({
      issues: [],
      loading: true,
      error: null,
      fetchIssues: jest.fn(),
    });

    render(<Issues />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  test('renders error message when error exists', () => {
    const errorMessage = 'Failed to load';
    (useIssueStore as jest.Mock).mockReturnValue({
      issues: [],
      loading: false,
      error: errorMessage,
      fetchIssues: jest.fn(),
    });

    render(<Issues />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
