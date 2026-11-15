'use client';

import React, { Fragment, memo, useMemo } from 'react';

import { useChatStore } from '@/store/chat';
import { chatPortalSelectors } from '@/store/chat/selectors';
import { PortalViewType } from '@/store/chat/slices/portal/initialState';

import { AgentDetail } from './AgentDetail';
import { Artifacts } from './Artifacts';
import { Browser } from './Browser';
import Header from './components/Header';
import { PortalMoreMenuProvider } from './components/PortalMoreMenu/context';
import { Document } from './Document';
import { FilePreview } from './FilePreview';
import { HomeBody, HomeTitle } from './Home';
import { LocalFile } from './LocalFile';
import { MessageDetail } from './MessageDetail';
import { Thread } from './Thread';
import { Topic } from './Topic';
import { TopicComments, TopicCommentThread } from './TopicComments';
import { type PortalImpl } from './type';

// View type to component mapping
const VIEW_COMPONENTS: Partial<Record<PortalViewType, PortalImpl>> = {
  [PortalViewType.AgentDetail]: AgentDetail,
  [PortalViewType.Home]: {
    Body: HomeBody,
    Title: HomeTitle,
  },
  [PortalViewType.Artifact]: Artifacts,
  [PortalViewType.Browser]: Browser,
  [PortalViewType.Document]: Document,
  [PortalViewType.FilePreview]: FilePreview,
  [PortalViewType.LocalFile]: LocalFile,
  [PortalViewType.MessageDetail]: MessageDetail,
  [PortalViewType.Thread]: Thread,
  [PortalViewType.Topic]: Topic,
  [PortalViewType.TopicCommentThread]: TopicCommentThread,
  [PortalViewType.TopicComments]: TopicComments,
};

// Default Home component
const HomeImpl: PortalImpl = {
  Body: HomeBody,
  Title: HomeTitle,
};

interface PortalContentProps {
  onClose?: () => void;
  renderBody?: (body: React.ReactNode) => React.ReactNode;
  viewType?: PortalViewType | null;
}

/**
 * Portal content with Wrapper support
 * Uses the view stack to determine which component to render
 */
export const PortalContent = memo<PortalContentProps>(
  ({ onClose, renderBody, viewType: viewTypeOverride }) => {
    const currentViewType = useChatStore(chatPortalSelectors.currentViewType);
    const viewType = viewTypeOverride ?? currentViewType;
    const ViewImpl = viewType ? VIEW_COMPONENTS[viewType] : HomeImpl;

    const Wrapper = ViewImpl?.Wrapper || Fragment;
    const CustomHeader = ViewImpl?.Header;
    const Body = ViewImpl?.Body || HomeBody;
    const Title = ViewImpl?.Title || HomeTitle;

    const headerContent = CustomHeader ? (
      <CustomHeader onClose={onClose} />
    ) : (
      <Header title={<Title />} onClose={onClose} />
    );
    const bodyContent = <Body />;
    const moreMenuSource = useMemo(
      () =>
        ViewImpl?.useMoreMenu
          ? { key: viewType ?? 'home', useMoreMenu: ViewImpl.useMoreMenu }
          : null,
      [ViewImpl, viewType],
    );

    return (
      <Wrapper>
        <PortalMoreMenuProvider value={moreMenuSource}>{headerContent}</PortalMoreMenuProvider>
        {renderBody ? renderBody(bodyContent) : bodyContent}
      </Wrapper>
    );
  },
);
