import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { imageAtWidth } from '../lib/format';
import { clearLocalData } from '../lib/storage';
import { SearchPage } from '../pages/SearchPage';

describe('imageAtWidth', () => {
  const commons = 'https://commons.wikimedia.org/wiki/Special:FilePath/HCA.jpg?width=640';

  it('asks Commons for a retina-sized thumbnail', () => {
    expect(imageAtWidth(commons, 44)).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/HCA.jpg?width=120',
    );
  });

  it('leaves other hosts untouched', () => {
    expect(imageAtWidth('https://example.org/a.jpg', 44)).toBe('https://example.org/a.jpg');
  });
});

describe('SearchPage', () => {
  it('ignores an unknown ?kategori= instead of crashing', () => {
    render(
      <MemoryRouter initialEntries={['/search?kategori=nonsense']}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Søg' })).toBeInTheDocument();
    expect(screen.getByText('Gennemse')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks());

  function Boom({ message }: { message: string }): never {
    throw new Error(message);
  }

  it('shows a calm error panel for ordinary errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom message="kaboom" />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Noget gik galt');
  });

  it('reloads once when a code chunk from an old deploy is gone', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      pathname: '/map',
      reload,
    });
    window.sessionStorage.clear();
    const ui = (
      <ErrorBoundary>
        <Boom message="Failed to fetch dynamically imported module: /assets/MapPage-x.js" />
      </ErrorBoundary>
    );
    const { unmount } = render(ui);
    expect(reload).toHaveBeenCalledTimes(1);
    unmount();
    // A second failure on the same screen is a real error — no reload loop.
    render(ui);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('clearLocalData', () => {
  it('also forgets AI-guide conversations and the last scan', () => {
    window.sessionStorage.setItem('mindsten.ask.1', '[]');
    window.sessionStorage.setItem('mindsten.scan.last', '{}');
    window.sessionStorage.setItem('other.app', 'keep');
    clearLocalData();
    expect(window.sessionStorage.getItem('mindsten.ask.1')).toBeNull();
    expect(window.sessionStorage.getItem('mindsten.scan.last')).toBeNull();
    expect(window.sessionStorage.getItem('other.app')).toBe('keep');
  });
});
