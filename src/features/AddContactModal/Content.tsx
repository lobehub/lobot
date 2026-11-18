'use client';

import { Button, Center, Flexbox, SearchBar, Text, toast } from '@lobehub/ui';
import type { ContactSearchResult } from '@lobot/types';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { contactService } from '@/services/contact';

import { searchResultKey } from './result';
import ResultCard from './ResultCard';

/** Fixed so the window doesn't jump between the hint, the empty state and results. */
const BODY_HEIGHT = 480;

const AddContactContent = memo<{ initialQuery?: string }>(({ initialQuery }) => {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState(initialQuery ?? '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ContactSearchResult[] | undefined>();

  const search = async (value = query.trim()) => {
    if (!value || searching) return;
    setSearching(true);
    try {
      setResults(await contactService.search(value));
    } catch (error) {
      console.error('[contacts] Search failed', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setSearching(false);
    }
  };

  // Opened with a query already typed elsewhere: look it up without a second click.
  useEffect(() => {
    const value = initialQuery?.trim();
    if (value) void search(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = query.trim();

  return (
    <Flexbox gap={16} height={BODY_HEIGHT} paddingBlock={'4px 16px'}>
      <Flexbox horizontal gap={8}>
        <SearchBar
          allowClear
          autoFocus
          placeholder={t('contacts.add.search.placeholder')}
          style={{ flex: 1 }}
          value={query}
          onSearch={() => void search()}
          onInputChange={(value) => {
            setQuery(value);
            setResults(undefined);
          }}
        />
        <Button
          disabled={!trimmed}
          loading={searching}
          type={'primary'}
          onClick={() => void search()}
        >
          {t('contacts.add.search.action')}
        </Button>
      </Flexbox>
      {results === undefined || results.length === 0 ? (
        <Center flex={1} paddingInline={16}>
          <Text fontSize={12} style={{ textAlign: 'center' }} type={'secondary'}>
            {results === undefined ? t('contacts.add.search.hint') : t('contacts.add.search.empty')}
          </Text>
        </Center>
      ) : (
        <Flexbox flex={1} gap={12} style={{ minHeight: 0, overflowY: 'auto' }}>
          {results.map((result) => (
            <ResultCard key={searchResultKey(result)} result={result} />
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
});

AddContactContent.displayName = 'AddContactContent';

export default AddContactContent;
