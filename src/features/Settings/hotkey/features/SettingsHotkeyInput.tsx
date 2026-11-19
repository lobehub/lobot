'use client';

// oxlint-disable-next-line stylex-migration/no-emotion-styles -- HotkeyInput has no slots for the clear button or keycap typography
import { createStaticStyles, cx, HotkeyInput, type HotkeyInputProps } from '@lobehub/ui';
import { memo } from 'react';

const styles = createStaticStyles(({ css, cssVar }) => ({
  root: css`
    .lobe-hotkey-input__control {
      box-sizing: border-box;
      flex-shrink: 0;
      gap: 8px;
      /* Fits the longest default binding (Ctrl Shift ?) plus the clear button. */
      width: 192px;
    }

    .lobe-hotkey-input__value :is(.lobe-hotkey, .lobe-hotkey__kbd) {
      font-family: ${cssVar.fontFamilyCode};
    }

    /* Keep a 24px hit target; shrink the glyph and drop the filled keycap chrome. */
    .lobe-hotkey-input__clear {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      min-width: 24px;
      min-height: 24px;
    }

    .lobe-hotkey-input__clear:hover,
    .lobe-hotkey-input__clear:active,
    .lobe-hotkey-input__clear:focus,
    .lobe-hotkey-input__clear:focus-visible {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    .lobe-hotkey-input__clear svg {
      width: 12px;
      height: 12px;
    }
  `,
}));

const SettingsHotkeyInput = memo((props: HotkeyInputProps) => (
  <HotkeyInput {...props} className={cx(styles.root, props.className)} />
));

SettingsHotkeyInput.displayName = 'SettingsHotkeyInput';

export default SettingsHotkeyInput;
