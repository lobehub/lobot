import { formatUsageValue } from '@lobechat/utils';
import { Center, cssVar, Divider, Flexbox, Icon, Popover } from '@lobehub/ui';
import { type ModelPerformance, type ModelUsage } from '@lobot/types';
import { CoinsIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import InfoTooltip from '@/components/InfoTooltip';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { formatNumber, formatShortenNumber } from '@/utils/format';

import AnimatedNumber from './AnimatedNumber';
import type { TokenProgressItem } from './TokenProgress';
import TokenProgress from './TokenProgress';
import { getDetailsToken } from './tokens';

/** Right-hand values stack in one column, so digits keep the same width. */
const VALUE_STYLE = { fontVariantNumeric: 'tabular-nums', fontWeight: 500 } as const;

interface TokenDetailProps {
  performance?: ModelPerformance;
  usage: ModelUsage;
}

const TokenDetail = memo<TokenDetailProps>(({ usage, performance }) => {
  const { t } = useTranslation('chat');

  // Use systemStatus to manage short-format display state
  const isShortFormat = useGlobalStore(systemStatusSelectors.tokenDisplayFormatShort);
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  const detailTokens = getDetailsToken(usage);
  const inputDetails = [
    !!detailTokens.inputAudio && {
      color: cssVar.cyan9,
      id: 'reasoning',
      title: t('messages.tokenDetails.inputAudio'),
      value: detailTokens.inputAudio.token,
    },
    !!detailTokens.inputCitation && {
      color: cssVar.orange,
      id: 'inputText',
      title: t('messages.tokenDetails.inputCitation'),
      value: detailTokens.inputCitation.token,
    },
    !!detailTokens.inputText && {
      color: cssVar.green,
      id: 'inputText',
      title: t('messages.tokenDetails.inputText'),
      value: detailTokens.inputText.token,
    },
  ].filter(Boolean) as TokenProgressItem[];

  const outputDetails = [
    !!detailTokens.outputReasoning && {
      color: cssVar.pink,
      id: 'reasoning',
      title: t('messages.tokenDetails.reasoning'),
      value: detailTokens.outputReasoning.token,
    },
    !!detailTokens.outputImage && {
      color: cssVar.purple,
      id: 'outputImage',
      title: t('messages.tokenDetails.outputImage'),
      value: detailTokens.outputImage.token,
    },
    !!detailTokens.outputAudio && {
      color: cssVar.cyan9,
      id: 'outputAudio',
      title: t('messages.tokenDetails.outputAudio'),
      value: detailTokens.outputAudio.token,
    },
    !!detailTokens.outputText && {
      color: cssVar.green,
      id: 'outputText',
      title: t('messages.tokenDetails.outputText'),
      value: detailTokens.outputText.token,
    },
  ].filter(Boolean) as TokenProgressItem[];

  const totalDetail = [
    !!detailTokens.inputCacheMiss && {
      color: cssVar.colorFill,

      id: 'uncachedInput',
      title: t('messages.tokenDetails.inputUncached'),
      value: detailTokens.inputCacheMiss.token,
    },
    !!detailTokens.inputCached && {
      color: cssVar.orange,
      id: 'inputCached',
      title: t('messages.tokenDetails.inputCached'),
      value: detailTokens.inputCached.token,
    },
    !!detailTokens.inputCachedWrite && {
      color: cssVar.yellow,
      id: 'cachedWriteInput',
      title: t('messages.tokenDetails.inputWriteCached'),
      value: detailTokens.inputCachedWrite.token,
    },
    !!detailTokens.inputTool && {
      color: cssVar.geekblue,
      id: 'inputTool',
      title: t('messages.tokenDetails.inputTool'),
      value: detailTokens.inputTool.token,
    },
    !!detailTokens.totalOutput && {
      color: cssVar.colorSuccess,
      id: 'output',
      title: t('messages.tokenDetails.output'),
      value: detailTokens.totalOutput.token,
    },
  ].filter(Boolean) as TokenProgressItem[];

  const totalCount = detailTokens.totalTokens!.token;

  const formatValue = formatUsageValue;
  const detailTotal = formatValue(totalCount);
  const cacheRate =
    typeof detailTokens.inputCacheRate === 'number'
      ? `${formatNumber(detailTokens.inputCacheRate * 100, 1)}%`
      : undefined;

  const tps = performance?.tps ? formatNumber(performance.tps, 2) : undefined;
  const ttft = performance?.ttft ? formatNumber(performance.ttft / 1000, 2) : undefined;

  return (
    <Popover
      placement={'top'}
      trigger="hover"
      content={
        <Flexbox gap={8} style={{ minWidth: 200 }}>
          <Flexbox gap={20}>
            {inputDetails.length > 1 && (
              <Flexbox gap={4}>
                <Flexbox
                  horizontal
                  align={'center'}
                  gap={4}
                  justify={'space-between'}
                  width={'100%'}
                >
                  <div style={{ color: cssVar.colorTextDescription, fontSize: 12 }}>
                    {t('messages.tokenDetails.inputTitle')}
                  </div>
                </Flexbox>
                <TokenProgress showIcon data={inputDetails} formatValue={formatValue} />
              </Flexbox>
            )}
            {outputDetails.length > 1 && (
              <Flexbox gap={4}>
                <Flexbox
                  horizontal
                  align={'center'}
                  gap={4}
                  justify={'space-between'}
                  width={'100%'}
                >
                  <div style={{ color: cssVar.colorTextDescription, fontSize: 12 }}>
                    {t('messages.tokenDetails.outputTitle')}
                  </div>
                </Flexbox>
                <TokenProgress showIcon data={outputDetails} formatValue={formatValue} />
              </Flexbox>
            )}
            <Flexbox>
              <TokenProgress showIcon data={totalDetail} formatValue={formatValue} />
              <Divider style={{ marginBlock: 8 }} />
              {cacheRate && (
                <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                  <div style={{ color: cssVar.colorTextSecondary }}>
                    {t('messages.tokenDetails.cacheRate')}
                  </div>
                  <div style={VALUE_STYLE}>{cacheRate}</div>
                </Flexbox>
              )}
              <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                <div style={{ color: cssVar.colorTextSecondary }}>
                  {t('messages.tokenDetails.total')}
                </div>
                <div style={VALUE_STYLE}>{detailTotal}</div>
              </Flexbox>
              {tps && (
                <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                  <Flexbox horizontal gap={8}>
                    <div style={{ color: cssVar.colorTextSecondary }}>
                      {t('messages.tokenDetails.speed.tps.title')}
                    </div>
                    <InfoTooltip title={t('messages.tokenDetails.speed.tps.tooltip')} />
                  </Flexbox>
                  <div style={VALUE_STYLE}>{tps}</div>
                </Flexbox>
              )}
              {ttft && (
                <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                  <Flexbox horizontal gap={8}>
                    <div style={{ color: cssVar.colorTextSecondary }}>
                      {t('messages.tokenDetails.speed.ttft.title')}
                    </div>
                    <InfoTooltip title={t('messages.tokenDetails.speed.ttft.tooltip')} />
                  </Flexbox>
                  <div style={VALUE_STYLE}>{ttft}s</div>
                </Flexbox>
              )}
            </Flexbox>
          </Flexbox>
        </Flexbox>
      }
    >
      <Center
        horizontal
        gap={2}
        style={{ cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
        onClick={(e) => {
          // Prevent Popover from closing and toggle the format
          e.preventDefault();
          e.stopPropagation();
          updateSystemStatus({ tokenDisplayFormatShort: !isShortFormat });
        }}
      >
        <Icon icon={CoinsIcon} />
        <AnimatedNumber
          duration={1500}
          value={totalCount}
          formatter={(value) => {
            const roundedValue = Math.round(value);
            if (isShortFormat) {
              return (formatShortenNumber(roundedValue) as string).toLowerCase?.();
            }
            return new Intl.NumberFormat('en-US').format(roundedValue);
          }}
        />
      </Center>
    </Popover>
  );
});

export default TokenDetail;
