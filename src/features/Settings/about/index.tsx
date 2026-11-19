import { isDesktop } from '@lobechat/const';
import { Flexbox } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import SettingHeader from '@/features/Settings/features/SettingHeader';

import About from './features/About';
import Analytics from './features/Analytics';
import DebugLogs from './features/DebugLogs';
import UpdateChannel from './features/UpdateChannel';

interface PageProps {
  mobile?: boolean;
  showSettingHeader?: boolean;
}

const Page = ({ mobile, showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('setting');
  return (
    <>
      {showSettingHeader && <SettingHeader title={t('tab.about')} />}
      <Flexbox gap={20}>
        <About mobile={mobile} />
        {isDesktop && <UpdateChannel />}
        <Analytics />
        <DebugLogs />
      </Flexbox>
    </>
  );
};

export default Page;
