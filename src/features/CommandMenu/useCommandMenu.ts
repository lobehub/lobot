import { useDebounce } from 'ahooks';
import { useTheme as useNextThemesTheme } from 'next-themes';
import { useCallback, useEffect, useMemo } from 'react';

import { useOpenCreateAgentModal } from '@/features/AgentIdentityModal/useOpenCreateAgentModal';
import { createTaskModal } from '@/features/AgentTasks/CreateTaskModal';
import { taskDetailPath } from '@/features/AgentTasks/shared/taskDetailPath';
import { useCreateMenuItems } from '@/features/HomeSidebar/hooks';
import { useCreateNewModal } from '@/features/LibraryModal';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { usePermission } from '@/hooks/usePermission';
import { useGroupWizard } from '@/layout/GlobalProvider/GroupWizardProvider';
import { useAgentStore } from '@/store/agent';
import { builtinAgentSelectors } from '@/store/agent/selectors/builtinAgentSelectors';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { useGlobalStore } from '@/store/global';
import { globalGeneralSelectors } from '@/store/global/selectors';
import type { FtsSearchResult } from '@/types/serverData';
import { openTrustedExternalUrl } from '@/utils/openTrustedExternalUrl';

import { useCommandMenuContext } from './CommandMenuContext';
import {
  commandMenuSearchSelectors,
  useCommandMenuSearchStore,
  useFetchCommandMenuSearch,
} from './store';
import { type ThemeMode } from './types';

/**
 * Shared methods for CommandMenu
 */
export const useCommandMenu = () => {
  const [open] = useGlobalStore((s) => [s.status.showCommandMenu]);
  const {
    mounted,
    onClose,
    search,
    setSearch,
    pages,
    setPages,
    typeFilter,
    setTypeFilter,
    page,
    pathname,
    selectedAgent,
    setSelectedAgent,
    activeAgentId: agentId,
  } = useCommandMenuContext();

  const navigate = useWorkspaceAwareNavigate();
  const { allowed: canCreate } = usePermission('create_content');
  const { setTheme } = useNextThemesTheme();
  const openCreateAgentModal = useOpenCreateAgentModal();
  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const { openGroupWizard } = useGroupWizard();
  const { createGroupWithMembers, createGroupFromTemplate, createPage } = useCreateMenuItems();
  const { open: openCreateLibraryModal } = useCreateNewModal();

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, { wait: 600 });

  // Search functionality
  const hasSearch = debouncedSearch.trim().length > 0;
  const searchQuery = debouncedSearch.trim();

  const locale = useGlobalStore(globalGeneralSelectors.currentLanguage);
  const searchParams = useMemo(
    () => (hasSearch ? { agentId, locale, query: searchQuery, type: typeFilter } : null),
    [agentId, hasSearch, locale, searchQuery, typeFilter],
  );
  const { error: searchError, isValidating: isSearchValidating } =
    useFetchCommandMenuSearch(searchParams);
  const searchResults = useCommandMenuSearchStore(commandMenuSearchSelectors.results(searchParams));
  const isSearching = hasSearch && searchResults === undefined && !searchError;

  // Close on Escape key and prevent body scroll
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  const closeCommandMenu = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const handleExternalLink = useCallback(
    (url: string) => {
      openTrustedExternalUrl(url);
      onClose();
    },
    [onClose],
  );

  const handleThemeChange = useCallback(
    (theme: ThemeMode) => {
      setTheme(theme);
      onClose();
    },
    [setTheme, onClose],
  );

  const handleAskLobeAI = useCallback(() => {
    // Navigate to inbox agent with the message query parameter
    if (inboxAgentId && search.trim()) {
      const message = encodeURIComponent(search.trim());
      navigate(`/agent/${inboxAgentId}?message=${message}`);
      onClose();
    }
  }, [inboxAgentId, search, navigate, onClose]);

  const handleAIPainting = useCallback(() => {
    // Navigate to painting page with search as prompt
    if (search.trim()) {
      const prompt = encodeURIComponent(search.trim());
      navigate(`/image?prompt=${prompt}`);
      onClose();
    }
  }, [search, navigate, onClose]);

  const handleBack = useCallback(() => {
    setPages((prev) => prev.slice(0, -1));
  }, [setPages]);

  const handleSendToSelectedAgent = useCallback(() => {
    if (selectedAgent && search.trim()) {
      const message = encodeURIComponent(search.trim());
      navigate(`/agent/${selectedAgent.id}?message=${message}`);
      setSelectedAgent(undefined);
      onClose();
    }
  }, [selectedAgent, search, navigate, setSelectedAgent, onClose]);

  // Hands off to the create-agent form; the menu closes so the form isn't stacked under it.
  const handleCreateSession = useCallback(() => {
    if (!canCreate) return;

    onClose();
    openCreateAgentModal();
  }, [canCreate, onClose, openCreateAgentModal]);

  const openNewTopicOrSaveTopic = useChatStore((s) => s.openNewTopicOrSaveTopic);

  const handleCreateTopic = useCallback(() => {
    if (!canCreate) return;
    // The command item is disabled while a new-topic send is in flight, but a
    // selection can still race the window opening — don't close the palette on
    // what would be a silent no-op in openNewTopicOrSaveTopic.
    if (topicSelectors.isNewTopicSendInFlight(useChatStore.getState())) return;

    openNewTopicOrSaveTopic();
    onClose();
  }, [canCreate, openNewTopicOrSaveTopic, onClose]);

  const handleCreateLibrary = useCallback(() => {
    if (!canCreate) return;

    onClose();
    openCreateLibraryModal({
      onSuccess: (id) => {
        navigate(`/resource/library/${id}`);
      },
    });
  }, [canCreate, onClose, openCreateLibraryModal, navigate]);

  const handleCreatePage = useCallback(async () => {
    if (!canCreate) return;

    await createPage();
    onClose();
  }, [canCreate, createPage, onClose]);

  const handleCreateTask = useCallback(() => {
    if (!canCreate) return;

    onClose();
    createTaskModal({
      onCreated: (task) => {
        navigate(taskDetailPath(task.identifier, undefined, task.name));
      },
      // The inline composer only mounts in task views; from the command menu it would drop the draft.
      showInlineToggle: false,
    });
  }, [canCreate, onClose, navigate]);

  const handleCreateAgentTeam = useCallback(() => {
    if (!canCreate) return;

    onClose();
    openGroupWizard({
      onCreateCustom: async (selectedAgents) => {
        await createGroupWithMembers(selectedAgents);
      },
      onCreateFromTemplate: async (templateId, selectedMemberTitles) => {
        await createGroupFromTemplate(templateId, selectedMemberTitles);
      },
    });
  }, [canCreate, onClose, openGroupWizard, createGroupWithMembers, createGroupFromTemplate]);

  return {
    closeCommandMenu,
    handleAIPainting,
    handleAskLobeAI,
    handleBack,
    handleCreateAgentTeam,
    handleCreateLibrary,
    handleCreatePage,
    handleCreateSession,
    handleCreateTask,
    handleCreateTopic,
    handleExternalLink,
    handleNavigate,
    handleSendToSelectedAgent,
    handleThemeChange,
    hasSearch,
    hasSearchResponse: searchResults !== undefined,
    isSearching,
    isSearchValidating,
    mounted,
    open,
    page,
    pages,
    pathname,
    search,
    searchError,
    searchQuery,
    searchResults: searchResults || ([] as FtsSearchResult[]),
    selectedAgent,
    setSearch,
    setSelectedAgent,
    setTypeFilter,
    typeFilter,
  };
};
