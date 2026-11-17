import { Flexbox, Icon, Text } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { pickerStyles as styles } from './pickerStyles';

/** A candidate group whose heading folds it away, so people and Agents are each one click off. */
export const PickerSection = ({ children, title }: { children: ReactNode; title: string }) => {
  const [open, setOpen] = useState(true);

  return (
    <Flexbox gap={2}>
      <button
        aria-expanded={open}
        type={'button'}
        {...stylex.props(styles.section, styles.sectionToggle)}
        onClick={() => setOpen(!open)}
      >
        <Icon
          icon={ChevronRight}
          size={14}
          {...stylex.props(styles.chevron, open && styles.open)}
        />
        <Text fontSize={12} type="secondary" weight={500}>
          {title}
        </Text>
      </button>
      {open && children}
    </Flexbox>
  );
};
