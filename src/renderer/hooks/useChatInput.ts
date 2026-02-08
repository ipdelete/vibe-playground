import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AppAction } from '../../shared/types';

function generateTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length <= 50) return firstLine;
  return firstLine.substring(0, 50) + '…';
}

interface UseChatInputResult {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  handleSend: () => void;
  handleStop: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useChatInput(state: AppState, dispatch: React.Dispatch<AppAction>): UseChatInputResult {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Refocus input when response completes
  useEffect(() => {
    if (!state.chatLoading) {
      inputRef.current?.focus();
    }
  }, [state.chatLoading]);

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content || state.chatLoading) return;

    let convId = state.activeConversationId;

    // Create a new conversation if none is active
    if (!convId) {
      convId = `conv-${Date.now()}`;
      const now = Date.now();
      const title = generateTitle(content);
      dispatch({
        type: 'ADD_CONVERSATION',
        payload: {
          conversation: { id: convId, title, createdAt: now, updatedAt: now },
        },
      });
    }

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { message: userMessage } });
    setInputValue('');

    // Create placeholder assistant message for streaming
    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { message: assistantMessage } });
    dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: true } });

    // Remember last-used model
    if (state.selectedModel) {
      localStorage.setItem('lastUsedModel', state.selectedModel);
    }

    // Send to main process via IPC
    window.electronAPI.copilot.send(convId, content, assistantMessage.id, state.selectedModel ?? undefined);
  }, [inputValue, state.chatLoading, state.activeConversationId, state.selectedModel, dispatch]);

  const handleStop = useCallback(() => {
    if (!state.chatLoading) return;
    const convId = state.activeConversationId;
    if (!convId) return;
    const lastAssistant = [...state.chatMessages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      window.electronAPI.copilot.stop(convId, lastAssistant.id);
    }
  }, [state.chatLoading, state.activeConversationId, state.chatMessages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return { inputValue, setInputValue, inputRef, handleSend, handleStop, handleKeyDown };
}
