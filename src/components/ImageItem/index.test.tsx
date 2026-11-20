/**
 * @vitest-environment happy-dom
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ImageItem from './index';

describe('ImageItem', () => {
  // A single Channel image arrives without its size. Its tile must still follow the
  // bitmap: holding the grid's 64px min-height under a wide screenshot leaves the gray
  // fill showing underneath the image.
  it('sizes a lone image of unknown ratio to the bitmap instead of the grid cell', () => {
    const { container } = render(<ImageItem url="https://example.com/wide.png" />);

    const tile = container.firstElementChild as HTMLElement;
    expect(tile.style.height).toBe('auto');
    expect(tile.style.minHeight).toBe('auto');
    expect(tile.style.alignSelf).toBe('start');
  });

  it('keeps multi-image tiles square', () => {
    const { container } = render(<ImageItem square url="https://example.com/a.png" />);

    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toMatch(/^1( \/ 1)?$/);
  });
});
