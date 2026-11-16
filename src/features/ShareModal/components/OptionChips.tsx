import { createStaticStyles, cx, Icon } from '@lobehub/ui';
import { CheckIcon, PlusIcon } from 'lucide-react';

const styles = createStaticStyles(({ css, cssVar }) => ({
  chip: css`
    cursor: pointer;

    display: inline-flex;
    flex: none;
    gap: 6px;
    align-items: center;

    height: 30px;
    padding-inline: 12px;
    border: 1px dashed ${cssVar.colorBorder};
    border-radius: 15px;

    font-size: 13px;
    color: ${cssVar.colorTextSecondary};

    background: transparent;

    transition:
      background 150ms ${cssVar.motionEaseOut},
      color 150ms ${cssVar.motionEaseOut},
      border-color 150ms ${cssVar.motionEaseOut};

    &:hover {
      border-color: ${cssVar.colorTextQuaternary};
      color: ${cssVar.colorText};
    }

    &:focus-visible {
      outline: 2px solid ${cssVar.colorPrimaryBorder};
      outline-offset: 1px;
    }
  `,
  chipActive: css`
    border: 1px solid ${cssVar.colorText};
    color: ${cssVar.colorBgContainer};
    background: ${cssVar.colorText};

    &:hover {
      border-color: ${cssVar.colorText};
      color: ${cssVar.colorBgContainer};
      opacity: 0.88;
    }
  `,
  select: css`
    cursor: pointer;

    display: inline-flex;
    flex: none;
    gap: 6px;
    align-items: center;

    height: 30px;
    padding-inline: 10px;
    border: 1px solid ${cssVar.colorBorder};
    border-radius: ${cssVar.borderRadius};

    font-size: 13px;
    color: ${cssVar.colorText};

    background: ${cssVar.colorBgContainer};

    &:hover {
      background: ${cssVar.colorFillQuaternary};
    }

    &:focus-visible {
      outline: 2px solid ${cssVar.colorPrimaryBorder};
      outline-offset: 1px;
    }
  `,
  selectLabel: css`
    color: ${cssVar.colorTextDescription};
  `,
}));

interface ToggleChipProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export const ToggleChip = ({ checked, label, onChange }: ToggleChipProps) => (
  <button
    aria-pressed={checked}
    className={cx(styles.chip, checked && styles.chipActive)}
    type={'button'}
    onClick={() => onChange(!checked)}
  >
    <Icon icon={checked ? CheckIcon : PlusIcon} size={14} />
    {label}
  </button>
);
