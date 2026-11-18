import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PanelErrorBoundary from './PanelErrorBoundary';

const Boom = () => {
  throw new Error('kaput');
};

describe('PanelErrorBoundary', () => {
  it('renders its panel', () => {
    render(
      <PanelErrorBoundary>
        <span>panel body</span>
      </PanelErrorBoundary>,
    );
    expect(screen.getByText('panel body')).toBeInTheDocument();
  });

  it('shows the crash with a retry instead of taking the app down', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PanelErrorBoundary>
        <Boom />
      </PanelErrorBoundary>,
    );
    expect(screen.getByText(/Panel crashed: kaput/)).toBeInTheDocument();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Retry' }))).not.toThrow();
    spy.mockRestore();
  });
});
