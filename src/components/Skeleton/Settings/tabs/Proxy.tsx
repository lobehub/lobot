'use client';

import { Flexbox } from '@lobehub/ui';

import SkeletonBar from '../../Bar';
import { SettingsFormSkeleton, SWITCH_CONTROL } from '../Section';
import { useSkeletonText } from '../useSkeletonText';
import type { SettingsTabSkeleton } from './types';

const INPUT = { height: 32, width: 240 };

/** Two radio choices, the shape of the proxy type row. */
const TypeControl = () => (
  <Flexbox horizontal align={'center'} gap={16}>
    <SkeletonBar height={16} radius={'50%'} width={16} />
    <SkeletonBar height={14} width={48} />
    <SkeletonBar height={16} radius={'50%'} width={16} />
    <SkeletonBar height={14} width={40} />
  </Flexbox>
);

/**
 * The proxy form: enable, type / server / port, auth (credentials stay hidden
 * until both the proxy and auth are on) and the connection test.
 */
const Body = () => {
  const text = useSkeletonText('electron');

  return (
    <SettingsFormSkeleton
      groups={[
        {
          items: [
            {
              control: SWITCH_CONTROL,
              label: text('proxy.enable', 72, 14),
              minWidth: undefined,
            },
          ],
          title: text('proxy.enable', 72, 18),
        },
        {
          items: [
            {
              control: <TypeControl />,
              label: text('proxy.type', 40, 14),
              minWidth: undefined,
            },
            {
              control: INPUT,
              divider: true,
              label: text('proxy.server', 56, 14),
              minWidth: undefined,
            },
            {
              control: { height: 32, width: 120 },
              divider: true,
              label: text('proxy.port', 40, 14),
              minWidth: undefined,
            },
          ],
          title: text('proxy.basicSettings', 80, 18),
        },
        {
          items: [
            {
              control: SWITCH_CONTROL,
              label: text('proxy.auth', 72, 14),
              minWidth: undefined,
            },
          ],
          title: text('proxy.authSettings', 80, 18),
        },
        {
          items: [
            {
              control: INPUT,
              label: text('proxy.testUrl', 72, 14),
              minWidth: undefined,
            },
          ],
          title: text('proxy.connectionTest', 80, 18),
        },
      ]}
    />
  );
};

const ProxySkeleton: SettingsTabSkeleton = { Body };

export default ProxySkeleton;
