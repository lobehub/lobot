'use client';

import { memo } from 'react';

import { useUserMemoryStore } from '@/store/userMemory';

interface DeferredStoreInitializationProps {
  isLogin: boolean;
}

const DeferredStoreInitialization = memo<DeferredStoreInitializationProps>(({ isLogin }) => {
  const useFetchPersona = useUserMemoryStore((s) => s.useFetchPersona);

  useFetchPersona(isLogin);

  return null;
});

export default DeferredStoreInitialization;
