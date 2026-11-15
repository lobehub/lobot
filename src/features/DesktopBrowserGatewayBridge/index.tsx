'use client';

import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { memo, useCallback } from 'react';

import { electronBrowserControlService } from '@/services/electron/browserControl';

import { browserExecutor } from './browserExecutor';

/**
 * Desktop-only bridge for cloud-agent (gateway) browser tool calls.
 *
 * When an agent runs server-side, its browser tool calls are proxied back to
 * this device by the main process, which broadcasts `browserSidebarGatewayToolCall`.
 * Here the `browserExecutor` drives this device's in-app browser and reports the
 * result back to the main process, keyed by requestId.
 */
const DesktopBrowserGatewayBridge = memo(() => {
  const handleToolCall = useCallback(
    async ({
      agentId,
      apiName,
      args,
      requestId,
      topicId,
    }: {
      agentId: string;
      apiName: string;
      args: Record<string, unknown>;
      requestId: string;
      topicId: string;
    }) => {
      try {
        // The executor keys the browser session off `topicId`, so it has to be
        // rebuilt into the context here — the run's own topic, not the topic the
        // user happens to be looking at.
        const result = await browserExecutor.invoke(apiName, args, {
          agentId,
          messageId: `gateway-${requestId}`,
          topicId,
        });
        await electronBrowserControlService.reportGatewayToolResult({
          requestId,
          result: {
            content: result.content,
            error: result.error,
            state: result.state,
            success: result.success,
          },
        });
      } catch (error) {
        await electronBrowserControlService.reportGatewayToolResult({
          requestId,
          result: { content: (error as Error).message, success: false },
        });
      }
    },
    [],
  );

  useWatchBroadcast('browserSidebarGatewayToolCall', handleToolCall);

  return null;
});

DesktopBrowserGatewayBridge.displayName = 'DesktopBrowserGatewayBridge';

export default DesktopBrowserGatewayBridge;
