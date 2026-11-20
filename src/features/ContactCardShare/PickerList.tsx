import { Center, Flexbox, SearchBar, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';

/** Fixed so the window does not jump while the list filters down to nothing. */
const BODY_HEIGHT = 420;

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingBlock: 8,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: cssVar.borderRadius,
    font: 'inherit',
    color: cssVar.colorText,
    textAlign: 'start',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
      ':disabled': 'transparent',
    },
    cursor: {
      'default': 'pointer',
      ':disabled': 'default',
    },
    opacity: {
      'default': 1,
      ':disabled': 0.5,
    },
  },
  text: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minWidth: 0,
  },
});

/** One pickable entry: avatar, name and an optional line under it. */
export const PickerRow = ({
  avatar,
  description,
  disabled,
  name,
  onClick,
}: {
  avatar: ReactNode;
  description?: string;
  disabled?: boolean;
  name: string;
  onClick: () => void;
}) => (
  <button disabled={disabled} type={'button'} onClick={onClick} {...stylex.props(styles.row)}>
    {avatar}
    <span {...stylex.props(styles.text)}>
      <Text ellipsis>{name}</Text>
      {description && (
        <Text ellipsis fontSize={12} type={'secondary'}>
          {description}
        </Text>
      )}
    </span>
  </button>
);

/** A search box over a scrolling list, with a line in place of the list when it is empty. */
export const PickerFrame = ({
  children,
  empty,
  onQueryChange,
  placeholder,
  query,
}: {
  children: ReactNode;
  /** Shown instead of the list when nothing is left to pick. */
  empty?: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  query: string;
}) => (
  <Flexbox gap={8} height={BODY_HEIGHT} paddingBlock={'4px 16px'}>
    <SearchBar
      allowClear
      autoFocus
      placeholder={placeholder}
      value={query}
      onInputChange={onQueryChange}
    />
    {empty ? (
      <Center flex={1} paddingInline={16}>
        <Text fontSize={12} style={{ textAlign: 'center' }} type={'secondary'}>
          {empty}
        </Text>
      </Center>
    ) : (
      <Flexbox flex={1} style={{ minHeight: 0, overflowY: 'auto' }}>
        {children}
      </Flexbox>
    )}
  </Flexbox>
);
