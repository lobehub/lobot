/**
 * @vitest-environment happy-dom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddContactContent from './Content';

const search = vi.hoisted(() => vi.fn(async () => []));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/contact', () => ({ contactService: { search } }));

beforeEach(() => {
  search.mockClear();
});

describe('AddContactContent', () => {
  // Opened from the Messages search, the query had to be typed again before anything was found.
  it('looks up the query it was opened with', async () => {
    render(createElement(AddContactContent, { initialQuery: ' canisminor ' }));

    expect(screen.getByPlaceholderText('contacts.add.search.placeholder')).toHaveValue(
      ' canisminor ',
    );
    await waitFor(() => expect(search).toHaveBeenCalledWith('canisminor'));
    expect(await screen.findByText('contacts.add.search.empty')).toBeInTheDocument();
  });

  it('waits for a query when opened empty', () => {
    render(createElement(AddContactContent));

    expect(search).not.toHaveBeenCalled();
    expect(screen.getByText('contacts.add.search.hint')).toBeInTheDocument();
  });
});
