import { act, render, screen } from '@testing-library/react';
import { startTransition, Suspense, use } from 'react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useLatestLocation } from './useLatestLocation';

const Paths = () => {
  const latest = useLatestLocation();
  const committed = useLocation();
  return (
    <>
      <span data-testid="latest">{latest.pathname}</span>
      <span data-testid="committed">{committed.pathname}</span>
    </>
  );
};

describe('useLatestLocation', () => {
  it('follows a navigation before its transition commits', async () => {
    // The next page suspends until released, holding the transition open like a slow render.
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const Slow = () => {
      use(pending);
      return null;
    };
    const router = createMemoryRouter(
      [
        {
          children: [
            { element: null, path: 'a' },
            { element: <Slow />, path: 'b' },
          ],
          element: (
            <>
              <Paths />
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </>
          ),
          path: '/',
        },
      ],
      { initialEntries: ['/a'] },
    );
    render(<RouterProvider router={router} />);

    await act(async () => {
      startTransition(() => void router.navigate('/b'));
    });
    expect(screen.getByTestId('latest').textContent).toBe('/b');
    expect(screen.getByTestId('committed').textContent).toBe('/a');

    await act(async () => release());
    expect(screen.getByTestId('committed').textContent).toBe('/b');
  });

  it('falls back to the committed location outside a data router', async () => {
    const { MemoryRouter } = await import('react-router');
    render(
      <MemoryRouter initialEntries={['/x']}>
        <Paths />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('latest').textContent).toBe('/x');
  });
});
