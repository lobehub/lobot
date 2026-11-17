import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PickerSection } from './PickerSection';

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

describe('PickerSection', () => {
  it('starts open and folds its candidates away from the heading', () => {
    render(
      <PickerSection title={'Agents'}>
        <span>Coco</span>
      </PickerSection>,
    );
    const heading = screen.getByRole('button', { name: 'Agents' });
    expect(heading).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Coco')).toBeInTheDocument();

    fireEvent.click(heading);
    expect(heading).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Coco')).toBeNull();

    fireEvent.click(heading);
    expect(screen.getByText('Coco')).toBeInTheDocument();
  });
});
