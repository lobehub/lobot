import { Flexbox } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import { isDesktop } from '@/const/version';
import SettingHeader from '@/features/Settings/features/SettingHeader';

import AppMenu from './features/AppMenu';
import Conversation from './features/Conversation';
import Desktop from './features/Desktop';
import Essential from './features/Essential';

interface PageProps {
  showSettingHeader?: boolean;
}

const Page = ({ showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('setting');
  return (
    <>
      {showSettingHeader && <SettingHeader title={t('tab.hotkey')} />}
      <Flexbox gap={20}>
        {isDesktop && <Desktop />}
        <Essential />
        <Conversation />
        {isDesktop && <AppMenu />}
      </Flexbox>
    </>
  );
};

export default Page;
