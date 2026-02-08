import { renderHook } from '@testing-library/react';
import { useConversationSync } from './useConversationSync';
import { AppState } from '../../shared/types';
import { initialState } from '../contexts/AppStateContext';

describe('useConversationSync', () => {
  let mockSave: jest.Mock;

  beforeEach(() => {
    mockSave = jest.fn();
    (window as any).electronAPI = {
      conversation: { save: mockSave },
    };
  });

  const baseState: AppState = {
    ...initialState,
    activeConversationId: 'conv-1',
    conversations: [{ id: 'conv-1', title: 'Test', createdAt: 500, updatedAt: 500 }],
    selectedModel: 'gpt-4',
    chatMessages: [
      { id: 'msg-1', role: 'user', content: 'hi', timestamp: 1000 },
      { id: 'msg-2', role: 'assistant', content: 'hello', timestamp: 1001 },
    ],
  };

  it('should save conversation when loading transitions from true to false', () => {
    const loadingState = { ...baseState, chatLoading: true };

    const { rerender } = renderHook(
      ({ state }) => useConversationSync(state),
      { initialProps: { state: loadingState } }
    );

    expect(mockSave).not.toHaveBeenCalled();

    const doneState = { ...baseState, chatLoading: false };
    rerender({ state: doneState });

    expect(mockSave).toHaveBeenCalledWith({
      id: 'conv-1',
      title: 'Test',
      model: 'gpt-4',
      messages: doneState.chatMessages,
      createdAt: 500,
      updatedAt: expect.any(Number),
    });
  });

  it('should not save when loading stays false', () => {
    const { rerender } = renderHook(
      ({ state }) => useConversationSync(state),
      { initialProps: { state: baseState } }
    );

    rerender({ state: { ...baseState } });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should not save when no active conversation', () => {
    const loadingState: AppState = { ...baseState, chatLoading: true, activeConversationId: null };
    const { rerender } = renderHook(
      ({ state }) => useConversationSync(state),
      { initialProps: { state: loadingState } }
    );

    const doneState = { ...loadingState, chatLoading: false };
    rerender({ state: doneState });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should not save when conversation not found', () => {
    const loadingState: AppState = { ...baseState, chatLoading: true, conversations: [] };
    const { rerender } = renderHook(
      ({ state }) => useConversationSync(state),
      { initialProps: { state: loadingState } }
    );

    const doneState = { ...loadingState, chatLoading: false };
    rerender({ state: doneState });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should track activeConversationId changes', () => {
    const loadingState = { ...baseState, chatLoading: true };
    const { rerender } = renderHook(
      ({ state }) => useConversationSync(state),
      { initialProps: { state: loadingState } }
    );

    // Switch conversation while loading
    const switchedState = {
      ...loadingState,
      activeConversationId: 'conv-2',
      conversations: [
        ...loadingState.conversations,
        { id: 'conv-2', title: 'Other', createdAt: 600, updatedAt: 600 },
      ],
    };
    rerender({ state: switchedState });

    // Complete loading — should save conv-2, not conv-1
    const doneState = { ...switchedState, chatLoading: false };
    rerender({ state: doneState });

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'conv-2', title: 'Other' })
    );
  });
});
