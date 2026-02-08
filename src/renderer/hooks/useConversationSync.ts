import { useEffect, useRef, useCallback } from 'react';
import { AppState } from '../../shared/types';

export function useConversationSync(state: AppState): void {
  const conversationIdRef = useRef<string | null>(state.activeConversationId);

  // Keep ref in sync with state
  useEffect(() => {
    conversationIdRef.current = state.activeConversationId;
  }, [state.activeConversationId]);

  const saveConversation = useCallback((messages: typeof state.chatMessages) => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;

    window.electronAPI.conversation.save({
      id: convId,
      title: conv.title,
      model: state.selectedModel ?? undefined,
      messages,
      createdAt: conv.createdAt,
      updatedAt: Date.now(),
    });
  }, [state.conversations, state.selectedModel]);

  // Save conversation when loading finishes (streaming done/error)
  const prevLoadingRef = useRef(state.chatLoading);
  useEffect(() => {
    if (prevLoadingRef.current && !state.chatLoading) {
      saveConversation(state.chatMessages);
    }
    prevLoadingRef.current = state.chatLoading;
  }, [state.chatLoading, state.chatMessages, saveConversation]);
}
