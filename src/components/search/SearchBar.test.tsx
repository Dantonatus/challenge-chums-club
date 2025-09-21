import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SearchBar } from './SearchBar';

// Mock the hooks
const mockUpdateFilter = vi.fn();
vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => ({
    filters: { search: '' },
    updateFilter: mockUpdateFilter,
    updateFilters: vi.fn(),
    resetFilters: vi.fn(),
  }),
}));

const mockDebouncedCallback = vi.fn();
vi.mock('../../hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (callback: Function, delay: number) => {
    return mockDebouncedCallback;
  },
}));

const renderSearchBar = () => {
  return render(
    <BrowserRouter>
      <SearchBar />
    </BrowserRouter>
  );
};

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders search input with accessibility attributes', () => {
    const { container } = renderSearchBar();
    
    // Check for search role
    const searchContainer = container.querySelector('[role="search"]');
    expect(searchContainer).toBeTruthy();
    
    // Check for input with proper attributes
    const input = container.querySelector('input[type="search"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('aria-label')).toBe('Search products');
    expect(input?.getAttribute('placeholder')).toBe('Search products...');
  });

  it('creates debounced callback on mount', () => {
    renderSearchBar();
    
    // Verify that useDebouncedCallback was called
    expect(mockDebouncedCallback).toHaveBeenCalled();
  });

  it('has proper component structure', () => {
    const { container } = renderSearchBar();
    
    // Verify basic structure exists
    expect(container.querySelector('input')).toBeTruthy();
    expect(container.querySelector('[role="search"]')).toBeTruthy();
  });
});