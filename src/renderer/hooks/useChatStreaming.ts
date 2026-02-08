import { useEffect } from 'react';
import { AppAction } from '../../shared/types';

export function useChatStreaming(dispatch: React.Dispatch<AppAction>): void {
  useEffect(() => {
    const cleanupChunk = window.electronAPI.copilot.onChunk((messageId: string, content: string) => {
      dispatch({ type: 'APPEND_CHAT_CHUNK', payload: { messageId, content } });
    });

    const cleanupDone = window.electronAPI.copilot.onDone(() => {
      dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: false } });
    });

    const cleanupError = window.electronAPI.copilot.onError((messageId: string, error: string) => {
      dispatch({ type: 'APPEND_CHAT_CHUNK', payload: { messageId, content: `Error: ${error}` } });
      dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: false } });
    });

    return () => {
      cleanupChunk();
      cleanupDone();
      cleanupError();
    };
  }, [dispatch]);
}
