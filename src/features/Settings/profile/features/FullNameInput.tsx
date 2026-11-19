'use client';

import { Input, Spin } from '@lobehub/ui';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { saveToast } from '@/store/utils/saveToast';

/** The profile name field: saved on blur or Enter. */
const FullNameInput = () => {
  const { t } = useTranslation('auth');
  const fullName = useUserStore(userProfileSelectors.fullName);
  const updateFullName = useUserStore((s) => s.updateFullName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const value = inputRef.current?.value?.trim();
    if (!value || value === fullName) return;

    try {
      setSaving(true);
      await updateFullName(value);
    } catch (error) {
      console.error('Failed to update fullName:', error);
      saveToast(error, { retry: () => void handleSave(), title: t('profile.saveError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Input
      aria-label={t('profile.fullName')}
      defaultValue={fullName || ''}
      disabled={saving}
      key={fullName}
      placeholder={t('profile.fullName')}
      ref={inputRef}
      // Always pass a suffix: antd remounts the input when one appears later.
      suffix={saving ? <Spin size="small" style={{ opacity: 0.5 }} /> : <span />}
      variant="filled"
      onBlur={handleSave}
      onPressEnter={handleSave}
    />
  );
};

export default FullNameInput;
